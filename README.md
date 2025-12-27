# 🎫 Ticket Bot

Sistema de tickets completo para Discord com MongoDB e API REST integrada.

![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js)
![Discord.js](https://img.shields.io/badge/Discord.js-14-5865F2?style=flat-square&logo=discord)
![MongoDB](https://img.shields.io/badge/MongoDB-6+-47A248?style=flat-square&logo=mongodb)
![Fastify](https://img.shields.io/badge/Fastify-4-000000?style=flat-square&logo=fastify)

## 🌐 Dashboard Web (Opcional)

O bot funciona perfeitamente sozinho, mas se quiser uma experiência mais completa com interface visual, tem um dashboard web disponível:

👉 **[Ticket Dashboard - Repositório](https://github.com/tsvn27/ticket-dashboard)**

Com ele você consegue:
- Visualizar estatísticas e gráficos em tempo real
- Gerenciar tickets pelo navegador
- Ver transcripts completos
- Configurar painéis visualmente
- Acompanhar ranking de atendentes
- E muito mais!

## ✨ Funcionalidades

- **Sistema de Tickets** - Abertura, fechamento e gerenciamento completo
- **Múltiplos Painéis** - Até 10 painéis com opções personalizadas
- **Modo Canal/Thread** - Escolha entre criar canais ou threads
- **Transcripts** - Salva automaticamente o histórico no MongoDB
- **Avaliação** - Sistema de rating ao fechar tickets
- **Horário de Atendimento** - Configure dias e horários de funcionamento
- **Auto-Close** - Fecha tickets inativos automaticamente
- **Logs** - Registro de todas as ações no Discord e MongoDB
- **API REST** - Integração com dashboard via Fastify
- **WebSocket** - Atualizações em tempo real

## 📋 Requisitos

- Node.js 18+
- MongoDB Atlas (ou local)
- Bot Discord com intents habilitados

## 🚀 Instalação

### 1. Clone o repositório

```bash
git clone https://github.com/tsvn27/ticket-bot.git
cd ticket-bot
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure as variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto:

```env
DISCORD_TOKEN=seu_token_aqui
MONGODB_URI=mongodb+srv://usuario:senha@cluster.mongodb.net/tickets
GUILD_ID=id_do_servidor
API_SECRET=sua_chave_secreta
API_PORT=3001
```

### 4. Inicie o bot

```bash
npm start
```

## ⚙️ Variáveis de Ambiente

| Variável | Descrição |
|----------|-----------|
| `DISCORD_TOKEN` | Token do bot Discord |
| `MONGODB_URI` | URI de conexão MongoDB |
| `GUILD_ID` | ID do servidor Discord |
| `API_SECRET` | Chave secreta para API |
| `API_PORT` | Porta da API (padrão: 3001) |

## 🤖 Comandos

| Comando | Descrição |
|---------|-----------|
| `/painel` | Abre o gerenciador de painéis |
| `/botconfig` | Configurações do bot (nome, foto, status) |

## 📁 Estrutura do Projeto

```
ticket-bot/
├── src/
│   ├── api/                    # API REST (Fastify + WebSocket)
│   │   └── server.js
│   ├── commands/               # Comandos slash
│   │   ├── botconfig.js
│   │   └── panel.js
│   ├── database/               # MongoDB + Mongoose
│   │   ├── models/             # Schemas do banco
│   │   │   ├── Attendant.js
│   │   │   ├── DeployedPanel.js
│   │   │   ├── Log.js
│   │   │   ├── Panel.js
│   │   │   ├── Settings.js
│   │   │   ├── Ticket.js
│   │   │   └── Transcript.js
│   │   ├── compat.js           # Camada de compatibilidade
│   │   ├── connection.js
│   │   └── index.js
│   ├── events/                 # Eventos Discord
│   │   ├── interactionCreate.js
│   │   └── ready.js
│   ├── handlers/               # Loaders
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── modules/
│   │   ├── panel/              # Gerenciamento de painéis
│   │   │   ├── handlers.js
│   │   │   └── views.js
│   │   └── tickets/            # Sistema de tickets
│   │       ├── deploy.js
│   │       └── handlers.js
│   ├── utils/                  # Utilitários
│   │   ├── autoclose.js
│   │   ├── logger.js
│   │   ├── permissions.js
│   │   └── syncAttendants.js
│   ├── config.js
│   └── index.js
├── .env
├── package.json
└── README.md
```

## 🔌 API Endpoints

Todas as rotas (exceto `/health` e `/ws`) requerem header `X-API-Secret`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/health` | Status da API |
| GET | `/status` | Status do bot |
| GET | `/stats` | Estatísticas gerais |
| GET | `/panels` | Lista painéis |
| GET | `/panels/:id` | Detalhes do painel |
| POST | `/panels` | Criar painel |
| PUT | `/panels/:id` | Atualizar painel |
| DELETE | `/panels/:id` | Deletar painel |
| POST | `/deploy/:panelId` | Deploy do painel |
| GET | `/tickets` | Lista tickets |
| GET | `/tickets/:id/transcript` | Transcript do ticket |
| GET | `/attendants` | Lista atendentes |
| GET | `/logs` | Lista logs |
| GET | `/settings` | Configurações |
| PUT | `/settings` | Atualizar configurações |

### WebSocket

Conecte em `/ws?secret=SUA_API_SECRET` para receber eventos em tempo real.

**Eventos:**
- `connected` - Conexão estabelecida
- `db_change` - Mudança no banco de dados
- `pong` - Resposta ao ping

## 🗄️ Models MongoDB

### Panel

```javascript
{
  guildId: String,
  panelId: String,
  name: String,
  enabled: Boolean,
  mode: 'channel' | 'thread',
  options: [{ name, description }],
  categoryId: String,
  channelId: String,
  roles: { staff, admin },
  schedule: { enabled, open, close, closedDays, closedMessage },
  messages: Object,
  preferences: Object,
  ai: { enabled, useContext, instructions }
}
```

### Ticket

```javascript
{
  guildId: String,
  ticketId: Number,
  channelId: String,
  userId: String,
  panelId: String,
  optionIndex: Number,
  optionName: String,
  panelName: String,
  mode: String,
  status: 'open' | 'closed',
  claimedBy: String,
  priority: 'low' | 'medium' | 'high' | 'urgent',
  rating: Number,
  addedUsers: [String],
  voiceChannelId: String,
  createdAt: Date,
  closedAt: Date,
  closedBy: String,
  lastActivity: Date
}
```

### Transcript

```javascript
{
  guildId: String,
  channelId: String,
  ticketId: Number,
  userId: String,
  closedBy: String,
  messages: [{
    id: String,
    author: { id, username, displayName, avatar, bot },
    content: String,
    timestamp: String,
    attachments: [{ name, url, contentType }],
    embeds: [{ title, description, color }]
  }],
  messageCount: Number,
  savedAt: Date
}
```

### Log

```javascript
{
  guildId: String,
  type: String,
  ticketId: Number,
  channelId: String,
  userId: String,
  staffId: String,
  details: Object,
  timestamp: Date
}
```

### Settings

```javascript
{
  guildId: String,
  channels: { logs, category },
  roles: { staff, admin },
  preferences: Object,
  blacklist: [String]
}
```

## 🎨 Preferências do Painel

```javascript
preferences: {
  transcripts: Boolean,
  dmNotify: Boolean,
  rating: Boolean,
  autoCloseInactive: Boolean,
  autoCloseLeave: Boolean,
  autoCloseSchedule: Boolean,
  closeReason: Boolean,
  closeDM: Boolean,
  panelStyle: 'buttons' | 'select',
  staffPanelStyle: 'buttons' | 'select',
  memberPanelStyle: 'buttons' | 'select',
  memberSetupDisabled: [String],
  staffSetupDisabled: [String]
}
```

## 🚀 Deploy

### SquareCloud

O arquivo `squarecloud.app` já está configurado:

```
MAIN=src/index.js
MEMORY=512
VERSION=recommended
DISPLAY_NAME=Ticket Bot
```

### VPS/Docker

```bash
npm install --production
node src/index.js
```

## 📝 Scripts

```bash
npm start              # Iniciar o bot
npm run reset-db       # Resetar database (cuidado!)
```

## 🤝 Contribuindo

1. Fork o projeto
2. Crie sua branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT.
#   a  
 # a
