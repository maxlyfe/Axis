import { Session } from "@supabase/supabase-js";
import { supabase } from "../../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

interface HeaderProps {
  session: Session | null;
}

const Header = ({ session }: HeaderProps) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div>
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
              <span>Sair</span>
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

