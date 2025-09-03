import { useState, useContext } from "react";
import { Outlet } from "react-router-dom";
import { SessionContext } from "../../App";
import Sidebar from "./Sidebar";
import Header from "./Header";

const Layout = () => {
  const session = useContext(SessionContext);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="relative flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 md:flex">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black opacity-50 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}

      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

      <div className="flex flex-col flex-1 overflow-y-auto">
        <Header session={session} onMenuClick={() => setIsSidebarOpen(true)} />
        
        <main className="p-6 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;