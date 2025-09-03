import { useState, useEffect, useMemo, FormEvent, useContext } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App";
import { useSettings } from '../contexts/SettingsContext';
import { useRecurrenceForecast } from '../hooks/useRecurrenceForecast';
import { PlusCircle, Trash2, Edit, X, User, Clock, Bell, BellOff, CreditCard, Copy, Check } from "lucide-react";

// --- INTERFACES ---
interface Cliente { id: number; nome: string; telefone?: string; email?: string; observacoes?: string; alertas_ativos: boolean; }
interface AgendamentoCliente { data_inicio: string; status: string; servicos_selecionados: { id: number; nome: string }[]; valor_final_pago?: number; metodo_pagamento?: string; }
interface Service { id: number; nome: string; preco: number; prazo_recorrencia_dias?: number; }
interface PrevisaoRetorno { serviceName: string; lastVisit: Date; returnDate: Date; daysUntilReturn: number; }

const Clientes = () => {
    const session = useContext(SessionContext);
    const { alertDays } = useSettings();
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<{ cliente: Cliente; agendamentos: AgendamentoCliente[] } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
    const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "", email: "", observacoes: "" });
    const [loading, setLoading] = useState(true);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [allAppointments, setAllAppointments] = useState<any[]>([]);
    const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

    const { clientsWithAlerts } = useRecurrenceForecast(clientes, allServices as any, allAppointments);

    useEffect(() => { if(session) fetchInitialData(); }, [session]);
    
    const fetchInitialData = async () => {
        setLoading(true);
        const { data: cData } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
        const { data: sData } = await supabase.from('servicos').select('id, nome, preco, prazo_recorrencia_dias');
        const { data: aData } = await supabase.from('agendamentos').select('cliente_id, data_inicio, servicos_selecionados, status').eq('status', 'concluido');
        setClientes(cData || []); setAllServices(sData || []); setAllAppointments(aData || []);
        setLoading(false);
    };

    const handleSelectCliente = async (cliente: Cliente) => {
        const { data } = await supabase.from('agendamentos').select('data_inicio, servicos_selecionados, status, valor_final_pago, metodo_pagamento').eq('cliente_id', cliente.id).order('data_inicio', { ascending: false });
        setSelectedCliente({ cliente, agendamentos: data || [] }); setCopiedPhone(null);
    };
    
    const previsaoDeRetorno = useMemo((): PrevisaoRetorno[] => {
        if (!selectedCliente) return [];
        const clientAppointments = allAppointments.filter(ag => ag.cliente_id === selectedCliente.cliente.id);
        const projections: PrevisaoRetorno[] = []; const today = new Date();
        const recurringServices = allServices.filter(s => s.prazo_recorrencia_dias && s.prazo_recorrencia_dias > 0);
        recurringServices.forEach(service => {
            const lastApp = clientAppointments.filter(ag => ag.servicos_selecionados.some((ss: any) => ss.id === service.id)).sort((a, b) => new Date(b.data_inicio).getTime() - new Date(a.data_inicio).getTime())[0];
            if (lastApp) {
                const lastVisit = new Date(lastApp.data_inicio);
                const returnDate = new Date(lastVisit); returnDate.setDate(returnDate.getDate() + service.prazo_recorrencia_dias!);
                const daysUntilReturn = Math.ceil((returnDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
                projections.push({ serviceName: service.nome, lastVisit, returnDate, daysUntilReturn });
            }
        });
        return projections.sort((a, b) => a.returnDate.getTime() - b.returnDate.getTime());
    }, [selectedCliente, allServices, allAppointments]);

    const handleToggleAlerts = async (cliente: Cliente) => {
        const newStatus = !cliente.alertas_ativos;
        const { data } = await supabase.from('clientes').update({ alertas_ativos: newStatus }).eq('id', cliente.id).select().single();
        setClientes(clientes.map(c => c.id === cliente.id ? data : c));
        if (selectedCliente?.cliente.id === cliente.id) setSelectedCliente(prev => prev ? ({ ...prev, cliente: data }) : null);
    };

    const handleSaveCliente = async (e: FormEvent) => {
        e.preventDefault();
        const dataToSave = { ...novoCliente, user_id: session?.user.id };
        if (editingCliente) {
            await supabase.from('clientes').update(dataToSave).eq('id', editingCliente.id);
        } else {
            await supabase.from('clientes').insert([dataToSave]);
        }
        fetchInitialData();
        closeModal();
    };

    const handleDeleteCliente = async (clienteId: number) => {
        if(window.confirm("Tem certeza que deseja apagar este cliente? Todos os agendamentos associados serão mantidos, mas desvinculados.")) {
            await supabase.from('clientes').delete().eq('id', clienteId);
            fetchInitialData();
            setSelectedCliente(null);
        }
    };

    const openModal = (cliente: Cliente | null) => {
        setEditingCliente(cliente);
        setNovoCliente({
            nome: cliente?.nome || "",
            telefone: cliente?.telefone || "",
            email: cliente?.email || "",
            observacoes: cliente?.observacoes || ""
        });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingCliente(null);
        setNovoCliente({ nome: "", telefone: "", email: "", observacoes: "" });
    };

    const getReturnDateColor = (days: number) => { if (days < 0) return 'text-red-500 dark:text-red-400'; if (days <= alertDays) return 'text-yellow-500 dark:text-yellow-400'; return 'text-green-500 dark:text-green-400'; };
    
    const handleCopyPhone = (phone: string | undefined) => { if (phone) navigator.clipboard.writeText(phone).then(() => { setCopiedPhone(phone); setTimeout(() => setCopiedPhone(null), 2000); }); };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Clientes</h2>
                    <button onClick={() => openModal(null)} className="flex items-center text-sm button-primary py-1 px-3">
                        <PlusCircle size={16} className="mr-2"/>Novo
                    </button>
                </div>
                <ul className="space-y-2 overflow-y-auto">
                    {clientes.map(c => (
                        <li key={c.id} onClick={() => handleSelectCliente(c)} className={`p-3 rounded-md cursor-pointer flex justify-between items-center ${selectedCliente?.cliente.id === c.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            <div><p className="font-semibold">{c.nome}</p><p className="text-xs text-gray-500">{c.telefone}</p></div>
                            {clientsWithAlerts.has(c.id) && <Bell size={16} className="text-yellow-500 animate-pulse" />}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow overflow-y-auto">
                {selectedCliente ? (
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedCliente.cliente.nome}</h2>
                                <p className="text-sm text-gray-500">{selectedCliente.cliente.email}</p>
                                {selectedCliente.cliente.telefone && (
                                    <div onClick={() => handleCopyPhone(selectedCliente.cliente.telefone)} className="mt-1 flex items-center gap-2 text-sm text-gray-500 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                        {copiedPhone === selectedCliente.cliente.telefone ? (
                                            <><Check size={14} className="text-green-500" /><span className="text-green-500 font-medium">Copiado!</span></>
                                        ) : (
                                            <><Copy size={14} /><span>{selectedCliente.cliente.telefone}</span></>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => handleToggleAlerts(selectedCliente.cliente)} className="button-icon" title={selectedCliente.cliente.alertas_ativos ? "Desativar alertas" : "Ativar alertas"}>
                                    {selectedCliente.cliente.alertas_ativos ? <Bell size={18}/> : <BellOff size={18} className="text-gray-400"/>}
                                </button>
                                <button onClick={() => openModal(selectedCliente.cliente)} className="button-icon"><Edit size={18}/></button>
                                <button onClick={() => handleDeleteCliente(selectedCliente.cliente.id)} className="button-icon-danger"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        {previsaoDeRetorno.length > 0 && (
                            <div className="mb-8"><h3 className="font-bold mb-4 flex items-center gap-2"><Bell size={18}/> Próximos Serviços Recomendados</h3><div className="space-y-3">
                                {previsaoDeRetorno.map((previsao, index) => (
                                    <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/30 rounded-md flex justify-between items-center">
                                        <div><p className="font-semibold text-blue-800 dark:text-blue-200">{previsao.serviceName}</p><p className="text-xs text-gray-500">Última visita: {previsao.lastVisit.toLocaleDateString('pt-BR')}</p></div>
                                        <div className="text-right"><p className={`font-bold text-sm ${getReturnDateColor(previsao.daysUntilReturn)}`}>{previsao.returnDate.toLocaleDateString('pt-BR')}</p><p className={`text-xs ${getReturnDateColor(previsao.daysUntilReturn)}`}>{previsao.daysUntilReturn < 0 ? `Vencido há ${Math.abs(previsao.daysUntilReturn)} dias` : `Em ${previsao.daysUntilReturn} dias`}</p></div>
                                    </div>
                                ))}
                            </div></div>
                        )}
                        <h3 className="font-bold mb-4 flex items-center gap-2"><Clock size={18}/> Histórico de Atendimentos</h3><ul className="space-y-3">
                            {selectedCliente.agendamentos.map((ag, index) => (
                                <li key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                    <div className="flex justify-between items-start">
                                        <div><p className="font-semibold">{new Date(ag.data_inicio).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'})}</p><p className="text-sm text-gray-600 dark:text-gray-300">{(ag.servicos_selecionados || []).map(s => s.nome).join(', ')}</p></div>
                                        {ag.status === 'concluido' && ag.valor_final_pago && (
                                            <div className="text-right flex-shrink-0 ml-4"><p className="font-semibold text-sm text-green-600 dark:text-green-400">R$ {ag.valor_final_pago.toFixed(2)}</p><p className="text-xs text-gray-500 flex items-center justify-end gap-1"><CreditCard size={12}/> {ag.metodo_pagamento}</p></div>
                                        )}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="flex h-full flex-col items-center justify-center text-gray-500"><User size={48} className="mb-4"/><p>Selecione um cliente para ver os detalhes</p></div>
                )}
            </div>
            
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h2><button onClick={closeModal}><X size={24} /></button></div>
                        <form onSubmit={handleSaveCliente} className="p-6 space-y-4">
                            <div><label className="block text-sm">Nome</label><input type="text" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} className="mt-1 w-full input-style" required /></div>
                            <div><label className="block text-sm">Telefone</label><input type="tel" value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})} className="mt-1 w-full input-style" /></div>
                            <div><label className="block text-sm">E-mail</label><input type="email" value={novoCliente.email} onChange={e => setNovoCliente({...novoCliente, email: e.target.value})} className="mt-1 w-full input-style" /></div>
                            <div><label className="block text-sm">Observações</label><textarea value={novoCliente.observacoes} onChange={e => setNovoCliente({...novoCliente, observacoes: e.target.value})} rows={3} className="mt-1 w-full input-style"></textarea></div>
                            <div className="pt-4 flex justify-end"><button type="submit" className="button-primary">Salvar</button></div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clientes;