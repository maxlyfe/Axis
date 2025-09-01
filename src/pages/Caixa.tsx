import { useState, useEffect, FormEvent, useContext, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App";
import { ArrowUpCircle, ArrowDownCircle, PlusCircle, Trash2, CheckCircle, Circle, Edit, Repeat, Banknote, X, Scale, ArrowLeftRight, ChevronLeft, ChevronRight } from "lucide-react";

// --- INTERFACES ---
interface Transacao {
  id: string;
  data: string;
  descricao: string;
  valor: number;
  tipo: 'entrada' | 'saida' | 'transferencia';
  metodo_pagamento?: string;
}

interface Gasto {
    id: number;
    data: string;
    descricao: string;
    valor: number;
    pago: boolean;
    recorrente: boolean;
    metodo_pagamento?: string;
}

// --- COMPONENTE PRINCIPAL ---
const Caixa = () => {
  const session = useContext(SessionContext);
  
  // --- ESTADOS ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [allTimeTransactions, setAllTimeTransactions] = useState<Transacao[]>([]);
  const [gastosDoMes, setGastosDoMes] = useState<Gasto[]>([]);
  const [adiantamentosEmCaixa, setAdiantamentosEmCaixa] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Estados dos Modais
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);
  const [payingGasto, setPayingGasto] = useState<Gasto | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [novoGasto, setNovoGasto] = useState({ descricao: "", valor: "", data: new Date().toISOString().split('T')[0], recorrente: false });
  const [gastoPagamento, setGastoPagamento] = useState({ metodo: 'Dinheiro' });
  const [transferencia, setTransferencia] = useState({ valor: "", data: new Date().toISOString().split('T')[0] });

  // --- EFEITOS ---
  useEffect(() => {
    if (session) {
        fetchDadosFinanceiros();
    }
  }, [currentDate, session]);

  // --- LÓGICA DE DESPESAS RECORRENTES ---
  const handleRecurringExpenses = async (primeiroDia: Date, ultimoDia: Date) => {
    const mesAtual = primeiroDia.getMonth();
    const anoAtual = primeiroDia.getFullYear();

    const { data: recurringTemplates } = await supabase
        .from('gastos')
        .select('*')
        .eq('recorrente', true)
        .lt('data', primeiroDia.toISOString().split('T')[0]);

    if (!recurringTemplates || recurringTemplates.length === 0) return;

    const { data: currentMonthExpenses } = await supabase
        .from('gastos')
        .select('descricao, data')
        .gte('data', primeiroDia.toISOString().split('T')[0])
        .lte('data', ultimoDia.toISOString().split('T')[0]);
    
    const newRecurringExpenses = [];

    for (const template of recurringTemplates) {
        const alreadyExists = currentMonthExpenses?.some(e => 
            e.descricao === template.descricao && new Date(e.data).getMonth() === mesAtual
        );

        if (!alreadyExists) {
            newRecurringExpenses.push({
                user_id: session!.user.id,
                descricao: template.descricao,
                valor: template.valor,
                data: `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(new Date(template.data).getDate()).padStart(2, '0')}`,
                pago: false,
                recorrente: true,
            });
        }
    }

    if (newRecurringExpenses.length > 0) {
        await supabase.from('gastos').insert(newRecurringExpenses);
    }
  };
  
  // --- FUNÇÕES DE BUSCA DE DADOS ---
  const fetchDadosFinanceiros = async () => {
    if (!session) return;
    setLoading(true);

    const primeiroDiaMes = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const ultimoDiaMes = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    ultimoDiaMes.setHours(23, 59, 59, 999);
    
    try {
      await handleRecurringExpenses(primeiroDiaMes, ultimoDiaMes);

      // Busca TODAS as transações até o final do mês corrente
      const { data: agendamentosData } = await supabase.from('agendamentos').select('*').lte('created_at', ultimoDiaMes.toISOString());
      const { data: gastosData } = await supabase.from('gastos').select('*').lte('data', ultimoDiaMes.toISOString().split('T')[0]);
      const { data: transferenciasData } = await supabase.from('transferencias').select('*').lte('data', ultimoDiaMes.toISOString().split('T')[0]);

      let todasAsTransacoes: Transacao[] = [];
      
      (agendamentosData || []).forEach(ag => {
        if (ag.status === 'concluido' && ag.valor_final_pago) {
          todasAsTransacoes.push({ id: `ag-final-${ag.id}`, data: ag.data_fim, descricao: `Serviço: ${ag.cliente_nome}`, valor: ag.valor_final_pago, tipo: 'entrada', metodo_pagamento: ag.metodo_pagamento });
        }
        if (ag.adiantamento_confirmado && ag.valor_adiantamento > 0) {
          todasAsTransacoes.push({ id: `ag-adiant-${ag.id}`, data: ag.created_at, descricao: `Adiantamento: ${ag.cliente_nome}`, valor: ag.valor_adiantamento, tipo: 'entrada', metodo_pagamento: ag.adiantamento_metodo_pagamento });
        }
      });
      
      setGastosDoMes((gastosData || []).filter(g => new Date(g.data + 'T00:00:00') >= primeiroDiaMes && new Date(g.data + 'T00:00:00') <= ultimoDiaMes));

      (gastosData || []).filter(g => g.pago).forEach(g => {
        todasAsTransacoes.push({ id: `gasto-${g.id}`, data: g.data, descricao: g.descricao, valor: g.valor, tipo: 'saida', metodo_pagamento: g.metodo_pagamento });
      });

      (transferenciasData || []).forEach(t => {
        todasAsTransacoes.push({ id: `transf-${t.id}`, data: t.data, descricao: 'Transferência p/ Conta', valor: t.valor, tipo: 'transferencia' });
      });

      setAllTimeTransactions(todasAsTransacoes);
      
      const { data: adiantamentosPendentesData } = await supabase.from('agendamentos').select('valor_adiantamento').eq('adiantamento_confirmado', true).eq('status', 'agendado');
      setAdiantamentosEmCaixa(adiantamentosPendentesData?.reduce((acc, ag) => acc + ag.valor_adiantamento, 0) || 0);

    } catch (err: any) {
      setError("Não foi possível carregar os dados financeiros.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // --- CÁLCULOS PARA O PAINEL ---
  const { saldoConta, saldoDinheiro, caixaTotal, disponivelParaUso } = useMemo(() => {
    let saldoConta = 0, saldoDinheiro = 0;
    allTimeTransactions.forEach(t => {
      if (t.tipo === 'entrada') {
        if (t.metodo_pagamento === 'Dinheiro') saldoDinheiro += t.valor; else saldoConta += t.valor;
      } else if (t.tipo === 'saida') {
        if (t.metodo_pagamento === 'Dinheiro') saldoDinheiro -= t.valor; else saldoConta -= t.valor;
      } else if (t.tipo === 'transferencia') {
        saldoDinheiro -= t.valor;
        saldoConta += t.valor;
      }
    });
    const caixaTotal = saldoConta + saldoDinheiro;
    const disponivelParaUso = caixaTotal - adiantamentosEmCaixa;
    return { saldoConta, saldoDinheiro, caixaTotal, disponivelParaUso };
  }, [allTimeTransactions, adiantamentosEmCaixa]);
  
  const transacoesDoMes = useMemo(() => {
    const primeiroDia = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const ultimoDia = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    ultimoDia.setHours(23, 59, 59, 999);
    return allTimeTransactions
        .filter(t => {
            const dataTransacao = /^\d{4}-\d{2}-\d{2}$/.test(t.data)
              ? new Date(t.data + 'T00:00:00')
              : new Date(t.data);
            return dataTransacao >= primeiroDia && dataTransacao <= ultimoDia;
        })
        .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [allTimeTransactions, currentDate]);

  const { receitaMes, despesaMes, saldoMes } = useMemo(() => {
    const receitaMes = transacoesDoMes.filter(t => t.tipo === 'entrada').reduce((acc, t) => acc + t.valor, 0);
    const despesaMes = transacoesDoMes.filter(t => t.tipo === 'saida').reduce((acc, t) => acc + t.valor, 0);
    return { receitaMes, despesaMes, saldoMes: receitaMes - despesaMes };
  }, [transacoesDoMes]);

  // --- AÇÕES DO USUÁRIO ---
  const handleAddOrEditGasto = async (e: FormEvent) => {
    e.preventDefault();
    if (!novoGasto.descricao || !novoGasto.valor) return;
    
    const { id, ...gastoData } = novoGasto as any;
    const dataToSave = { ...gastoData, valor: parseFloat(novoGasto.valor), user_id: session?.user.id };
    
    try {
      if (editingGasto && editingGasto.id) {
        await supabase.from('gastos').update(dataToSave).eq('id', editingGasto.id);
      } else {
        await supabase.from('gastos').insert([dataToSave]);
      }
      setNovoGasto({ descricao: "", valor: "", data: new Date().toISOString().split('T')[0], recorrente: false });
      closeModal();
      fetchDadosFinanceiros();
    } catch (err) { setError("Falha ao salvar despesa."); }
  };

  const handlePayGasto = async (e: FormEvent) => {
    e.preventDefault();
    if (!payingGasto) return;
    try {
      await supabase.from('gastos').update({ pago: true, metodo_pagamento: gastoPagamento.metodo }).eq('id', payingGasto.id);
      closeModal();
      fetchDadosFinanceiros();
    } catch (err) { setError("Não foi possível marcar a despesa como paga."); }
  };

  const handleDeleteGasto = async (gastoId: number) => {
    if(!window.confirm("Tem certeza que deseja apagar este gasto?")) return;
    try {
      await supabase.from('gastos').delete().eq('id', gastoId);
      fetchDadosFinanceiros();
    } catch (err) { setError("Não foi possível apagar a despesa."); }
  };
  
  const handleTransfer = async (e: FormEvent) => {
    e.preventDefault();
    if (!transferencia.valor || parseFloat(transferencia.valor) <= 0) return;
    if (parseFloat(transferencia.valor) > saldoDinheiro) { alert("Valor da transferência maior que o saldo em dinheiro."); return; }
    
    try {
      await supabase.from('transferencias').insert([{
        valor: parseFloat(transferencia.valor),
        data: transferencia.data,
        user_id: session?.user.id,
      }]);
      setTransferencia({ valor: "", data: new Date().toISOString().split('T')[0] });
      closeModal();
      fetchDadosFinanceiros();
    } catch (err) { setError("Falha ao registrar transferência."); }
  };

  const changeMonth = (amount: number) => { setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + amount, 1)); };

  // --- FUNÇÕES DE MODAL ---
  const openEditGastoModal = (gasto: Gasto) => { setEditingGasto(gasto); setNovoGasto({ ...gasto, valor: String(gasto.valor) }); };
  const openPayGastoModal = (gasto: Gasto) => { setPayingGasto(gasto); };
  const closeModal = () => { setEditingGasto(null); setPayingGasto(null); setIsTransferModalOpen(false); };
  
  // --- RENDERIZAÇÃO ---
  if (loading) return <div className="text-center p-8">Carregando dados financeiros...</div>;

  return (
    <div className="space-y-8">
      {/* Filtro e Título */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Gestão de Caixa</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => changeMonth(-1)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeft/></button>
          <span className="font-semibold capitalize">{currentDate.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</span>
          <button onClick={() => changeMonth(1)} className="p-2 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRight/></button>
        </div>
      </div>

      {/* Painel de Saldos Contínuos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-violet-100 dark:bg-violet-900/50 p-6 rounded-lg shadow flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-medium text-violet-800 dark:text-violet-200">Caixa Total</h3>
              <p className="text-3xl font-bold text-violet-700 dark:text-violet-300">R$ {caixaTotal.toFixed(2)}</p>
            </div>
            <div className="mt-2">
              <h4 className="text-xs font-medium text-violet-700 dark:text-violet-300">Disponível para uso</h4>
              <p className="text-lg font-bold text-violet-600 dark:text-violet-400">R$ {disponivelParaUso.toFixed(2)}</p>
            </div>
        </div>
        <div className="bg-blue-100 dark:bg-blue-900/50 p-6 rounded-lg shadow"><h3 className="text-sm font-medium text-blue-800 dark:text-blue-200">Saldo em Conta</h3><p className="text-3xl font-bold text-blue-700 dark:text-blue-300">R$ {saldoConta.toFixed(2)}</p></div>
        <div className="bg-green-100 dark:bg-green-900/50 p-6 rounded-lg shadow"><h3 className="text-sm font-medium text-green-800 dark:text-green-200">Dinheiro em Caixa</h3><p className="text-3xl font-bold text-green-700 dark:text-green-300">R$ {saldoDinheiro.toFixed(2)}</p><button onClick={() => setIsTransferModalOpen(true)} className="text-xs flex items-center gap-1 mt-2 text-blue-600 hover:underline"><Banknote size={14}/>Transferir p/ Conta</button></div>
        <div className="bg-yellow-100 dark:bg-yellow-900/50 p-6 rounded-lg shadow"><h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Adiantamentos em Caixa</h3><p className="text-3xl font-bold text-yellow-700 dark:text-yellow-300">R$ {adiantamentosEmCaixa.toFixed(2)}</p><p className="text-xs text-yellow-600 dark:text-yellow-400">Valor a faturar.</p></div>
      </div>
      
      <hr className="dark:border-gray-700"/>

      {/* Resumo do Mês Selecionado */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-green-100 dark:bg-green-900/50 p-6 rounded-lg shadow"><h3 className="text-sm font-medium text-green-800 dark:text-green-200">Receita no Mês</h3><p className="text-2xl font-bold text-green-700 dark:text-green-300">R$ {receitaMes.toFixed(2)}</p></div>
        <div className="bg-red-100 dark:bg-red-900/50 p-6 rounded-lg shadow"><h3 className="text-sm font-medium text-red-800 dark:text-red-200">Despesas no Mês</h3><p className="text-2xl font-bold text-red-700 dark:text-red-300">R$ {despesaMes.toFixed(2)}</p></div>
        <div className="bg-indigo-100 dark:bg-indigo-900/50 p-6 rounded-lg shadow"><h3 className="text-sm font-medium text-indigo-800 dark:text-indigo-200">Saldo do Mês</h3><p className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">R$ {saldoMes.toFixed(2)}</p></div>
      </div>

      {/* Seção de Despesas e Extrato */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Gestão de Despesas</h2>
          <button onClick={() => setEditingGasto({} as Gasto)} className="w-full flex justify-center items-center bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 mb-6"><PlusCircle size={18} className="mr-2"/> Registrar Nova Despesa</button>
          
          <h3 className="text-lg font-bold mb-4">Despesas do Mês</h3>
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {gastosDoMes.map(g => (
                <li key={g.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                    <div>
                        <p className={`font-medium ${g.pago && 'line-through text-gray-500'}`}>{g.descricao}</p>
                        <p className="text-xs text-gray-500">{new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')} {g.recorrente && <Repeat size={12} className="inline ml-1"/>}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-red-600 dark:text-red-400">R$ {g.valor.toFixed(2)}</span>
                        {g.pago ? <CheckCircle className="text-green-500" title={`Pago via ${g.metodo_pagamento}`}/> : <button onClick={() => openPayGastoModal(g)} className="text-gray-400 hover:text-green-500" title="Marcar como pago"><Circle/></button>}
                        <button onClick={() => openEditGastoModal(g)} className="text-gray-400 hover:text-indigo-500"><Edit size={16}/></button>
                        <button onClick={() => handleDeleteGasto(g.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                </li>
            ))}
          </ul>
        </div>

        {/* Extrato de Transações */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Extrato do Mês</h2>
          <ul className="space-y-2 max-h-[30rem] overflow-y-auto">
            {transacoesDoMes.map(t => (
                <li key={t.id} className="flex justify-between items-center p-3 border-b dark:border-gray-700">
                    <div className="flex items-center gap-4">
                        {t.tipo === 'entrada' && <ArrowUpCircle className="text-green-500" />}
                        {t.tipo === 'saida' && <ArrowDownCircle className="text-red-500" />}
                        {t.tipo === 'transferencia' && <ArrowLeftRight className="text-yellow-500" />}
                        <div>
                            <p className="font-medium">{t.descricao}</p>
                            <p className="text-xs text-gray-500">{new Date(t.data).toLocaleDateString('pt-BR')} {t.metodo_pagamento && `- ${t.metodo_pagamento}`}</p>
                        </div>
                    </div>
                    { t.tipo === 'transferencia' ? (
                        <span className="font-bold text-yellow-600 dark:text-yellow-400">
                          R$ {t.valor.toFixed(2)}
                        </span>
                      ) : (
                        <span className={`font-bold ${t.tipo === 'entrada' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {t.tipo === 'entrada' ? '+' : '-'} R$ {t.valor.toFixed(2)}
                        </span>
                      )
                    }
                </li>
            ))}
          </ul>
        </div>
      </div>
      
      {/* Modal de Adicionar/Editar Gasto */}
      {editingGasto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">{editingGasto.id ? 'Editar Despesa' : 'Nova Despesa'}</h2><button onClick={closeModal}><X size={24} /></button></div>
                <form onSubmit={handleAddOrEditGasto} className="p-6 space-y-4">
                    <div><label className="block text-sm font-medium">Descrição</label><input type="text" value={novoGasto.descricao} onChange={e => setNovoGasto({...novoGasto, descricao: e.target.value})} className="mt-1 w-full input-style" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="block text-sm font-medium">Valor (R$)</label><input type="number" step="0.01" value={novoGasto.valor} onChange={e => setNovoGasto({...novoGasto, valor: e.target.value})} className="mt-1 w-full input-style" required /></div>
                        <div><label className="block text-sm font-medium">Data</label><input type="date" value={novoGasto.data} onChange={e => setNovoGasto({...novoGasto, data: e.target.value})} className="mt-1 w-full input-style" required /></div>
                    </div>
                    <div className="flex items-center"><input type="checkbox" id="recorrente" checked={novoGasto.recorrente} onChange={e => setNovoGasto({...novoGasto, recorrente: e.target.checked})} className="h-4 w-4 rounded"/><label htmlFor="recorrente" className="ml-2 text-sm">Despesa Recorrente</label></div>
                    <div className="pt-4 flex justify-end"><button type="submit" className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700">Salvar</button></div>
                </form>
            </div>
        </div>
      )}

      {/* Modal de Pagar Gasto */}
      {payingGasto && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">Confirmar Pagamento</h2><button onClick={closeModal}><X size={24} /></button></div>
            <form onSubmit={handlePayGasto} className="p-6 space-y-4">
              <p>Confirmar pagamento de <strong>R$ {payingGasto.valor.toFixed(2)}</strong> para <strong>{payingGasto.descricao}</strong>?</p>
              <div><label className="block text-sm font-medium">Método de Pagamento</label><select value={gastoPagamento.metodo} onChange={e => setGastoPagamento({metodo: e.target.value})} className="mt-1 w-full input-style" required><option>Dinheiro</option><option>PIX</option><option>Cartão de Débito</option></select></div>
              <div className="pt-4 flex justify-end"><button type="submit" className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700">Confirmar</button></div>
            </form>
          </div>
        </div>
      )}
      
      {/* Modal de Transferência */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">Transferir para Conta</h2><button onClick={closeModal}><X size={24} /></button></div>
            <form onSubmit={handleTransfer} className="p-6 space-y-4">
              <p className="text-sm">Saldo atual em dinheiro: <strong className="text-green-600">R$ {saldoDinheiro.toFixed(2)}</strong></p>
              <div><label className="block text-sm font-medium">Valor a Transferir (R$)</label><input type="number" step="0.01" value={transferencia.valor} onChange={e => setTransferencia({...transferencia, valor: e.target.value})} className="mt-1 w-full input-style" required /></div>
              <div><label className="block text-sm font-medium">Data da Transferência</label><input type="date" value={transferencia.data} onChange={e => setTransferencia({...transferencia, data: e.target.value})} className="mt-1 w-full input-style" required /></div>
              <div className="pt-4 flex justify-end"><button type="submit" className="bg-blue-600 text-white py-2 px-6 rounded-md hover:bg-blue-700">Registrar Transferência</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Caixa;