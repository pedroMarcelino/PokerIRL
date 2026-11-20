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

O frontend usa `apps/web/.env.example` como referencia (`VITE_API_URL`, `VITE_WS_URL`). Se essas variaveis nao existirem, ele cai nos enderecos locais padrao.

## Docker (subir tudo de uma vez)

```bash
docker compose up -d --build
```

- Site: http://localhost:5173
- API: http://localhost:3000/health

O Compose lê `apps/server/.env` do host e injeta as variáveis no container em runtime — o `.env` **não** entra na imagem. As URLs do front (`VITE_API_URL`, `VITE_WS_URL`) são build args: se mudar, rode `docker compose up -d --build web`.

Para desligar: `docker compose down`. Para ver logs: `docker compose logs -f`.

## Telas

- `/` — escolher entre criar e entrar
- `/criar` — nome do dealer, fichas iniciais (500 / 1000 / 2000 ou livre) e modo da sala (com vez ou sem sequência)
- `/entrar` — codigo de 6 digitos ou link colado + nome
- `/r/:code` — sala com pote, apostas, fichas de todos, fichas que somam + input de valor e colinha visual

Documentacao completa: [`docs/README.md`](docs/README.md).
