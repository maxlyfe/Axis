import { useState, useContext } from "react"; // ALTERADO: Adicionado useState
import { Outlet } from "react-router-dom";
import { SessionContext } from "../../App";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = () => {
  const session = useContext(SessionContext);
  // NOVO: Estado para controlar a visibilidade do sidebar em telas pequenas
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    // A classe `relative` é necessária para o posicionamento do sidebar mobile
    <div className="relative flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 md:flex">
      {/* NOVO: Overlay para fechar o menu ao clicar fora */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      {/* ALTERADO: Passando o estado e a função para o Sidebar */}
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* ALTERADO: Passando a função para abrir o menu para o Header */}
        <Header session={session} onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;