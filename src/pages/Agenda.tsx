import { useState, useEffect, FormEvent, useContext, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App";
import { PlusCircle, X, ChevronLeft, ChevronRight, ArrowLeft, Edit, Trash2, CheckCircle, Circle, AlertTriangle, RotateCw, DollarSign } from "lucide-react";

// --- INTERFACES E CONFIGURAÇÕES ---
interface Service {
  id: number;
  nome: string;
  preco: number;
  duracao_minutos: number;
}

interface Cliente {
    id: number;
    nome: string;
}

interface Agendamento {
  id: number;
  cliente_id?: number; // Vínculo com a tabela de clientes
  cliente_nome: string;
  data_inicio: string;
  data_fim: string;
  valor_total: number;
  servicos_selecionados: Service[];
  adiantamento_confirmado: boolean;
  valor_adiantamento: number;
  status: 'agendado' | 'concluido' | 'cancelado';
  observacoes?: string;
  valor_final_pago?: number;
  metodo_pagamento?: string;
  adiantamento_metodo_pagamento?: string;
}

const HORA_INICIO_TRABALHO = 8; // 8:00
const HORA_FIM_TRABALHO = 18; // 18:00
const MINUTOS_TOTAIS_TRABALHO = (HORA_FIM_TRABALHO - HORA_INICIO_TRABALHO) * 60;

// --- COMPONENTE PRINCIPAL ---
const Agenda = () => {
  const session = useContext(SessionContext);

  // --- ESTADOS ---
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [agendamentosDoMes, setAgendamentosDoMes] = useState<Agendamento[]>([]);
  const [servicosDisponiveis, setServicosDisponiveis] = useState<Service[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [isAdiantamentoModalOpen, setIsAdiantamentoModalOpen] = useState(false);
  const [editingAgendamento, setEditingAgendamento] = useState<Agendamento | null>(null);
  const [checkoutAgendamento, setCheckoutAgendamento] = useState<Agendamento | null>(null);
  const [confirmingAdiantamento, setConfirmingAdiantamento] = useState<Agendamento | null>(null);
  const [checkoutData, setCheckoutData] = useState({ valorPago: "", metodo: "Dinheiro" });
  const [adiantamentoMetodo, setAdiantamentoMetodo] = useState("Dinheiro");
  const [novoAgendamento, setNovoAgendamento] = useState({
    cliente_id: null as number | null,
    cliente_nome: "",
    data: new Date().toISOString().split('T')[0],
    horario_inicio: "08:00",
    servicos: [] as Service[],
    valor_adiantamento: "0",
    observacoes: ""
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [conflito, setConflito] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // --- EFEITOS ---
  useEffect(() => {
    if (session) {
        fetchInitialData();
    }
  }, [currentMonth, session]);
  
  const { valorTotal, dataInicio, dataFim } = useMemo(() => {
    const dataBase = editingAgendamento ? new Date(novoAgendamento.data + 'T00:00:00') : selectedDate;
    const [horas, minutos] = novoAgendamento.horario_inicio.split(':');
    const dataInicio = new Date(dataBase);
    dataInicio.setHours(Number(horas), Number(minutos), 0, 0);

    const duracaoTotal = novoAgendamento.servicos.reduce((acc, s) => acc + s.duracao_minutos, 0);
    const valorTotal = novoAgendamento.servicos.reduce((acc, s) => acc + s.preco, 0);
    
    const dataFim = new Date(dataInicio);
    dataFim.setMinutes(dataFim.getMinutes() + duracaoTotal);

    return { valorTotal, dataInicio, dataFim };
  }, [novoAgendamento.servicos, novoAgendamento.horario_inicio, novoAgendamento.data, selectedDate, editingAgendamento]);
  
  useEffect(() => {
    if (!isModalOpen) { setConflito(null); return; }
    verificarConflito();
  }, [dataInicio, dataFim, isModalOpen]);

  // --- FUNÇÕES DE BUSCA DE DADOS ---
  const fetchInitialData = () => {
    setLoading(true);
    Promise.all([
        fetchServicos(),
        fetchAgendamentosDoMes(),
        fetchClientes()
    ]).finally(() => setLoading(false));
  };

  const fetchServicos = async () => {
    const { data, error } = await supabase.from("servicos").select("*");
    if (error) {
      console.error("Erro ao buscar serviços:", error);
    } else {
      setServicosDisponiveis(data || []);
    }
  };

  const fetchAgendamentosDoMes = async () => {
    const primeiroDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const ultimoDia = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);
    ultimoDia.setHours(23, 59, 59, 999);
    
    try {
      const { data, error } = await supabase
        .from("agendamentos")
        .select("*")
        .gte("data_inicio", primeiroDia.toISOString())
        .lte("data_inicio", ultimoDia.toISOString())
        .order("data_inicio", { ascending: true });

      if (error) throw error;
      setAgendamentosDoMes(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar agendamentos:", err);
    } 
  };
  
  const fetchClientes = async () => {
    const { data, error } = await supabase.from('clientes').select('id, nome').order('nome');
    if (error) console.error("Erro ao buscar clientes", error);
    else setClientes(data || []);
  };

  // --- LÓGICA DE DADOS E FORMULÁRIO ---
  const dadosDosDias = useMemo(() => {
    const grouped = new Map<string, { agendamentos: Agendamento[] }>();
    agendamentosDoMes.forEach(ag => {
      const dia = new Date(ag.data_inicio).toISOString().split('T')[0];
      if (!grouped.has(dia)) {
        grouped.set(dia, { agendamentos: [] });
      }
      grouped.get(dia)!.agendamentos.push(ag);
    });
    return grouped;
  }, [agendamentosDoMes]);

  const timeSlots = useMemo(() => {
      const slots = [];
      const dataParaVerificar = editingAgendamento ? new Date(novoAgendamento.data + 'T00:00:00') : selectedDate;
      const agendamentosDoDia = (dadosDosDias.get(dataParaVerificar.toISOString().split('T')[0])?.agendamentos || []).filter(ag => ag.status !== 'cancelado');

      for (let h = HORA_INICIO_TRABALHO; h < HORA_FIM_TRABALHO; h++) {
          for (let m = 0; m < 60; m += 30) {
              const timeString = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
              const slotDate = new Date(dataParaVerificar);
              slotDate.setHours(h, m, 0, 0);
              const slotTime = slotDate.getTime();

              const isOccupied = agendamentosDoDia.some(ag => {
                  if (editingAgendamento && editingAgendamento.id === ag.id) return false;
                  const inicioExistente = new Date(ag.data_inicio).getTime();
                  const fimExistente = new Date(ag.data_fim).getTime();
                  return slotTime >= inicioExistente && slotTime < fimExistente;
              });

              slots.push({ time: timeString, isOccupied });
          }
      }
      return slots;
  }, [dadosDosDias, selectedDate, editingAgendamento, novoAgendamento.data]);
  
  const verificarConflito = () => {
    const diaVerificar = editingAgendamento ? novoAgendamento.data : selectedDate.toISOString().split('T')[0];
    const agendamentosDoDia = (dadosDosDias.get(diaVerificar)?.agendamentos || []).filter(ag => ag.status !== 'cancelado');
    
    for (const ag of agendamentosDoDia) {
      if (editingAgendamento && editingAgendamento.id === ag.id) continue;

      const inicioExistente = new Date(ag.data_inicio).getTime();
      const fimExistente = new Date(ag.data_fim).getTime();
      const novoInicio = dataInicio.getTime();
      const novoFim = dataFim.getTime();

      if (Math.max(inicioExistente, novoInicio) < Math.min(fimExistente, novoFim)) {
        setConflito(`Conflito com o agendamento de ${ag.cliente_nome}`);
        return;
      }
    }
    setConflito(null);
  };
  
  const filteredClientes = useMemo(() => {
    if (!searchTerm) return [];
    return clientes.filter(c => 
        c.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm, clientes]);

  // --- AÇÕES DO USUÁRIO ---
  const handleServiceSelection = (serviceId: string) => {
    const servico = servicosDisponiveis.find(s => s.id === parseInt(serviceId));
    if (!servico) return;
    const isSelected = novoAgendamento.servicos.some(s => s.id === servico.id);
    setNovoAgendamento(prev => ({
      ...prev,
      servicos: isSelected ? prev.servicos.filter(s => s.id !== servico.id) : [...prev.servicos, { ...servico }]
    }));
  };
  
  const handleDurationChange = (serviceId: number, newDuration: string) => {
    setNovoAgendamento(prev => ({
      ...prev,
      servicos: prev.servicos.map(s => 
        s.id === serviceId ? { ...s, duracao_minutos: parseInt(newDuration) || 0 } : s
      )
    }));
  };

  const handleClienteInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const name = e.target.value;
    setSearchTerm(name);
    setNovoAgendamento(prev => ({ ...prev, cliente_nome: name, cliente_id: null }));
    setShowSuggestions(true);
  };

  const handleClienteSuggestionClick = (cliente: Cliente) => {
      setSearchTerm(cliente.nome);
      setNovoAgendamento(prev => ({ ...prev, cliente_nome: cliente.nome, cliente_id: cliente.id }));
      setShowSuggestions(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (conflito) { alert("Não é possível salvar. Existe um conflito de horários."); return; }
    if (!session?.user || novoAgendamento.servicos.length === 0 || !novoAgendamento.cliente_nome) {
      alert("O nome do cliente e ao menos um serviço são obrigatórios.");
      return;
    }

    const agendamentoData = {
      cliente_id: novoAgendamento.cliente_id, // Pode ser null se for um novo cliente
      cliente_nome: novoAgendamento.cliente_nome,
      data_inicio: dataInicio.toISOString(),
      data_fim: dataFim.toISOString(),
      servicos_selecionados: novoAgendamento.servicos,
      valor_total: valorTotal,
      valor_adiantamento: parseFloat(novoAgendamento.valor_adiantamento),
      observacoes: novoAgendamento.observacoes,
    };

    try {
      if (editingAgendamento) {
        await supabase.from('agendamentos').update(agendamentoData).eq('id', editingAgendamento.id);
      } else {
        await supabase.from('agendamentos').insert([{ ...agendamentoData, user_id: session.user.id, status: 'agendado' }]);
      }
      closeModal();
      await fetchInitialData();
      setSelectedDate(dataInicio);
      setViewMode('day');
    } catch (err: any) { alert("Não foi possível salvar o agendamento."); }
  };
  const handleEdit = (agendamento: Agendamento) => {
    setEditingAgendamento(agendamento);
    setSearchTerm(agendamento.cliente_nome);
    setNovoAgendamento({
      cliente_id: agendamento.cliente_id || null,
      cliente_nome: agendamento.cliente_nome,
      data: new Date(agendamento.data_inicio).toISOString().split('T')[0],
      horario_inicio: new Date(agendamento.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      servicos: agendamento.servicos_selecionados,
      valor_adiantamento: String(agendamento.valor_adiantamento || 0),
      observacoes: agendamento.observacoes || ""
    });
    setIsModalOpen(true);
  };
  const handleCancel = async (agendamento: Agendamento) => {
    const acao = agendamento.status === 'cancelado' ? 'reativar' : 'cancelar';
    if (!window.confirm(`Tem certeza que deseja ${acao} este agendamento?`)) return;
    try {
      const novoStatus = agendamento.status === 'cancelado' ? 'agendado' : 'cancelado';
      await supabase.from('agendamentos').update({ status: novoStatus }).eq('id', agendamento.id);
      fetchAgendamentosDoMes();
    } catch (err: any) { console.error(`Não foi possível ${acao} o agendamento.`); }
  };
  const handleOpenCheckoutModal = (agendamento: Agendamento) => {
    setCheckoutAgendamento(agendamento);
    const aPagar = agendamento.valor_total - (agendamento.adiantamento_confirmado ? agendamento.valor_adiantamento : 0);
    setCheckoutData({
        valorPago: aPagar.toFixed(2),
        metodo: "Dinheiro"
    });
    setIsCheckoutModalOpen(true);
  };

  const handleCheckoutSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!checkoutAgendamento) return;

    try {
        await supabase
            .from('agendamentos')
            .update({
                status: 'concluido',
                valor_final_pago: parseFloat(checkoutData.valorPago),
                metodo_pagamento: checkoutData.metodo,
            })
            .eq('id', checkoutAgendamento.id);
        
        setIsCheckoutModalOpen(false);
        setCheckoutAgendamento(null);
        fetchAgendamentosDoMes();
    } catch (err: any) {
        console.error("Falha ao finalizar o agendamento.");
    }
  };
  
  const handleOpenConfirmAdiantamento = (agendamento: Agendamento) => {
    setConfirmingAdiantamento(agendamento);
    setAdiantamentoMetodo("Dinheiro");
    setIsAdiantamentoModalOpen(true);
  };

  const handleAdiantamentoSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!confirmingAdiantamento) return;
    try {
      await supabase.from('agendamentos').update({ 
        adiantamento_confirmado: true,
        adiantamento_metodo_pagamento: adiantamentoMetodo
      }).eq('id', confirmingAdiantamento.id);

      setIsAdiantamentoModalOpen(false);
      setConfirmingAdiantamento(null);
      fetchAgendamentosDoMes();
    } catch (err: any) { console.error("Não foi possível confirmar o adiantamento."); }
  };
  
  const openModal = () => {
    setSearchTerm("");
    setNovoAgendamento({
      cliente_id: null,
      cliente_nome: "",
      data: selectedDate.toISOString().split('T')[0],
      horario_inicio: "08:00", servicos: [], valor_adiantamento: "0", observacoes: ""
    });
    setIsModalOpen(true);
  };
  const closeModal = () => {
    setIsModalOpen(false);
    setEditingAgendamento(null);
  };
  
  // --- LÓGICA DE RENDERIZAÇÃO ---
  const getAgendamentoColor = (ag: Agendamento) => {
    const agora = new Date();
    const dataFimAgendamento = new Date(ag.data_fim);
    const isVencido = dataFimAgendamento < agora;

    if(ag.status === 'concluido') return 'bg-cyan-500/80 border-cyan-500';
    if (ag.status === 'cancelado') return 'bg-gray-500/80 border-gray-500';
    if (isVencido && ag.valor_adiantamento > 0 && !ag.adiantamento_confirmado) return 'bg-red-500/80 border-red-500';
    if (ag.adiantamento_confirmado) return 'bg-green-500/80 border-green-500';
    if (ag.valor_adiantamento > 0) return 'bg-yellow-500/80 border-yellow-500';
    return 'bg-indigo-500/80 border-indigo-500';
  };
  const generateCalendarDays = () => {
    const dias = [];
    const hoje = new Date(); hoje.setHours(0,0,0,0);
    const primeiroDiaDoMes = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const diasNoMes = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();

    for (let i = 0; i < primeiroDiaDoMes; i++) { dias.push(<div key={`empty-${i}`} className="border-t border-r dark:border-gray-700"></div>); }
    
    for (let i = 1; i <= diasNoMes; i++) {
      const diaAtual = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), i);
      const diaString = diaAtual.toISOString().split('T')[0];
      const infoDoDia = dadosDosDias.get(diaString);
      const isHoje = diaAtual.getTime() === hoje.getTime();
      
      dias.push(
        <div key={i} onClick={() => { setSelectedDate(diaAtual); setViewMode('day'); }} className="relative p-1 border-t border-r dark:border-gray-700 cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors duration-200 min-h-[7rem] flex flex-col">
          <span className={`w-7 h-7 flex items-center justify-center rounded-full self-end text-sm ${isHoje ? 'bg-indigo-600 text-white' : ''}`}>
            {i}
          </span>
          <div className="relative flex-grow mt-1 -mx-1">
            {infoDoDia?.agendamentos.filter(ag => ag.status !== 'cancelado').map(ag => {
              const [bgColor] = getAgendamentoColor(ag).split(' ');
              const inicioAg = new Date(ag.data_inicio);
              const fimAg = new Date(ag.data_fim);
              const inicioMinutos = (inicioAg.getHours() - HORA_INICIO_TRABALHO) * 60 + inicioAg.getMinutes();
              const duracaoMinutos = Math.max((fimAg.getTime() - inicioAg.getTime()) / 60000, 15);
              
              const top = Math.max((inicioMinutos / MINUTOS_TOTAIS_TRABALHO) * 100, 0);
              const calculatedHeight = (duracaoMinutos / MINUTOS_TOTAIS_TRABALHO) * 100;
              const height = Math.min(calculatedHeight, 100 - top);

              if (height <= 0 || top >= 100) return null;

              return (
                <div 
                  key={ag.id} 
                  className={`absolute w-full ${bgColor} rounded-sm overflow-hidden text-white text-[10px] px-1 leading-tight`} 
                  style={{ top: `${top}%`, height: `${height}%` }}
                  title={`${ag.cliente_nome} - ${inicioAg.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`}
                >
                  <span className="truncate">{ag.cliente_nome}</span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return dias;
  };
  const renderMonthView = () => (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
      <div className="flex justify-between items-center mb-4">
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronLeft/></button>
        <h2 className="text-xl font-bold text-center capitalize">{currentMonth.toLocaleString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
        <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700"><ChevronRight/></button>
      </div>
      <div className="grid grid-cols-7 text-center font-semibold text-sm text-gray-600 dark:text-gray-400">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(dia => <div key={dia} className="py-2">{dia}</div>)}
      </div>
      <div className="grid grid-cols-7 border-l border-b dark:border-gray-700">{generateCalendarDays()}</div>
    </div>
  );
  const renderDayView = () => {
    const agendamentosDoDia = (dadosDosDias.get(selectedDate.toISOString().split('T')[0])?.agendamentos || []).sort((a,b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime());
    return (
      <div>
        <div className="flex flex-wrap justify-between items-center mb-6 gap-4">
          <div>
            <button onClick={() => setViewMode('month')} className="flex items-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline mb-2"><ArrowLeft size={16} className="mr-1" />Voltar para o Mês</button>
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100 capitalize">{selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</h1>
          </div>
          <button onClick={openModal} className="flex items-center bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700"><PlusCircle size={20} className="mr-2" /> Novo Agendamento</button>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          {loading ? <p>Carregando...</p> : agendamentosDoDia.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">Nenhum agendamento para este dia.</p>
          ) : (
            <div className="space-y-4">
              {agendamentosDoDia.map(ag => {
                const [, borderColor] = getAgendamentoColor(ag).split(' ');
                const statusClass = ag.status === 'cancelado' ? 'bg-gray-100 dark:bg-gray-800/50 opacity-60' : 'bg-gray-50 dark:bg-gray-700';
                return (
                <div key={ag.id} className={`p-4 border-l-4 rounded-r-lg flex flex-col sm:flex-row sm:justify-between sm:items-center ${borderColor} ${statusClass}`}>
                   <div className="flex-grow">
                       <p className={`font-bold text-lg ${ag.status === 'cancelado' && 'line-through'}`}>{ag.cliente_nome}</p>
                       <p className="text-sm text-gray-600 dark:text-gray-300">
                           {new Date(ag.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(ag.data_fim).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                       </p>
                       <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ag.servicos_selecionados.map(s => s.nome).join(', ')}</p>
                   </div>
                   
                   {ag.status === 'concluido' && (
                     <div className="text-sm text-right mt-4 sm:mt-0 sm:ml-4">
                        <p className="font-semibold text-gray-800 dark:text-gray-200">Total Pago: R$ {ag.valor_final_pago?.toFixed(2)}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Via {ag.metodo_pagamento}</p>
                        {ag.adiantamento_confirmado && (
                            <p className="text-xs text-green-600 dark:text-green-400">
                                (inclui R$ {ag.valor_adiantamento.toFixed(2)} de adiantamento via {ag.adiantamento_metodo_pagamento})
                            </p>
                        )}
                     </div>
                   )}

                   <div className="flex items-center space-x-3 text-gray-500 dark:text-gray-400 mt-4 sm:mt-0 sm:ml-6 self-start sm:self-center">
                      {ag.status === 'cancelado' ? (<button onClick={() => handleCancel(ag)} title="Reativar Agendamento" className="hover:text-blue-500"><RotateCw/></button>) : null}
                      {ag.status === 'agendado' ? (
                        <>
                          <button onClick={() => handleOpenCheckoutModal(ag)} title="Finalizar (Checkout)" className="hover:text-teal-500"><DollarSign size={18} /></button>
                          {ag.valor_adiantamento > 0 && 
                            (ag.adiantamento_confirmado ? 
                              <span title={`Adiantamento confirmado via ${ag.adiantamento_metodo_pagamento}`}><CheckCircle className="text-green-500"/></span> : 
                              <button onClick={() => handleOpenConfirmAdiantamento(ag)} title="Confirmar Adiantamento" className="hover:text-green-500"><Circle/></button>
                            )
                          }
                          <button onClick={() => handleEdit(ag)} title="Editar Agendamento" className="hover:text-indigo-500"><Edit size={18} /></button>
                          <button onClick={() => handleCancel(ag)} title="Cancelar Agendamento" className="hover:text-red-500"><Trash2 size={18} /></button>
                        </>
                      ) : null}
                   </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  const renderCheckoutModal = () => {
    if (!checkoutAgendamento) return null;
    const aPagar = checkoutAgendamento.valor_total - (checkoutAgendamento.adiantamento_confirmado ? checkoutAgendamento.valor_adiantamento : 0);

    return(
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
          <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
            <h2 className="text-xl font-bold">Finalizar Agendamento</h2>
            <button onClick={() => setIsCheckoutModalOpen(false)}><X size={24} /></button>
          </div>
          <form onSubmit={handleCheckoutSubmit} className="p-6 space-y-4">
            <div className="text-center mb-4">
              <p className="text-lg font-semibold">{checkoutAgendamento.cliente_nome}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Serviços realizados</p>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md space-y-2 text-sm">
              <div className="flex justify-between"><span>Valor Total dos Serviços:</span><span>R$ {checkoutAgendamento.valor_total.toFixed(2)}</span></div>
              <div className="flex justify-between"><span>Adiantamento Confirmado:</span><span className="text-green-600 dark:text-green-400">- R$ {(checkoutAgendamento.adiantamento_confirmado ? checkoutAgendamento.valor_adiantamento : 0).toFixed(2)}</span></div>
              <hr className="border-gray-200 dark:border-gray-600"/>
              <div className="flex justify-between font-bold text-base"><span>Valor a Pagar:</span><span>R$ {aPagar.toFixed(2)}</span></div>
            </div>
            <div>
              <label className="block text-sm font-medium">Valor Recebido (R$)</label>
              <input type="number" step="0.01" min="0" value={checkoutData.valorPago} onChange={e => setCheckoutData({...checkoutData, valorPago: e.target.value})} className="mt-1 w-full input-style" required />
            </div>
            <div>
              <label className="block text-sm font-medium">Método de Pagamento</label>
              <select value={checkoutData.metodo} onChange={e => setCheckoutData({...checkoutData, metodo: e.target.value})} className="mt-1 w-full input-style" required>
                <option>Dinheiro</option>
                <option>Cartão de Crédito</option>
                <option>Cartão de Débito</option>
                <option>PIX</option>
                <option>Outro</option>
              </select>
            </div>
            <div className="pt-4 flex justify-end">
              <button type="submit" className="bg-teal-600 text-white py-2 px-6 rounded-md hover:bg-teal-700">Confirmar Pagamento</button>
            </div>
          </form>
        </div>
      </div>
    );
  };
  
  const renderAdiantamentoModal = () => {
    if (!confirmingAdiantamento) return null;
    return(
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-sm">
            <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold">Confirmar Adiantamento</h2>
              <button onClick={() => setIsAdiantamentoModalOpen(false)}><X size={24} /></button>
            </div>
            <form onSubmit={handleAdiantamentoSubmit} className="p-6 space-y-4">
              <p>Confirmar recebimento de <strong>R$ {confirmingAdiantamento.valor_adiantamento.toFixed(2)}</strong> para o agendamento de <strong>{confirmingAdiantamento.cliente_nome}</strong>?</p>
              <div>
                <label className="block text-sm font-medium">Método de Pagamento</label>
                <select value={adiantamentoMetodo} onChange={e => setAdiantamentoMetodo(e.target.value)} className="mt-1 w-full input-style" required>
                  <option>Dinheiro</option>
                  <option>Cartão de Crédito</option>
                  <option>Cartão de Débito</option>
                  <option>PIX</option>
                  <option>Outro</option>
                </select>
              </div>
              <div className="pt-4 flex justify-end">
                <button type="submit" className="bg-green-600 text-white py-2 px-6 rounded-md hover:bg-green-700">Confirmar</button>
              </div>
            </form>
          </div>
        </div>
    );
  };

  return (
    <>
      <style>{`.input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; font-size: 0.875rem; line-height: 1.25rem; background-color: white; border: 1px solid #D1D5DB; border-radius: 0.375rem; box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05); } .dark .input-style { background-color: #374151; border-color: #4B5563; }`}</style>
      {viewMode === 'month' && renderMonthView()}
      {viewMode === 'day' && renderDayView()}
      {isModalOpen && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">{editingAgendamento ? "Editar Agendamento" : "Novo Agendamento"}</h2><button onClick={closeModal}><X size={24} /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {editingAgendamento && (
                        <div><label className="block text-sm font-medium">Data do Agendamento</label><input type="date" value={novoAgendamento.data} onChange={e => setNovoAgendamento({...novoAgendamento, data: e.target.value})} className="mt-1 w-full input-style" required /></div>
                    )}
                    <div>
                        <label className="block text-sm font-medium">Cliente</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                value={searchTerm}
                                onChange={handleClienteInputChange}
                                onFocus={() => setShowSuggestions(true)}
                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)} // Delay to allow click
                                className="mt-1 w-full input-style" 
                                required 
                                autoComplete="off"
                            />
                            {showSuggestions && filteredClientes.length > 0 && (
                                <ul className="absolute z-10 w-full bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md mt-1 max-h-40 overflow-y-auto shadow-lg">
                                    {filteredClientes.map(c => (
                                        <li 
                                            key={c.id} 
                                            onClick={() => handleClienteSuggestionClick(c)}
                                            className="p-2 hover:bg-indigo-100 dark:hover:bg-indigo-900 cursor-pointer"
                                        >
                                            {c.nome}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium">Horário de Início</label>
                        <div className="mt-2 grid grid-cols-4 sm:grid-cols-5 gap-2">
                        {timeSlots.map(({ time, isOccupied }) => (
                            <button
                            key={time}
                            type="button"
                            disabled={isOccupied}
                            onClick={() => setNovoAgendamento({ ...novoAgendamento, horario_inicio: time })}
                            className={`p-2 rounded-md text-sm text-center transition-colors
                                ${isOccupied ? 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed line-through' : ''}
                                ${!isOccupied && novoAgendamento.horario_inicio === time ? 'bg-indigo-600 text-white ring-2 ring-indigo-400' : ''}
                                ${!isOccupied && novoAgendamento.horario_inicio !== time ? 'bg-gray-100 dark:bg-gray-600 hover:bg-indigo-200 dark:hover:bg-indigo-800' : ''}
                            `}
                            >
                            {time}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium">Serviços</label>
                        <div className="mt-2 max-h-40 overflow-y-auto border dark:border-gray-600 rounded-md p-2 space-y-2">
                        {servicosDisponiveis.map(servico => {
                            const servicoSelecionado = novoAgendamento.servicos.find(s => s.id === servico.id);
                            return (
                            <div key={servico.id} className="flex items-center justify-between gap-4 p-1">
                                <div className="flex items-center flex-grow">
                                <input type="checkbox" id={`servico-${servico.id}`} onChange={() => handleServiceSelection(String(servico.id))} checked={!!servicoSelecionado} className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                                <label htmlFor={`servico-${servico.id}`} className="ml-3 text-sm flex-grow">{servico.nome}</label>
                                <span className="text-sm text-gray-500 dark:text-gray-400 mr-4">R$ {servico.preco.toFixed(2)}</span>
                                </div>
                                {servicoSelecionado && (
                                <div className="flex items-center space-x-2">
                                    <input
                                    type="number"
                                    value={servicoSelecionado.duracao_minutos}
                                    onChange={(e) => handleDurationChange(servico.id, e.target.value)}
                                    className="w-20 input-style text-center"
                                    min="0"
                                    />
                                    <span className="text-sm text-gray-500 dark:text-gray-400">min</span>
                                </div>
                                )}
                            </div>
                            );
                        })}
                        </div>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-md space-y-2 text-sm"><div className="flex justify-between"><span>Duração Total:</span><span>{dataFim.getTime() - dataInicio.getTime() > 0 ? `${(dataFim.getTime() - dataInicio.getTime()) / 60000} min` : '0 min' }</span></div><div className="flex justify-between"><span>Horário de Término (previsão):</span><span>{dataFim.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div><div className="flex justify-between font-bold text-base"><span>Valor Total:</span><span>R$ {valorTotal.toFixed(2)}</span></div></div>
                    <div><label className="block text-sm font-medium">Adiantamento (R$)</label><input type="number" step="0.01" min="0" value={novoAgendamento.valor_adiantamento} onChange={e => setNovoAgendamento({...novoAgendamento, valor_adiantamento: e.target.value})} className="mt-1 w-full input-style" /></div>
                    <div><label className="block text-sm font-medium">Observações</label><textarea value={novoAgendamento.observacoes} onChange={e => setNovoAgendamento({...novoAgendamento, observacoes: e.target.value})} rows={2} className="mt-1 w-full input-style"></textarea></div>
                    {conflito && (<div className="p-3 text-sm text-red-800 bg-red-100 dark:text-red-200 dark:bg-red-900/50 rounded-md flex items-center"><AlertTriangle size={18} className="mr-2"/>{conflito}</div>)}
                    <div className="pt-4 flex justify-end"><button type="submit" disabled={!!conflito} className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700 disabled:bg-gray-400 disabled:cursor-not-allowed">Salvar</button></div>
                </form>
            </div>
        </div>
      )}
      {isCheckoutModalOpen && renderCheckoutModal()}
      {isAdiantamentoModalOpen && renderAdiantamentoModal()}
    </>
  );
};

export default Agenda;