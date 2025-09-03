import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { SettingsProvider } from './contexts/SettingsContext'; // NOVO

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {/* NOVO: Envolvemos o App com o nosso provedor */}
    <SettingsProvider>
      <App />
    </SettingsProvider>
  </React.StrictMode>,
);