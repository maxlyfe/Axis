import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../../lib/supabaseClient";
import { LayoutDashboard, Calendar, DollarSign, Wrench, Users, LogOut } from 'lucide-react';

const Sidebar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const navLinks = [
    { icon: LayoutDashboard, text: 'Dashboard', to: '/' },
    { icon: Calendar, text: 'Agenda', to: '/agenda' },
    { icon: DollarSign, text: 'Caixa', to: '/caixa' },
    { icon: Users, text: 'Clientes', to: '/clientes' }, // NOVO LINK
    { icon: Wrench, text: 'Serviços', to: '/servicos' },
  ];

  const activeLinkClasses = "bg-indigo-600 text-white";
  const inactiveLinkClasses = "text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700";

  return (
    <aside className="w-64 bg-white dark:bg-gray-800 flex-shrink-0 border-r border-gray-200 dark:border-gray-700 flex flex-col">
      <div className="h-16 flex items-center justify-center border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Axis</h1>
      </div>
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navLinks.map((link, index) => (
          <NavLink
            key={index}
            to={link.to}
            end={link.to === '/'}
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

