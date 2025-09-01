Axis - Gestão de Salão
Axis é um aplicativo web completo para a gestão de salões de beleza, focando em agendamentos inteligentes e controle financeiro detalhado.

Funcionalidades Principais
Autenticação Segura: Login com e-mail/senha e Google, utilizando o Supabase Auth.

Gestão de Serviços: Cadastro de serviços com nome, preço, e duração padrão.

Agenda Inteligente:

Visualização de calendário mensal com indicadores visuais de horários.

Prevenção de conflitos de agendamento.

Flexibilidade para editar horários, clientes e duração dos serviços.

Fluxo de checkout para finalizar atendimentos.

Gestão de Clientes: Base de dados de clientes com histórico de atendimentos.

Controle de Caixa Completo:

Painel com saldos contínuos (Caixa Total, Conta, Dinheiro).

Resumo das movimentações do mês.

Registro e gerenciamento de despesas (com suporte a despesas recorrentes).

Registro de transferências entre caixa e conta.

Tecnologias Utilizadas
Frontend: React com Vite e TypeScript.

Estilização: Tailwind CSS para um design moderno e responsivo.

Backend e Banco de Dados: Supabase.

Gráficos: Recharts.

Como Rodar o Projeto Localmente
Clone o repositório:

git clone [https://github.com/maxlyfe/Axis.git](https://github.com/maxlyfe/Axis.git)
cd Axis

Instale as dependências:

npm install

Configure as variáveis de ambiente:

Crie um arquivo chamado .env na raiz do projeto.

Adicione suas chaves do Supabase, que você encontra no painel do seu projeto em "Settings" > "API".

VITE_SUPABASE_URL="SUA_URL_AQUI"
VITE_SUPABASE_ANON_KEY="SUA_CHAVE_ANON_AQUI"

Inicie o servidor de desenvolvimento:

npm run dev

O aplicativo estará disponível em http://localhost:5173 (ou a porta indicada no terminal).