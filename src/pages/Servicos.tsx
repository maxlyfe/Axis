import { useState, useEffect, FormEvent, useContext } from "react";
import { supabase } from "../lib/supabaseClient";
import { SessionContext } from "../App"; // Importamos o Contexto
import { Trash2, Edit } from 'lucide-react';

interface Service {
  id: number;
  nome: string;
  preco: number;
  duracao_minutos: number;
  descricao: string;
}

const Servicos = () => {
  // Lemos a sessão diretamente do Contexto global
  const session = useContext(SessionContext);

  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState({
    nome: "",
    preco: "",
    duracao_minutos: "",
    descricao: "",
  });
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

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      setError("Sua sessão expirou. Por favor, faça login novamente.");
      return;
    }
    
    try {
      setError(null);
      const { data, error } = await supabase
        .from("servicos")
        .insert([
          {
            nome: newService.nome,
            preco: parseFloat(newService.preco),
            duracao_minutos: parseInt(newService.duracao_minutos),
            descricao: newService.descricao,
            user_id: session.user.id,
          },
        ])
        .select()
        .single(); // .single() é mais eficiente aqui

      if (error) throw error;

      if(data) {
        setServices(prevServices => [...prevServices, data]);
      }
      
      setNewService({ nome: "", preco: "", duracao_minutos: "", descricao: "" });
    } catch (error: any) {
      console.error("Erro ao adicionar serviço:", error);
      setError("Falha ao adicionar o serviço. Verifique os dados.");
    }
  };

  const handleDelete = async (id: number) => {
    // Usaremos um modal customizado no futuro, por enquanto o confirm é funcional.
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
  }


  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Coluna do Formulário */}
      <div className="md:col-span-1 bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-gray-100">Adicionar Novo Serviço</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nome" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome do Serviço</label>
            <input
              type="text"
              id="nome"
              value={newService.nome}
              onChange={(e) => setNewService({ ...newService, nome: e.target.value })}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
                <label htmlFor="preco" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Preço (R$)</label>
                <input
                type="number"
                id="preco"
                step="0.01"
                min="0"
                value={newService.preco}
                onChange={(e) => setNewService({ ...newService, preco: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                />
            </div>
            <div>
                <label htmlFor="duracao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duração (min)</label>
                <input
                type="number"
                id="duracao"
                min="0"
                value={newService.duracao_minutos}
                onChange={(e) => setNewService({ ...newService, duracao_minutos: e.target.value })}
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
                />
            </div>
          </div>
          <div>
            <label htmlFor="descricao" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Descrição</label>
            <textarea
              id="descricao"
              value={newService.descricao}
              onChange={(e) => setNewService({ ...newService, descricao: e.target.value })}
              rows={3}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            ></textarea>
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-gray-800"
          >
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
                            <p className="text-sm text-gray-600 dark:text-gray-400">R$ {service.preco} - {service.duracao_minutos} min</p>
                        </div>
                        <div className="flex items-center space-x-2">
                           <button className="text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 p-2 rounded-full" title="Editar (em breve)">
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
  );
};

export default Servicos;

