import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { LayoutDashboard, Calendar, DollarSign, Wrench, Users, LogOut, X } from 'lucide-react'; // NOVO: Ícone X

// NOVO: Definindo as props que o componente receberá
interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar = ({ isOpen, setIsOpen }: SidebarProps) => { // ALTERADO: Recebendo as props
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };
  
  // NOVO: Função para fechar o sidebar ao clicar em um link (melhora a UX no mobile)
  const handleLinkClick = () => {
    if (isOpen) {
      setIsOpen(false);
    }
  };

  const navLinks = [
    { icon: LayoutDashboard, text: 'Dashboard', to: '/' },
    { icon: Calendar, text: 'Agenda', to: '/agenda' },
    { icon: DollarSign, text: 'Caixa', to: '/caixa' },
    { icon: Users, text: 'Clientes', to: '/clientes' },
    { icon: Wrench, text: 'Serviços', to: '/servicos' },
  ];

  const activeLinkClasses = "bg-indigo-600 text-white";
  const inactiveLinkClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";

  return (
    // ALTERADO: Classes para responsividade e transição
    <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transform ${isOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:flex-shrink-0`}>
      {/* ALTERADO: Adicionado botão de fechar para mobile */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Axis</h1>
        <button onClick={() => setIsOpen(false)} className="md:hidden text-gray-500 hover:text-gray-700">
            <X size={24} />
        </button>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map((link, index) => (
          <NavLink
            key={index}
            to={link.to}
            end={link.to === '/'}
            onClick={handleLinkClick} // NOVO: Fecha o menu ao navegar
            className={({ isActive }) => 
              `flex items-center space-x-3 px-4 py-2.5 rounded-lg transition-colors duration-200 ${isActive ? activeLinkClasses : inactiveLinkClasses}`
            }
          >
            <link.icon size={20} />
            <span className="font-medium">{link.text}</span>
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-3 px-4 py-2.5 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;