import { useState, useEffect, FormEvent, useContext } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App";
import { PlusCircle, Trash2, Edit, X, User, Clock } from "lucide-react";

// --- INTERFACES ---
interface Cliente {
    id: number;
    nome: string;
    telefone?: string;
    email?: string;
    observacoes?: string;
}

interface AgendamentoCliente {
    data_inicio: string;
    servicos_selecionados: { nome: string }[];
}

// --- COMPONENTE PRINCIPAL ---
const Clientes = () => {
    const session = useContext(SessionContext);
    const [clientes, setClientes] = useState<Cliente[]>([]);
    const [selectedCliente, setSelectedCliente] = useState<Cliente & { agendamentos: AgendamentoCliente[] } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
    const [novoCliente, setNovoCliente] = useState({ nome: "", telefone: "", email: "", observacoes: "" });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClientes();
    }, [session]);

    const fetchClientes = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('clientes').select('*').order('nome', { ascending: true });
        if (error) console.error("Erro ao buscar clientes", error);
        else setClientes(data || []);
        setLoading(false);
    };

    const handleSelectCliente = async (cliente: Cliente) => {
        const { data, error } = await supabase
            .from('agendamentos')
            .select('data_inicio, servicos_selecionados')
            .eq('cliente_id', cliente.id)
            .order('data_inicio', { ascending: false });
        
        setSelectedCliente({ ...cliente, agendamentos: data || [] });
    };
    
    const handleSaveCliente = async (e: FormEvent) => {
        e.preventDefault();
        const dataToSave = { ...novoCliente, user_id: session?.user.id };

        if (editingCliente) {
            await supabase.from('clientes').update(dataToSave).eq('id', editingCliente.id);
        } else {
            await supabase.from('clientes').insert([dataToSave]);
        }
        fetchClientes();
        closeModal();
    };

    const handleDeleteCliente = async (clienteId: number) => {
        if(window.confirm("Tem certeza que deseja apagar este cliente? Todos os agendamentos vinculados a ele perderão o vínculo.")) {
            await supabase.from('clientes').delete().eq('id', clienteId);
            fetchClientes();
            setSelectedCliente(null);
        }
    };

    const openModal = (cliente: Cliente | null) => {
        setEditingCliente(cliente);
        setNovoCliente(cliente ? { ...cliente, telefone: cliente.telefone || "" } : { nome: "", telefone: "", email: "", observacoes: "" });
        setIsModalOpen(true);
    };
    const closeModal = () => setIsModalOpen(false);

    if (loading) return <div>Carregando clientes...</div>;

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-[calc(100vh-120px)]">
            {/* Lista de Clientes */}
            <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold">Clientes</h2>
                    <button onClick={() => openModal(null)} className="flex items-center text-sm bg-indigo-600 text-white py-1 px-3 rounded-md hover:bg-indigo-700"><PlusCircle size={16} className="mr-2"/>Novo</button>
                </div>
                <ul className="space-y-2 overflow-y-auto">
                    {clientes.map(c => (
                        <li key={c.id} onClick={() => handleSelectCliente(c)} className={`p-3 rounded-md cursor-pointer ${selectedCliente?.id === c.id ? 'bg-indigo-100 dark:bg-indigo-900/50' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>
                            <p className="font-semibold">{c.nome}</p>
                            <p className="text-xs text-gray-500">{c.telefone}</p>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Detalhes do Cliente */}
            <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow overflow-y-auto">
                {selectedCliente ? (
                    <div>
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <h2 className="text-2xl font-bold">{selectedCliente.nome}</h2>
                                <p className="text-sm text-gray-500">{selectedCliente.email}</p>
                                <p className="text-sm text-gray-500">{selectedCliente.telefone}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => openModal(selectedCliente)} className="p-2 text-gray-500 hover:text-indigo-600"><Edit size={18}/></button>
                                <button onClick={() => handleDeleteCliente(selectedCliente.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={18}/></button>
                            </div>
                        </div>
                        
                        <h3 className="font-bold mt-8 mb-4 flex items-center gap-2"><Clock size={18}/> Histórico de Atendimentos</h3>
                        <ul className="space-y-3">
                            {selectedCliente.agendamentos.map((ag, index) => (
                                <li key={index} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                                    <p className="font-semibold">{new Date(ag.data_inicio).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-300">{(ag.servicos_selecionados || []).map(s => s.nome).join(', ')}</p>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : (
                    <div className="flex h-full items-center justify-center text-gray-500">
                        <User size={48} className="mb-4"/>
                        <p>Selecione um cliente para ver os detalhes</p>
                    </div>
                )}
            </div>
            
            {/* Modal de Adicionar/Editar Cliente */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md">
                        <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                            <h2 className="text-xl font-bold">{editingCliente ? 'Editar Cliente' : 'Novo Cliente'}</h2>
                            <button onClick={closeModal}><X size={24} /></button>
                        </div>
                        <form onSubmit={handleSaveCliente} className="p-6 space-y-4">
                            <div><label className="block text-sm">Nome</label><input type="text" value={novoCliente.nome} onChange={e => setNovoCliente({...novoCliente, nome: e.target.value})} className="mt-1 w-full input-style" required /></div>
                            <div><label className="block text-sm">Telefone</label><input type="tel" value={novoCliente.telefone} onChange={e => setNovoCliente({...novoCliente, telefone: e.target.value})} className="mt-1 w-full input-style" /></div>
                            <div><label className="block text-sm">E-mail</label><input type="email" value={novoCliente.email} onChange={e => setNovoCliente({...novoCliente, email: e.target.value})} className="mt-1 w-full input-style" /></div>
                            <div><label className="block text-sm">Observações</label><textarea value={novoCliente.observacoes} onChange={e => setNovoCliente({...novoCliente, observacoes: e.target.value})} rows={3} className="mt-1 w-full input-style"></textarea></div>
                            <div className="pt-4 flex justify-end">
                                <button type="submit" className="bg-indigo-600 text-white py-2 px-6 rounded-md hover:bg-indigo-700">Salvar</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clientes;