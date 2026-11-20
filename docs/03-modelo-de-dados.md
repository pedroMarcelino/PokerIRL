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
| `status` | `"open"` | Estado da sala (hoje só existe aberta) |
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
  "status": "open",
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
8. Se `betMode === "turn"`, então `player.betThisRound + amount >= currentBet` antes da aposta ser aceita; em `"free"` não há esse mínimo.
9. Salas gravadas antes destes campos são lidas como `betMode: "free"` e `turnOrder = players.map(id)` pelo repositório Mongo.
10. `turnOrder` é sempre uma permutação exata dos IDs dos jogadores, sem repetição. Novos jogadores entram no fim; fechar rodada não altera a ordem.
11. Ao fechar a rodada: `winner.chips += pot`, depois `pot = 0`, `currentBet = 0`, `round += 1`.

## Índices

- `rooms._id`: único (já é a chave primária).
- `bets.roomCode + bets.round`: para consultar o histórico de uma rodada.
- Jogadores são buscados em memória dentro do documento da sala; não precisam de índice próprio nesta fase.
