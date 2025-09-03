import { useState, useEffect, FormEvent, useContext } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App";
import { Trash2, Edit, X } from 'lucide-react';

interface Service {
  id: number;
  nome: string;
  preco: number;
  duracao_minutos: number;
  descricao: string;
  prazo_recorrencia_dias?: number; // NOVO CAMPO
}

const Servicos = () => {
  const session = useContext(SessionContext);
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({
    nome: "",
    preco: "",
    duracao_minutos: "",
    descricao: "",
    prazo_recorrencia_dias: "", // NOVO CAMPO
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchServicos();
  }, []);

  const fetchServicos = async () => {
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await supabase
        .from("servicos")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setServices(data || []);
    } catch (error: any) {
      setError("Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError("Sua sessão expirou.");
      return;
    }
    
    // ALTERADO: Incluído o novo campo
    const serviceData = {
        nome: newService.nome,
        preco: parseFloat(newService.preco),
        duracao_minutos: parseInt(newService.duracao_minutos),
        descricao: newService.descricao,
        // Converte para número ou null se estiver vazio
        prazo_recorrencia_dias: newService.prazo_recorrencia_dias ? parseInt(newService.prazo_recorrencia_dias) : null,
        user_id: session.user.id,
    };

    try {
      setError(null);
      if (editingService) {
        const { data, error } = await supabase.from("servicos").update(serviceData).eq('id', editingService.id).select().single();
        if (error) throw error;
        setServices(services.map(s => s.id === editingService.id ? data : s));
        closeModal();
      } else {
        const { data, error } = await supabase.from("servicos").insert([serviceData]).select().single();
        if (error) throw error;
        if(data) setServices(prev => [...prev, data].sort((a,b) => a.nome.localeCompare(b.nome)));
        setNewService({ nome: "", preco: "", duracao_minutos: "", descricao: "", prazo_recorrencia_dias: "" });
      }
    } catch (error: any) {
      setError("Falha ao salvar o serviço.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza?")) return;
    const { error } = await supabase.from('servicos').delete().match({ id: id });
    if (error) setError("Não foi possível apagar o serviço.");
    else setServices(services.filter(service => service.id !== id));
  };

  const openEditModal = (service: Service) => {
    setEditingService(service);
    setNewService({
        nome: service.nome,
        preco: String(service.preco),
        duracao_minutos: String(service.duracao_minutos),
        descricao: service.descricao || "",
        prazo_recorrencia_dias: service.prazo_recorrencia_dias ? String(service.prazo_recorrencia_dias) : "", // NOVO
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setNewService({ nome: "", preco: "", duracao_minutos: "", descricao: "", prazo_recorrencia_dias: "" });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Adicionar Novo Serviço</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium">Nome</label>
              <input type="text" id="nome" value={newService.nome} onChange={(e) => setNewService({ ...newService, nome: e.target.value })} className="input-style mt-1" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label htmlFor="preco" className="block text-sm font-medium">Preço (R$)</label>
                    <input type="number" id="preco" step="0.01" min="0" value={newService.preco} onChange={(e) => setNewService({ ...newService, preco: e.target.value })} className="input-style mt-1" required />
                </div>
                <div>
                    <label htmlFor="duracao" className="block text-sm font-medium">Duração (min)</label>
                    <input type="number" id="duracao" min="0" value={newService.duracao_minutos} onChange={(e) => setNewService({ ...newService, duracao_minutos: e.target.value })} className="input-style mt-1" required />
                </div>
            </div>
            {/* NOVO CAMPO NO FORMULÁRIO */}
            <div>
                <label htmlFor="recorrencia" className="block text-sm font-medium">Prazo de Recorrência (dias)</label>
                <input type="number" id="recorrencia" min="0" placeholder="Ex: 21" value={newService.prazo_recorrencia_dias} onChange={(e) => setNewService({ ...newService, prazo_recorrencia_dias: e.target.value })} className="input-style mt-1" />
            </div>
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium">Descrição</label>
              <textarea id="descricao" value={newService.descricao} onChange={(e) => setNewService({ ...newService, descricao: e.target.value })} rows={3} className="input-style mt-1"></textarea>
            </div>
            <button type="submit" className="w-full button-primary">Salvar Serviço</button>
          </form>
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>

        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Serviços Cadastrados</h2>
          <div className="overflow-x-auto">
            {loading ? <p>Carregando...</p> : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {services.map(service => (
                      <li key={service.id} className="py-4 flex justify-between items-center">
                          <div>
                              <p className="font-semibold">{service.nome}</p>
                              {/* ALTERADO: Exibe a recorrência */}
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                R$ {service.preco.toFixed(2)} - {service.duracao_minutos} min
                                {service.prazo_recorrencia_dias && <span className="ml-2 text-blue-500">(Retorno em {service.prazo_recorrencia_dias} dias)</span>}
                              </p>
                          </div>
                          <div className="flex items-center space-x-2">
                             <button onClick={() => openEditModal(service)} className="button-icon" title="Editar"><Edit size={18} /></button>
                             <button onClick={() => handleDelete(service.id)} className="button-icon-danger" title="Apagar"><Trash2 size={18} /></button>
                          </div>
                      </li>
                  ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      
      {/* O MODAL AGORA TAMBÉM TERÁ O NOVO CAMPO */}
      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">Editar Serviço</h2><button onClick={closeModal}><X size={24} /></button></div>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div><label htmlFor="edit-nome" className="block text-sm font-medium">Nome</label><input type="text" id="edit-nome" value={newService.nome} onChange={(e) => setNewService({ ...newService, nome: e.target.value })} className="input-style mt-1" required /></div>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label htmlFor="edit-preco" className="block text-sm font-medium">Preço (R$)</label><input type="number" id="edit-preco" step="0.01" min="0" value={newService.preco} onChange={(e) => setNewService({ ...newService, preco: e.target.value })} className="input-style mt-1" required /></div>
                        <div><label htmlFor="edit-duracao" className="block text-sm font-medium">Duração (min)</label><input type="number" id="edit-duracao" min="0" value={newService.duracao_minutos} onChange={(e) => setNewService({ ...newService, duracao_minutos: e.target.value })} className="input-style mt-1" required /></div>
                    </div>
                    {/* NOVO CAMPO NO MODAL */}
                    <div>
                        <label htmlFor="edit-recorrencia" className="block text-sm font-medium">Prazo de Recorrência (dias)</label>
                        <input type="number" id="edit-recorrencia" min="0" placeholder="Deixe em branco se não houver" value={newService.prazo_recorrencia_dias} onChange={(e) => setNewService({ ...newService, prazo_recorrencia_dias: e.target.value })} className="input-style mt-1" />
                    </div>
                    <div><label htmlFor="edit-descricao" className="block text-sm font-medium">Descrição</label><textarea id="edit-descricao" value={newService.descricao} onChange={(e) => setNewService({ ...newService, descricao: e.target.value })} rows={3} className="input-style mt-1"></textarea></div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={closeModal} className="button-secondary">Cancelar</button>
                        <button type="submit" className="button-primary">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
      )}
      {/* ADICIONEI ALGUNS ESTILOS GLOBAIS PARA REUTILIZAR OS BOTÕES E INPUTS. COLOQUE-OS NO SEU `index.css` OU AQUI DENTRO DA TAG <style> */}
      <style>{`
        .input-style { display: block; width: 100%; padding: 0.5rem 0.75rem; background-color: white; border: 1px solid #D1D5DB; border-radius: 0.375rem; }
        .dark .input-style { background-color: #374151; border-color: #4B5563; }
        .button-primary { background-color: #4f46e5; color: white; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
        .button-primary:hover { background-color: #4338ca; }
        .button-secondary { background-color: #E5E7EB; color: #1F2937; padding: 0.5rem 1rem; border-radius: 0.375rem; font-weight: 500; }
        .dark .button-secondary { background-color: #4B5563; color: #F9FAFB; }
        .button-icon { padding: 0.5rem; border-radius: 9999px; color: #6B7280; }
        .button-icon:hover { color: #4f46e5; background-color: #EEF2FF; }
        .dark .button-icon:hover { background-color: #312e81; }
        .button-icon-danger { padding: 0.5rem; border-radius: 9999px; color: #6B7280; }
        .button-icon-danger:hover { color: #DC2626; background-color: #FEF2F2; }
        .dark .button-icon-danger:hover { background-color: #7f1d1d; }
      `}</style>
    </>
  );
};

export default Servicos;