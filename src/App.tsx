import { useState, useEffect, createContext } from "react";
import { Session } from "@supabase/supabase-js";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { supabase } from "./lib/supabaseClient";

import Layout from "./components/layout/Layout";
import Dashboard from "./pages/Dashboard";
import Agenda from "./pages/Agenda";
import Caixa from "./pages/Caixa";
import Servicos from "./pages/Servicos";
import Login from "./pages/Login";
import NotFound from "./pages/NotFound";
import Clientes from "./pages/Clientes"; // NOVO IMPORT

export const SessionContext = createContext<Session | null>(null);

const ProtectedRoute = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-800 dark:text-gray-200">Carregando...</p>
      </div>
    );
  }

  return session ? <Layout /> : <Login />;
};


function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    };

    fetchSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100 dark:bg-gray-900">
        <p className="text-gray-800 dark:text-gray-200">Carregando...</p>
      </div>
    );
  }

  return (
    <SessionContext.Provider value={session}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={session ? <Dashboard /> : <Login />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/caixa" element={<Caixa />} />
            <Route path="/clientes" element={<Clientes />} /> {/* NOVA ROTA */}
            <Route path="/servicos" element={<Servicos />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </SessionContext.Provider>
  );
}

export default App;

