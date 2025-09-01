import { useContext } from "react";
import { Outlet } from "react-router-dom";
import { SessionContext } from "../../App"; // Importamos o Contexto do App.tsx
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = () => {
  // Usamos o hook useContext para ler a informação da sessão do nosso contexto global.
  const session = useContext(SessionContext);

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar />

      <div className="flex flex-col flex-1 overflow-y-auto">
        {/* Passamos a sessão para o Header para que ele saiba quem está logado */}
        <Header session={session} />
        
        <main className="p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;

