# PokerIRL

Fichas online para um jogo de poker com cartas **100% fisicas**. O site nao distribui cartas: ele apenas controla saldo, apostas, pote e mostra a colinha de maos de poker com cartas ilustrativas.

## Estado atual

- [x] Documentacao de produto em `docs/`
- [x] Monorepo (npm workspaces)
- [x] Backend: salas, jogadores, apostas, ordem de jogo e fechamento de rodada
- [x] Frontend React: entrar, apostar, acompanhar o pote e encerrar rodada
- [ ] Deploy

## Estrutura

```
pokerirl/
├── apps/
│   ├── server/     # API + WebSocket (Node, Fastify, MongoDB)
│   └── web/        # React + Vite (mobile-first)
├── packages/
│   └── shared/     # tipos, valores das fichas, colinha de poker
└── docs/           # memorias e decisoes do projeto
```

## Como rodar

```bash
npm install
npm test
npm run dev:server   # API em http://localhost:3000
npm run dev:web      # site em http://localhost:5173
```

O servidor usa `apps/server/.env`. Por padrao, sem esse arquivo, ele roda com banco em memoria (`DB_DRIVER=memory`). Com o `.env` preenchido ele conecta no Atlas; na subida aparece `[startup] banco=mongodb database=...`.

O frontend chama sempre `/api` e `/api/ws` no mesmo domínio. No dev, o Vite faz proxy desses caminhos para `http://localhost:3000`; não há URL de API gravada no bundle.

## Docker (subir tudo de uma vez)

```bash
docker compose up -d --build
```

- Site: http://localhost:5173 (o nginx encaminha `/api` e `/api/ws` para a API)
- API direta: http://localhost:3000/health

O Compose lê `apps/server/.env` do host e injeta as variáveis no container em runtime — o `.env` **não** entra na imagem.

Para desligar: `docker compose down`. Para ver logs: `docker compose logs -f`.

## Vercel (dois serviços, um domínio)

O `vercel.json` declara os serviços `server` (Fastify) e `web` (Vite). O roteamento público é:

- `/api/*` → serviço `server` (inclui `/api/health` e `/api/ws`)
- todo o resto → serviço `web` (SPA com fallback para `index.html`)

Variáveis de ambiente obrigatórias no projeto da Vercel:

- `DB_DRIVER=mongodb`
- `MONGODB_URI` e `MONGODB_DB` — mesma conta usada hoje pelo `.env` local
- `CORS_ORIGIN` é opcional (as chamadas são no mesmo domínio)

Não use `DB_DRIVER=memory` na Vercel: cada instância teria seu próprio estado. O broadcast do WebSocket também é local à instância; para salas com jogadores em instâncias diferentes é preciso adicionar um pub/sub externo.

Para testar localmente com as mesmas rotas: `npx vercel dev --local`.

## Telas

- `/` — escolher entre criar e entrar
- `/criar` — nome do dealer, fichas iniciais (500 / 1000 / 2000 ou livre) e modo da sala (com vez ou sem sequência)
- `/entrar` — codigo de 6 digitos ou link colado + nome
- `/r/:code` — sala com pote, apostas, fichas de todos, fichas que somam + input de valor e colinha visual

Documentacao completa: [`docs/README.md`](docs/README.md).
