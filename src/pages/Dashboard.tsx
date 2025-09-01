import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../lib/supabaseClient';
import { BarChart2, Calendar, Users, DollarSign, Clock } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// --- INTERFACES ---
interface Agendamento {
  id: number;
  data_inicio: string;
  data_fim: string;
  status: 'agendado' | 'concluido' | 'cancelado';
  valor_final_pago: number;
  valor_total: number;
  cliente_nome: string;
  servicos_selecionados: { nome: string }[];
}

// --- COMPONENTE PRINCIPAL ---
const Dashboard = () => {
  const [agendamentosHoje, setAgendamentosHoje] = useState<Agendamento[]>([]);
  const [agendamentosMes, setAgendamentosMes] = useState<Agendamento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const hoje = new Date();
      const inicioDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
      const fimDoDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59).toISOString();
      
      const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString();
      const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59).toISOString();

      const { data: hojeData, error: hojeError } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data_inicio', inicioDoDia)
        .lte('data_inicio', fimDoDia)
        .neq('status', 'cancelado');
      
      // Busca agendamentos concluídos E agendados do mês todo para o gráfico de projeção
      const { data: mesData, error: mesError } = await supabase
        .from('agendamentos')
        .select('*')
        .gte('data_inicio', primeiroDiaMes)
        .lte('data_inicio', ultimoDiaMes)
        .neq('status', 'cancelado');

      if (hojeError || mesError) {
        console.error("Erro ao buscar dados do dashboard:", hojeError || mesError);
      } else {
        setAgendamentosHoje(hojeData || []);
        setAgendamentosMes(mesData || []);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  // --- CÁLCULOS PARA OS CARDS E GRÁFICOS ---
  const statsHoje = useMemo(() => {
    const agora = new Date().getTime();
    const concluidos = agendamentosHoje.filter(ag => ag.status === 'concluido');
    const receitaHoje = concluidos.reduce((acc, ag) => acc + (ag.valor_final_pago || 0), 0);
    const agendamentosRestantes = agendamentosHoje.filter(ag => new Date(ag.data_inicio).getTime() > agora && ag.status === 'agendado');

    return {
      total: agendamentosHoje.length,
      restantes: agendamentosRestantes.length,
      receita: receitaHoje
    };
  }, [agendamentosHoje]);
  
  const proximosAgendamentos = useMemo(() => {
      const agora = new Date().getTime();
      return agendamentosHoje
        .filter(ag => ag.status === 'agendado' && new Date(ag.data_inicio).getTime() > agora)
        .sort((a,b) => new Date(a.data_inicio).getTime() - new Date(b.data_inicio).getTime())
        .slice(0, 5);
  }, [agendamentosHoje]);

  const faturamentoMensalData = useMemo(() => {
    const hoje = new Date();
    const diaHoje = hoje.getDate();
    const faturamentoPorDia: { [key: number]: { realizado: number, previsto: number } } = {};

    agendamentosMes.forEach(ag => {
        const diaAgendamento = new Date(ag.data_inicio).getDate();

        if (!faturamentoPorDia[diaAgendamento]) {
            faturamentoPorDia[diaAgendamento] = { realizado: 0, previsto: 0 };
        }

        if (ag.status === 'concluido') {
            faturamentoPorDia[diaAgendamento].realizado += ag.valor_final_pago || 0;
        } else if (ag.status === 'agendado') {
            faturamentoPorDia[diaAgendamento].previsto += ag.valor_total || 0;
        }
    });

    const diasNoMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).getDate();
    const data = [];
    let ultimoValorRealizado = 0;

    for (let i = 1; i <= diasNoMes; i++) {
        const faturamentoDia = faturamentoPorDia[i] || { realizado: 0, previsto: 0 };
        
        if (i <= diaHoje) {
            ultimoValorRealizado = faturamentoDia.realizado;
            data.push({
                name: `Dia ${i}`,
                Realizado: faturamentoDia.realizado,
                Previsto: null, // Não mostra linha prevista para o passado
            });
        } else {
            data.push({
                name: `Dia ${i}`,
                Realizado: null, // Não mostra linha realizada para o futuro
                Previsto: faturamentoDia.previsto,
            });
        }
    }
    
    // Ponto de conexão entre as linhas
    if(data[diaHoje - 1]) {
        data[diaHoje - 1].Previsto = ultimoValorRealizado;
    }


    return data;
  }, [agendamentosMes]);
  
  const servicosPopularesData = useMemo(() => {
      const contagemServicos: { [key: string]: number } = {};
      agendamentosMes.filter(ag => ag.status === 'concluido').forEach(ag => {
          (ag.servicos_selecionados || []).forEach(servico => {
              contagemServicos[servico.nome] = (contagemServicos[servico.nome] || 0) + 1;
          });
      });
      return Object.entries(contagemServicos)
        .map(([name, value]) => ({ name, value }))
        .sort((a,b) => b.value - a.value);
  }, [agendamentosMes]);

  if (loading) return <div className="p-8 text-center">Carregando dashboard...</div>;

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

  return (
    <div className="space-y-8">
        {/* Resumo do Dia */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center gap-4">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-full"><Calendar className="text-blue-500"/></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">Agendamentos Hoje</p><p className="text-2xl font-bold">{statsHoje.total}</p></div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center gap-4">
                <div className="bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-full"><Users className="text-yellow-500"/></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">Clientes Restantes</p><p className="text-2xl font-bold">{statsHoje.restantes}</p></div>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex items-center gap-4">
                <div className="bg-green-100 dark:bg-green-900/50 p-3 rounded-full"><DollarSign className="text-green-500"/></div>
                <div><p className="text-sm text-gray-500 dark:text-gray-400">Receita de Hoje</p><p className="text-2xl font-bold">R$ {statsHoje.receita.toFixed(2)}</p></div>
            </div>
        </div>
        
        {/* Gráficos e Próximos Clientes */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart2 size={20}/> Faturamento do Mês (Realizado vs. Previsto)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={faturamentoMensalData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700"/>
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false}/>
                        <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `R$${value}`}/>
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.8)', border: '1px solid #ccc' }} formatter={(value: number, name) => [`R$ ${value.toFixed(2)}`, name]}/>
                        <Legend />
                        <Line type="monotone" dataKey="Realizado" stroke="#4f46e5" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} connectNulls/>
                        <Line type="monotone" dataKey="Previsto" stroke="#a5b4fc" strokeWidth={2} strokeDasharray="5 5" connectNulls/>
                    </LineChart>
                </ResponsiveContainer>
            </div>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={20}/> Próximos Clientes</h3>
                <ul className="space-y-4">
                    {proximosAgendamentos.length > 0 ? proximosAgendamentos.map(ag => (
                        <li key={ag.id} className="flex items-center justify-between">
                            <div>
                                <p className="font-semibold">{ag.cliente_nome}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{(ag.servicos_selecionados || []).map(s => s.nome).join(', ')}</p>
                            </div>
                            <span className="text-sm font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-1 rounded-full">
                                {new Date(ag.data_inicio).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </li>
                    )) : <p className="text-sm text-gray-500 dark:text-gray-400">Nenhum cliente agendado para o resto do dia.</p>}
                </ul>
            </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
            <h3 className="font-bold mb-4">Serviços Mais Populares do Mês (Concluídos)</h3>
            <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={servicosPopularesData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {servicosPopularesData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value}x realizados`, name]}/>
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </div>
    </div>
  );
};

export default Dashboard;

