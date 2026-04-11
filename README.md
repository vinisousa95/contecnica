# Contécnica — Sistema de Gestão de Reformas

Sistema web completo para gestão de uma pequena empresa de reformas.

## Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **UI**: Tailwind CSS + componentes próprios (shadcn/ui style)
- **Backend**: Next.js Route Handlers (API REST)
- **ORM**: Prisma
- **Banco**: PostgreSQL
- **Auth**: JWT (jose) + bcryptjs
- **Estado**: TanStack Query + Zustand
- **Forms**: React Hook Form + Zod
- **Charts**: Recharts

## Módulos

- **Dashboard** — visão geral operacional e financeira
- **Clientes** — cadastro, pesquisa, histórico de obras
- **Obras** — gestão completa com acompanhamento financeiro
- **Financeiro** — contas a pagar, a receber, fluxo de caixa
- **Relatórios** — análise gerencial por período, obra e cliente
- **Configurações** — usuários e categorias financeiras
- **App Sync** *(estrutura preparada)* — integração futura com app mobile

## Configuração

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar variáveis de ambiente
```bash
cp .env.example .env
# Edite .env com sua DATABASE_URL e JWT_SECRET
```

### 3. Configurar banco de dados
```bash
npm run db:push     # criar tabelas
npm run db:seed     # popular com dados de exemplo
```

### 4. Iniciar servidor de desenvolvimento
```bash
npm run dev
```

Acesse: http://localhost:3000

### Credenciais de teste
- **E-mail**: `admin@contecnica.com.br`
- **Senha**: `admin123`

## Estrutura de Pastas

```
contecnica/
├── app/
│   ├── (auth)/           # Páginas de login
│   ├── (dashboard)/      # Páginas autenticadas
│   │   ├── dashboard/
│   │   ├── clientes/
│   │   ├── obras/
│   │   ├── financeiro/
│   │   │   ├── despesas/
│   │   │   ├── receitas/
│   │   │   └── fluxo/
│   │   ├── relatorios/
│   │   └── configuracoes/
│   └── api/v1/           # API REST
│       ├── auth/
│       ├── clients/
│       ├── projects/
│       ├── expenses/
│       ├── revenues/
│       ├── categories/
│       ├── users/
│       ├── dashboard/
│       └── reports/
├── components/
│   ├── ui/               # Design system base
│   ├── layout/           # Sidebar, Header, etc.
│   ├── clients/          # Componentes de clientes
│   ├── projects/         # Componentes de obras
│   └── financial/        # Componentes financeiros
├── lib/
│   ├── prisma.ts         # Prisma client singleton
│   ├── auth.ts           # JWT utils
│   ├── utils.ts          # Utilitários gerais
│   ├── api-client.ts     # Client HTTP para o frontend
│   └── validations.ts    # Schemas Zod compartilhados
├── hooks/
│   └── use-toast.ts      # Sistema de notificações
├── prisma/
│   ├── schema.prisma     # Modelagem do banco
│   └── seed.ts           # Dados iniciais
└── middleware.ts         # Proteção de rotas JWT
```

## API Endpoints

| Método | Rota | Descrição |
|--------|------|-----------|
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Usuário logado |
| GET | `/api/v1/dashboard` | Dados do dashboard |
| GET/POST | `/api/v1/clients` | Listar/criar clientes |
| GET/PUT/DELETE | `/api/v1/clients/:id` | Detalhes/editar/excluir |
| GET/POST | `/api/v1/projects` | Listar/criar obras |
| GET/PUT/DELETE | `/api/v1/projects/:id` | Detalhes/editar/excluir |
| GET/POST | `/api/v1/expenses` | Contas a pagar |
| GET/PUT/DELETE | `/api/v1/expenses/:id` | |
| GET/POST | `/api/v1/revenues` | Contas a receber |
| GET/PUT/DELETE | `/api/v1/revenues/:id` | |
| GET/POST | `/api/v1/categories` | Categorias |
| GET/POST | `/api/v1/users` | Usuários |
| PUT/DELETE | `/api/v1/users/:id` | |
| GET | `/api/v1/reports/cashflow` | Fluxo de caixa |
| GET | `/api/v1/reports/projects` | Relatório por obra |

## Preparação para App Mobile (Futuro)

A tabela `app_submissions` já está modelada no banco e preparada para receber:
- Comprovantes de compras de funcionários
- Fotos de notas fiscais
- Workflow de aprovação (PENDING_APPROVAL → APPROVED/REJECTED)

Para integração mobile, criar:
1. Endpoint `POST /api/v1/submissions` para receber lançamentos
2. Endpoint `GET /api/v1/submissions` + `PUT /api/v1/submissions/:id/review` para admin
3. Autenticação via JWT (já preparada — mesma infra)
4. Endpoints de upload para anexos/imagens

## Deploy

### Vercel (recomendado)
1. Criar projeto no Vercel
2. Configurar variáveis de ambiente
3. Configurar PostgreSQL (Supabase, Railway ou Neon)
4. `git push` — deploy automático

### Docker (auto-hospedado)
```bash
docker build -t contecnica .
docker run -p 3000:3000 --env-file .env contecnica
```
