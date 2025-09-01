import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900 text-center">
      <h1 className="text-6xl font-bold text-gray-800 dark:text-white">404</h1>
      <p className="text-xl mt-4 text-gray-600 dark:text-gray-400">Página não encontrada.</p>
      <p className="mt-2 text-gray-500 dark:text-gray-500">A página que você está procurando não existe ou foi movida.</p>
      <Link
        to="/"
        className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
      >
        Voltar para o Início
      </Link>
    </div>
  );
}

