# 03 — Modelo de dados

> Status: rascunho revisado · Última atualização: 2026-11-20

## Visão geral

Uma sala é um único documento. Jogadores e apostas da rodada ficam embutidos na sala; o histórico de apostas fica em uma coleção separada.

### `rooms`

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `_id` | string | Código da sala (6 dígitos) |
| `betMode` | `"turn"` \| `"free"` | Modo de aposta: com vez (mínimo = `currentBet`) ou sem sequência |
| `turnOrder` | string[] | IDs dos jogadores na ordem definida pelo dealer |
| `initialChips` | number | Valor inicial dado a todo jogador |
| `round` | number | Número da rodada atual (começa em 1) |
| `pot` | number | Total apostado na rodada atual |
| `currentBet` | number | Maior aposta acumulada por um jogador na rodada |
| `lastWinnerId` | string \| null | Vencedor da última rodada encerrada |
| `currentPlayerId` | string \| null | Quem deve apostar agora no modo `turn`; `null` no `free` e antes do início |
| `started` | boolean | `true` depois que o dealer iniciou a partida e travou a ordem |
| `startingPlayerId` | string \| null | Quem começou a rodada atual; usado para girar o início da próxima |
| `status` | `"open"` | Estado da sala (hoje só existe aberta) |
| `expiresAt` | Date | Momento da expiração (criação + 24h); TTL do Mongo apaga a sala |
| `activity` | Activity[] | Log curto das últimas jogadas, do mais recente para o mais antigo |
| `players` | Player[] | Participantes |

### `players` (embutido)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string (UUID) | Identificador interno |
| `name` | string | Nome exibido, até 24 caracteres |
| `chips` | number | Fichas disponíveis do jogador |
| `betThisRound` | number | Quanto ele apostou na rodada atual |
| `isDealer` | boolean | `true` para o criador; exibe 👑 na interface |
| `token` | string (UUID) | Credencial do celular; nunca enviada nas respostas públicas |

### `activity` (embutido em `rooms`)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string (UUID) | Identificador da linha |
| `kind` | `"start"` \| `"bet"` \| `"win"` | Início da partida, aposta ou rodada fechada |
| `playerName` | string | Nome de quem fez a jogada |
| `amount` | number \| null | Fichas envolvidas; `null` em `start` |
| `round` | number | Rodada em que aconteceu |
| `at` | string (ISO 8601) | Momento da jogada |

O log guarda no máximo 30 linhas. Ele alimenta o dropdown no topo da sala: fechado, mostra só a última linha; aberto, mostra o histórico.

### `bets` (histórico)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `roomCode` | string | Código da sala |
| `playerId` | string | Quem apostou |
| `playerName` | string | Nome na hora da aposta |
| `amount` | number | Valor apostado (soma de fichas ou valor digitado) |
| `round` | number | Rodada em que aconteceu |
| `createdAt` | Date | Momento da aposta |

## Projeção pública (`RoomView`)

O servidor nunca devolve `token` nem `players[].token`. A resposta pública contém:

```json
{
  "code": "123456",
  "betMode": "turn",
  "turnOrder": ["…Ana", "…Bruno"],
  "initialChips": 1000,
  "round": 1,
  "pot": 75,
  "currentBet": 25,
  "lastWinnerId": null,
  "currentPlayerId": "…Bruno",
  "started": true,
  "status": "open",
  "activity": [
    {
      "id": "…",
      "kind": "bet",
      "playerName": "Ana",
      "amount": 25,
      "round": 1,
      "at": "2026-11-20T19:00:00.000Z"
    }
  ],
  "players": [
    { "id": "…", "name": "Ana", "chips": 975, "betThisRound": 25, "isDealer": true }
  ]
}
```

O token é devolvido **apenas** nas respostas de `POST /rooms` e `POST /rooms/:code/join`.

## Invariantes

1. Todo jogador começa com `chips === initialChips`.
2. `pot === soma(betThisRound de todos os jogadores)`.
3. `currentBet === max(betThisRound de todos os jogadores, 0)`.
4. `0 <= chips`, e `betThisRound` volta a 0 quando a rodada fecha.
5. Nomes são únicos por sala, ignorando caixa.
6. Exatamente um jogador com `isDealer === true` por sala.
7. `amount` de aposta é um inteiro positivo `<= chips` do jogador; as fichas `{5, 10, 15, 25, 50}` são apenas atalhos no front que se somam.
8. Se `betMode === "turn"`, a partida precisa ter sido iniciada, `currentPlayerId` deve ser o autor da aposta e `player.betThisRound + amount >= currentBet`; em `"free"` não há vez nem mínimo.
9. Depois de cada aposta aceita no modo `turn`, `currentPlayerId` passa ao próximo jogador da ordem com `chips > 0`.
10. Salas antigas sem os campos novos são lidas com `started: false`, `turnOrder = players.map(id)`, `betMode: "free"` e `currentPlayerId: null` pelo repositório Mongo. Salas `turn` antigas ficam aguardando o dealer conferir a ordem e iniciar, sem herdar a ordem travada.
11. `turnOrder` é sempre uma permutação exata dos IDs dos jogadores, sem repetição. Novos jogadores entram no fim; travada ou não, fechar rodada não altera a ordem.
12. `started === true` impede `PUT /turn-order` e novos `POST /start`. Jogadores que entram depois são acrescentados ao fim da ordem sem destravar; se ninguém tiver fichas, o recém-chegado assume a vez.
13. Ao fechar a rodada: `winner.chips += pot`, depois `pot = 0`, `currentBet = 0`, `round += 1` e, no modo `turn`, `startingPlayerId`/`currentPlayerId` passam ao próximo jogador da ordem (rotação do jogador que começa).
14. `expiresAt` é sempre `createdAt + 24h`. Salas vencidas são tratadas como inexistentes (404), mesmo antes de o TTL do Mongo removê-las.
15. Toda aposta aceita, início de partida e rodada fechada acrescenta uma linha a `activity`; o log é mantido do mais recente para o mais antigo e limitado a 30 linhas.

## Índices

- `rooms._id`: único (já é a chave primária).
- `rooms.expiresAt`: TTL com `expireAfterSeconds: 0` — apaga a sala 24h depois da criação.
- `bets.createdAt`: TTL com `expireAfterSeconds: 86400` — apaga o histórico de apostas com 24h.
- `bets.roomCode + bets.round`: para consultar o histórico de uma rodada.
- Jogadores são buscados em memória dentro do documento da sala; não precisam de índice próprio nesta fase.

Para limpar o banco manualmente: `npm run db:purge` (tudo) ou `npm run db:purge -- 123456` (uma sala).
