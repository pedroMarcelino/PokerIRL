# 02 — Arquitetura

> Status: rascunho revisado · Última atualização: 2026-11-20

## Monorepo

```
porkerirl/
├── apps/
│   ├── server/                 # API HTTP + WebSocket
│   │   └── src/
│   │       ├── index.ts        # bootstrap, conexão e shutdown
│   │       ├── app.ts          # fábrica do Fastify
│   │       ├── env.ts          # variáveis de ambiente validadas
│   │       ├── db/             # conexão MongoDB
│   │       ├── domain/         # regras de negócio (sem framework)
│   │       ├── repositories/   # persistência (MongoDB e memória)
│   │       ├── realtime/       # WebSocket
│   │       └── routes/         # rotas HTTP
│   └── web/                    # React + Vite (mobile-first)
│       └── src/
│           ├── api.ts          # fetch + token Bearer
│           ├── socket.ts       # WebSocket com reconexão
│           ├── storage.ts      # sessão por sala no localStorage
│           ├── hooks/          # useRoom
│           ├── pages/          # início, criar, entrar, sala
│           └── components/     # pote, jogadores, apostas, colinha
├── packages/
│   └── shared/                 # tipos, fichas, colinha, eventos
└── docs/
```

As telas são `/`, `/criar`, `/entrar` e `/r/:code` — o QR code aponta direto para `/r/:code`.

Escolhemos **npm workspaces** porque o npm já vem com o Node instalado aqui (pnpm não estava disponível). Se o pnpm entrar depois, a migração é pequena.

## Stack

| Camada | Escolha | Motivo |
| --- | --- | --- |
| Linguagem | TypeScript | Contrato único com o front |
| Servidor HTTP | Fastify | Leve, validação e logs prontos |
| WebSocket | `ws` | Apenas broadcast de estado; não precisa de mais abstração |
| Banco | MongoDB (driver oficial) | Conta Atlas já existente; documento da sala é natural |
| Validação | Zod | Esquemas de entrada e de `.env` |
| Testes | `node:test` + `tsx` | Sem framework extra |
| Front | React + Vite + react-router | Atualização em tempo real pela tela, mobile-first |
| QR code | `qrcode.react` | Gerado na tela da sala a partir da URL `/r/:code` |

## Modos de dados

- `DB_DRIVER=memory` (padrão): repositório em memória, usado para desenvolvimento e testes, sem credenciais.
- `DB_DRIVER=mongodb`: conexão com `MONGODB_URI` (Atlas ou local).

A troca é feita apenas na fábrica do repositório; as regras de negócio não conhecem o banco.

O `.env` fica em `apps/server/.env`, mas os scripts são chamados da raiz. Por isso `env.ts` carrega o arquivo por **caminho absoluto** relativo ao próprio arquivo, e não pelo `cwd`. Sem isso, o servidor silenciosamente usaria `DB_DRIVER=memory`. `DOTENV_CONFIG_PATH` permite apontar para outro arquivo.

## Camadas e fluxo

```
React (apps/web)
   │ HTTP: POST /rooms, /bets, /rounds/close
   │ WS:   subscribe -> room:state | bet:placed | round:closed
   ▼
routes/ ──► domain/room-service.ts ──► repositories/ ──► MongoDB / memória
                    │
                    └──► realtime/ (broadcast para a sala)
```

## Concorrência

Apostas de jogadores diferentes podem chegar ao mesmo tempo. O serviço usa um **mutex por sala**: todas as escritas de uma sala são serializadas em memória, evitando perder atualizações de saldo/pot. Como há uma única instância do servidor, isso é suficiente nesta fase; se virar múltiplas instâncias, migrar para transações/optimistic concurrency no Mongo.

## Autenticação

- Cada participante recebe um **token** aleatório no momento da criação/entrada.
- Rotas que mudam estado (`apostar`, `fechar rodada`) exigem `Authorization: Bearer <token>`.
- O dealer é identificado pelo campo `isDealer` do jogador dono do token; não existe um token separado de "admin".
- O WebSocket usa apenas o código da sala, porque o estado da sala é público para quem tem o convite.

## Frontend

- `useRoom` busca o estado inicial com `GET /rooms/:code` e depois aplica os eventos do WebSocket; o estado completo enviado pelo servidor é sempre a fonte da verdade.
- A aposta é montada por **acumulação**: cada clique numa ficha (5/10/15/25/50) soma ao total; o total também pode ser digitado num `input type="number"`. A confirmação continua explícita.
- O modo da sala (`betMode`) é definido na criação. No modo `turn`, o serviço valida `betThisRound + amount >= currentBet`; no modo `free`, só valida inteiro positivo e saldo. Salas Mongo antigas sem o campo são lidas como `free`.
- A ordem de jogo fica em `turnOrder` (IDs dos jogadores). `PUT /rooms/:code/turn-order` é restrito ao dealer, valida que a lista é uma permutação exata dos participantes e transmite o `RoomView` atualizado como `room:state`.
- O botão "Encerrar rodada" só aparece para o jogador com `isDealer`; ele abre um modal para escolher o vencedor.
- A sessão (token + playerId) fica no `localStorage`, por sala. Sem sessão, abrir `/r/:code` mostra a tela de entrada com o código preenchido.
- O WebSocket reconecta sozinho; o badge mostra `ao vivo`, `conectando…` ou `reconectando…`.
- Tema: verde-feltro escuro com acentos dourados; layout de uma coluna em todas as telas, nesta ordem: pote → aposta → convite → encerrar rodada → jogadores → colinha.
- A coluna da sala é limitada a 760 px para manter o pote, as fichas e os cartões legíveis no desktop.

## Docker

- `apps/server/Dockerfile`: Node 22 alpine, `npm ci --omit=dev`, roda `tsx src/index.ts`.
- `apps/web/Dockerfile`: dois estágios — build Vite e nginx alpine servindo `dist/`.
- `apps/web/nginx.conf`: fallback `try_files ... /index.html` para as rotas do react-router.
- `compose.yaml` na raiz: sobe API e web; `env_file` injeta `apps/server/.env` em runtime; build args `VITE_API_URL` e `VITE_WS_URL` ficam no bundle do front.
- `.dockerignore` mantém `node_modules`, `dist` e arquivos `.env` fora do contexto de build.
- Healthchecks usam `127.0.0.1`; o web espera o servidor ficar `healthy` antes de subir.

## Pontos de atenção

- Nunca confiar no valor enviado pelo cliente além dos valores permitidos; validar no servidor.
- O código da sala é a credencial de convite: quem o tem pode entrar. Isso está alinhado com o uso local do produto.
- Contrato da API documentado em `04-api-e-eventos.md`; mudanças nele devem ser feitas antes do código.
