# 🎫 Ticket Bot Dashboard

Dashboard web moderno para gerenciamento de tickets do Discord, construído com Next.js 16 e integrado com bot Discord.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?style=flat-square&logo=tailwind-css)

## ⚠️ Requisito Obrigatório

Este dashboard **requer** o bot Discord para funcionar. O site se comunica diretamente com a API do bot para buscar e gerenciar todos os dados.

👉 **[Ticket Bot - Repositório do Bot](https://github.com/tsvn27/ticket-bot)**

O bot é completo e inclui:
- Sistema de tickets com painéis personalizáveis
- Múltiplas opções de categorias por painel
- Sistema de transcripts automático
- Avaliação de atendimento
- Ranking de atendentes
- Logs detalhados
- E muito mais!

## ✨ Funcionalidades

- **Dashboard Completo** - Estatísticas em tempo real, gráficos e métricas
- **Gerenciamento de Tickets** - Visualizar, filtrar e acompanhar todos os tickets
- **Sistema de Transcripts** - Histórico completo de mensagens de cada ticket
- **Painéis Configuráveis** - Criar e editar painéis de tickets com múltiplas opções
- **Ranking de Atendentes** - Acompanhar performance da equipe de suporte
- **Logs de Atividade** - Histórico detalhado de todas as ações
- **Autenticação Discord** - Login seguro via OAuth2
- **Sincronização em Tempo Real** - Dados atualizados automaticamente com o bot

### Dashboard Principal
- Cards de estatísticas com sparklines
- Gráfico de tickets por dia (semana/mês)
- Top 3 atendentes do mês
- Tickets recentes com acesso rápido

### Gerenciamento de Tickets
- Tabela com filtros (todos/abertos/fechados)
- Visualização de transcripts
- Download de histórico

### Editor de Painéis
- Configurações gerais (nome, modo, categoria)
- Opções de ticket (até 25)
- Mensagens personalizadas
- Horário de atendimento
- Preferências (transcripts, DM, avaliação, auto-close)
- Estilos de exibição (botões/select)
- Integração com IA

## 🚀 Instalação

### Pré-requisitos

- Node.js 18+
- pnpm (recomendado) ou npm
- Bot Discord configurado e rodando
- MongoDB Atlas (compartilhado com o bot)

### 1. Clone o repositório

```bash
git clone https://github.com/tsvn27/ticket-dashboard.git
cd ticket-dashboard
```

### 2. Instale as dependências

```bash
pnpm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
# Bot API (seu bot Discord)
BOT_API_URL=http://localhost:3001
API_SECRET=sua_chave_secreta

# Discord OAuth2
DISCORD_CLIENT_ID=seu_client_id
DISCORD_CLIENT_SECRET=seu_client_secret
DISCORD_REDIRECT_URI=http://localhost:3000/api/auth/callback

# Guild ID do servidor Discord
GUILD_ID=seu_guild_id

# (Opcional) ID do dono do dashboard - deixe vazio para permitir qualquer usuário autenticado
DASHBOARD_OWNER_ID=
```

### 4. Configure o Discord OAuth2

1. Acesse o [Discord Developer Portal](https://discord.com/developers/applications)
2. Selecione sua aplicação (ou crie uma nova)
3. Vá em **OAuth2** > **General**
4. Adicione a Redirect URI: `http://localhost:3000/api/auth/callback`
5. Copie o **Client ID** e **Client Secret**

### 5. Inicie o servidor de desenvolvimento

```bash
pnpm dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## 🔧 Configuração do Bot

O dashboard se comunica com o bot através de uma API REST. O bot precisa expor os seguintes endpoints:

### Endpoints Necessários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/tickets` | Lista todos os tickets |
| GET | `/tickets/:id/transcript` | Retorna transcript do ticket |
| GET | `/panels` | Lista todos os painéis |
| GET | `/panels/:id` | Detalhes de um painel |
| PUT | `/panels/:id` | Atualiza um painel |
| POST | `/panels` | Cria novo painel |
| DELETE | `/panels/:id` | Remove um painel |
| GET | `/attendants` | Lista atendentes |
| GET | `/logs` | Lista logs de atividade |
| GET | `/settings` | Configurações gerais |
| PUT | `/settings` | Atualiza configurações |
| GET | `/stats` | Estatísticas gerais |

### Autenticação da API

Todas as requisições devem incluir o header:
```
X-API-Secret: sua_chave_secreta
```

### Estrutura do Transcript

O bot deve salvar transcripts no MongoDB antes de deletar o canal:

```javascript
// Coleção: transcripts
{
  channelId: "123456789",
  ticketId: 1,
  messages: [
    {
      id: "msg_id",
      author: {
        id: "user_id",
        username: "usuario",
        displayName: "Nome",
        avatar: "url_avatar",
        bot: false
      },
      content: "Mensagem",
      timestamp: "2024-01-01T00:00:00.000Z",
      attachments: [],
      embeds: []
    }
  ],
  savedAt: Date.now()
}
```

## 📁 Estrutura do Projeto

```
ticket-dashboard/
├── app/
│   ├── api/                    # Rotas da API
│   │   ├── auth/               # Autenticação Discord
│   │   ├── attendants/         # Atendentes
│   │   ├── logs/               # Logs
│   │   ├── panels/             # Painéis
│   │   ├── settings/           # Configurações
│   │   ├── stats/              # Estatísticas
│   │   └── tickets/            # Tickets
│   ├── atendentes/             # Página de atendentes
│   ├── configuracoes/          # Página de configurações
│   ├── login/                  # Página de login
│   ├── logs/                   # Página de logs
│   ├── paineis/                # Páginas de painéis
│   ├── tickets/                # Página de tickets
│   ├── layout.tsx              # Layout principal
│   └── page.tsx                # Dashboard
├── components/
│   ├── dashboard/              # Componentes do dashboard
│   │   ├── header.tsx          # Header com busca
│   │   ├── sidebar.tsx         # Menu lateral
│   │   ├── stat-card.tsx       # Cards de estatísticas
│   │   ├── weekly-chart.tsx    # Gráfico semanal
│   │   ├── top-attendants.tsx  # Ranking de atendentes
│   │   ├── recent-tickets.tsx  # Tickets recentes
│   │   └── transcript-modal.tsx # Modal de transcript
│   └── ui/                     # Componentes UI (shadcn)
├── hooks/
│   ├── use-mobile.ts           # Hook para mobile
│   ├── use-realtime.ts         # Hook de conexão
│   └── use-toast.ts            # Hook de notificações
├── lib/
│   ├── auth.ts                 # Funções de autenticação
│   └── utils.ts                # Utilitários
└── middleware.ts               # Middleware de autenticação
```

## 🎨 Tecnologias

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind CSS 4
- **Componentes**: shadcn/ui + Radix UI
- **Gráficos**: Recharts
- **Ícones**: Lucide React
- **Autenticação**: Discord OAuth2
- **Validação**: Zod

## 🔐 Segurança

- Autenticação via Discord OAuth2
- Sessões HTTP-only cookies
- Validação de permissões por usuário
- API protegida por secret key
- Middleware de proteção de rotas

## 📝 Scripts

```bash
pnpm dev      # Servidor de desenvolvimento
pnpm build    # Build de produção
pnpm start    # Iniciar produção
pnpm lint     # Verificar código
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

