import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu } from "lucide-react"; // NOVO: Ícone Menu

interface HeaderProps {
  session: Session | null;
  onMenuClick: () => void; // NOVO: Prop para a função de clique
}

const Header = ({ session, onMenuClick }: HeaderProps) => { // ALTERADO: Recebendo a nova prop
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      {/* NOVO: Botão de Menu Hamburguer para telas pequenas */}
      <button onClick={onMenuClick} className="md:hidden text-gray-600 dark:text-gray-300">
        <Menu size={24} />
      </button>

      {/* Div vazia para manter o alinhamento à direita */}
      <div className="hidden md:block">
        {/* Futuramente, podemos adicionar o título da página aqui */}
      </div>

      <div className="flex items-center space-x-4">
        {session ? (
          <>
            <span className="text-sm text-gray-600 dark:text-gray-300 hidden sm:block">
              {session.user.email}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400"
            >
              <LogOut size={16} />
              {/* ALTERADO: Oculta o texto "Sair" em telas muito pequenas para economizar espaço */}
              <span className="hidden sm:inline">Sair</span>
            </button>
          </>
        ) : (
          <span className="text-sm text-gray-500">Não autenticado</span>
        )}
      </div>
    </header>
  );
};

export default Header;