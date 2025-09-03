import { useState, useEffect, FormEvent, useContext } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App";
import { Trash2, Edit, X } from 'lucide-react'; // NOVO: Importa o ícone X

interface Service {
  id: number;
  nome: string;
  preco: number;
  duracao_minutos: number;
  descricao: string;
}

const Servicos = () => {
  const session = useContext(SessionContext);
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({
    nome: "",
    preco: "",
    duracao_minutos: "",
    descricao: "",
  });
  
  // --- NOVOS ESTADOS PARA O MODAL DE EDIÇÃO ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  // --- FIM DOS NOVOS ESTADOS ---

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
      console.error("Erro ao buscar serviços:", error);
      setError("Não foi possível carregar os serviços.");
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÃO DE SUBMISSÃO ALTERADA PARA LIDAR COM CRIAÇÃO E EDIÇÃO ---
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError("Sua sessão expirou. Por favor, faça login novamente.");
      return;
    }
    
    const serviceData = {
        nome: newService.nome,
        preco: parseFloat(newService.preco),
        duracao_minutos: parseInt(newService.duracao_minutos),
        descricao: newService.descricao,
        user_id: session.user.id,
    };

    try {
      setError(null);
      
      if (editingService) {
        // Lógica de ATUALIZAÇÃO
        const { data, error } = await supabase
          .from("servicos")
          .update(serviceData)
          .eq('id', editingService.id)
          .select()
          .single();
        
        if (error) throw error;

        setServices(services.map(s => s.id === editingService.id ? data : s));
        closeModal();

      } else {
        // Lógica de INSERÇÃO (original)
        const { data, error } = await supabase
          .from("servicos")
          .insert([serviceData])
          .select()
          .single();

        if (error) throw error;

        if(data) {
          setServices(prevServices => [...prevServices, data].sort((a,b) => a.nome.localeCompare(b.nome)));
        }
        
        setNewService({ nome: "", preco: "", duracao_minutos: "", descricao: "" });
      }
    } catch (error: any) {
      console.error("Erro ao salvar serviço:", error);
      setError("Falha ao salvar o serviço. Verifique os dados.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Tem certeza que deseja apagar este serviço?")) {
        return;
    }
    try {
        setError(null);
        const { error } = await supabase
            .from('servicos')
            .delete()
            .match({ id: id });

        if (error) throw error;

        setServices(services.filter(service => service.id !== id));
    } catch (error: any) {
        console.error("Erro ao apagar serviço:", error);
        setError("Não foi possível apagar o serviço.");
    }
  };

  // --- NOVAS FUNÇÕES PARA CONTROLAR O MODAL ---
  const openEditModal = (service: Service) => {
    setEditingService(service);
    setNewService({
        nome: service.nome,
        preco: String(service.preco),
        duracao_minutos: String(service.duracao_minutos),
        descricao: service.descricao || "",
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingService(null);
    setNewService({ nome: "", preco: "", duracao_minutos: "", descricao: "" });
  };
  // --- FIM DAS NOVAS FUNÇÕES ---

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Coluna do Formulário de Adicionar */}
        <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Adicionar Novo Serviço</h2>
          {/* O formulário de criação agora usa a mesma função handleSubmit, mas sem `editingService` definido */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Serviço</label>
              <input type="text" id="nome" value={newService.nome} onChange={(e) => setNewService({ ...newService, nome: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                  <label htmlFor="preco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                  <input type="number" id="preco" step="0.01" min="0" value={newService.preco} onChange={(e) => setNewService({ ...newService, preco: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
              </div>
              <div>
                  <label htmlFor="duracao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duração (min)</label>
                  <input type="number" id="duracao" min="0" value={newService.duracao_minutos} onChange={(e) => setNewService({ ...newService, duracao_minutos: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
              </div>
            </div>
            <div>
              <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
              <textarea id="descricao" value={newService.descricao} onChange={(e) => setNewService({ ...newService, descricao: e.target.value })} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
            </div>
            <button type="submit" className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800">
              Salvar Serviço
            </button>
          </form>
          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
        </div>

        {/* Coluna da Lista */}
        <div className="md:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Serviços Cadastrados</h2>
          <div className="overflow-x-auto">
            {loading ? (
              <p>Carregando serviços...</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                  {services.length > 0 ? services.map(service => (
                      <li key={service.id} className="py-4 flex justify-between items-center">
                          <div>
                              <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{service.nome}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">R$ {service.preco.toFixed(2)} - {service.duracao_minutos} min</p>
                          </div>
                          <div className="flex items-center space-x-2">
                             {/* BOTÃO DE EDITAR ALTERADO */}
                             <button onClick={() => openEditModal(service)} className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-full" title="Editar serviço">
                               <Edit size={18} />
                             </button>
                             <button onClick={() => handleDelete(service.id)} className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-full" title="Apagar serviço">
                               <Trash2 size={18} />
                             </button>
                          </div>
                      </li>
                  )) : <p className="text-gray-500 dark:text-gray-400">Nenhum serviço cadastrado ainda.</p>}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* --- NOVO MODAL DE EDIÇÃO --- */}
      {isModalOpen && editingService && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold">Editar Serviço</h2>
                    <button onClick={closeModal}><X size={24} /></button>
                </div>
                {/* O formulário do modal reutiliza a função handleSubmit */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div>
                        <label htmlFor="edit-nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Serviço</label>
                        <input type="text" id="edit-nome" value={newService.nome} onChange={(e) => setNewService({ ...newService, nome: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="edit-preco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                            <input type="number" id="edit-preco" step="0.01" min="0" value={newService.preco} onChange={(e) => setNewService({ ...newService, preco: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                        </div>
                        <div>
                            <label htmlFor="edit-duracao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duração (min)</label>
                            <input type="number" id="edit-duracao" min="0" value={newService.duracao_minutos} onChange={(e) => setNewService({ ...newService, duracao_minutos: e.target.value })} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
                        </div>
                    </div>
                    <div>
                        <label htmlFor="edit-descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
                        <textarea id="edit-descricao" value={newService.descricao} onChange={(e) => setNewService({ ...newService, descricao: e.target.value })} rows={3} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"></textarea>
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={closeModal} className="bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-gray-200 py-2 px-4 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500">Cancelar</button>
                        <button type="submit" className="bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700">Salvar Alterações</button>
                    </div>
                </form>
            </div>
        </div>
      )}
    </>
  );
};

export default Servicos;