import { useSettings } from '../contexts/SettingsContext';
import { Sun, Moon, Monitor, Bell } from 'lucide-react';

const Configuracoes = () => {
  const { theme, setTheme, alertDays, setAlertDays } = useSettings();

  const handleAlertDaysChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value === '' ? 0 : parseInt(e.target.value, 10);
    setAlertDays(value);
  };

  const getThemeButtonClass = (buttonTheme: 'light' | 'dark' | 'system') => {
    return `flex-1 p-3 rounded-lg flex items-center justify-center gap-2 transition-colors ${
      theme === buttonTheme
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
    }`;
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Configurações</h1>

      {/* Seção de Aparência */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Aparência</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Escolha como o Axis deve aparecer para você.
        </p>
        <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
          <button onClick={() => setTheme('light')} className={getThemeButtonClass('light')}>
            <Sun size={18} /> Claro
          </button>
          <button onClick={() => setTheme('dark')} className={getThemeButtonClass('dark')}>
            <Moon size={18} /> Escuro
          </button>
          <button onClick={() => setTheme('system')} className={getThemeButtonClass('system')}>
            <Monitor size={18} /> Sistema
          </button>
        </div>
      </div>

      {/* Seção de Alertas */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
        <h2 className="text-xl font-bold mb-4">Alertas</h2>
        <div className="flex items-center gap-4">
            <Bell className="text-indigo-500" size={24}/>
            <div>
                <label htmlFor="alert-days" className="block font-medium text-gray-700 dark:text-gray-300">
                    Notificar retorno do cliente com
                </label>
                <div className="flex items-center gap-2 mt-1">
                    <input
                        type="number"
                        id="alert-days"
                        value={alertDays}
                        onChange={handleAlertDaysChange}
                        className="w-20 p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                        min="0"
                    />
                    <span className="text-gray-600 dark:text-gray-400">dias de antecedência.</span>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;