# 04 — API e eventos

> Status: contrato da fase 1 · Última atualização: 2026-11-20
>
> Este arquivo é a **fonte da verdade** do contrato. Antes de mudar um endpoint, atualize aqui.

Base URL local (dev/Docker interno): `http://localhost:3000`  
Base URL pública (Vercel e navegador): `/api` — o rewrite do `vercel.json` encaminha `/api/*` ao serviço `server`, que registra as rotas com esse prefixo. O WebSocket segue o mesmo padrão: `ws(s)://<domínio>/api/ws` (local: `/ws`). No Docker, o nginx faz o mesmo encaminhamento e remove o prefixo antes de chegar ao Fastify.

## Convenções

- Corpo e respostas em JSON.
- Rotas que mutam estado exigem `Authorization: Bearer <token>` recebido na criação/entrada.
- Erros têm o formato `{ "error": { "code": string, "message": string } }`.
- `RoomView` está definido em `03-modelo-de-dados.md` e em `packages/shared`.

## Endpoints

### `GET /health`

Verificação simples.

```json
{ "ok": true }
```

---

### `POST /rooms`

Cria a sala. O dealer entra como jogador e recebe o mesmo valor inicial.

**Corpo**

```json
{ "dealerName": "Ana", "initialChips": 1000, "betMode": "turn" }
```

- `dealerName`: 1 a 24 caracteres.
- `initialChips`: inteiro positivo.
- `betMode`: `"turn"` (por rodada, cada um com a sua vez) ou `"free"` (sem sequência). Opcional; quando omitido, usa `"free"`.

**201 Created**

```json
{
  "room": { "...": "RoomView" },
  "playerId": "uuid-do-dealer",
  "token": "uuid-secreto"
}
```

---

### `POST /rooms/:code/join`

Entra na sala com nome. Quem entra depois recebe `initialChips`.

**Corpo**

```json
{ "name": "Bruno" }
```

**200 OK** — mesma forma da criação: `{ "room", "playerId", "token" }`.

**409** se o nome já estiver em uso na sala ou se a sala não existir (404).

---

### `GET /rooms/:code`

Estado público da sala. Não exige token.

**200 OK** — `{ "room": RoomView }`.

---

### `POST /rooms/:code/bets` 🔒

Registra uma aposta com valor inteiro positivo.

**Corpo**

```json
{ "amount": 150 }
```

- `amount` deve ser um **inteiro positivo**. As fichas do front (5/10/15/25/50) são atalhos que se somam — três cliques em 50 produzem `150` — mas o jogador também pode digitar qualquer inteiro, como `7`.
- O servidor recusa zero, negativos, frações e valores acima do saldo do jogador.
- Em salas `turn`, o total acumulado do jogador na rodada (`betThisRound + amount`) precisa alcançar `currentBet`. Se ele já apostou 50 e o valor da rodada é 150, o mínimo aceito agora é 100.

**200 OK** — `{ "room": RoomView }` já com saldo debitado, pot e valor da rodada atualizados.

**400** valor inválido (não inteiro positivo) · **403** token inválido · **409** saldo insuficiente ou aposta abaixo do mínimo (`BET_TOO_SMALL`).

---

### `PUT /rooms/:code/turn-order` 🔒

Altera a ordem de jogo. **Somente o dealer** pode chamar.

**Corpo**

```json
{ "playerIds": ["uuid-do-bruno", "uuid-da-ana"] }
```

- `playerIds` deve conter **todos** os jogadores da sala, exatamente uma vez cada.

**200 OK** — `{ "room": RoomView }` com o novo `turnOrder`. A nova ordem também é publicada no WebSocket como `room:state`.

**400** lista incompleta/repetida/ID desconhecido · **403** token ausente/inválido ou não-dealer.

---

### `POST /rooms/:code/rounds/close` 🔒

Fecha a rodada, transferindo todo o pot para o vencedor escolhido.

**Corpo**

```json
{ "winnerId": "uuid-do-jogador" }
```

**200 OK**

```json
{
  "room": { "...": "RoomView com pot zerado e round incrementado" },
  "result": {
    "winnerId": "uuid-do-jogador",
    "winnerName": "Bruno",
    "amount": 125,
    "round": 1
  }
}
```

**403** se quem chamar não for o dealer · **404** se o vencedor não estiver na sala.

## Erros

| Código HTTP | `error.code` | Situação |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | Corpo inválido, nome vazio, aposta não inteira positiva |
| 403 | `UNAUTHORIZED` | Token ausente/inválido, tentativa de fechar rodada ou mudar a ordem sem ser dealer |
| 404 | `ROOM_NOT_FOUND` | Código de sala inexistente |
| 409 | `NAME_TAKEN` | Nome já usado na sala |
| 409 | `INSUFFICIENT_CHIPS` | Jogador não tem fichas suficientes |
| 409 | `BET_TOO_SMALL` | Sala `turn`: aposta não alcança o valor da rodada |
| 409 | `INVALID_WINNER` | Vencedor não pertence à sala |

## WebSocket

Conexão em `ws://localhost:3000/ws`. Após conectar, o cliente assina a sala:

```json
{ "type": "subscribe", "code": "123456" }
```

O servidor responde com o estado atual e passa a transmitir mudanças para todos os assinantes daquela sala.

| Evento | Payload |
| --- | --- |
| `room:state` | `{ type, room }` — enviado logo após assinar |
| `player:joined` | `{ type, player, room }` |
| `bet:placed` | `{ type, playerId, amount, room }` |
| `round:closed` | `{ type, result, room }` |

## Exemplos com curl

```bash
# criar sala
curl -X POST http://localhost:3000/rooms \
  -H 'content-type: application/json' \
  -d '{"dealerName":"Ana","initialChips":1000,"betMode":"turn"}'

# entrar
curl -X POST http://localhost:3000/rooms/123456/join \
  -H 'content-type: application/json' \
  -d '{"name":"Bruno"}'

# apostar
curl -X POST http://localhost:3000/rooms/123456/bets \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token>' \
  -d '{"amount":150}'

# mudar ordem de jogo (somente dealer)
curl -X PUT http://localhost:3000/rooms/123456/turn-order \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token-do-dealer>' \
  -d '{"playerIds":["<uuid-do-bruno>","<uuid-da-ana>"]}'

# fechar rodada (somente dealer)
curl -X POST http://localhost:3000/rooms/123456/rounds/close \
  -H 'content-type: application/json' \
  -H 'authorization: Bearer <token-do-dealer>' \
  -d '{"winnerId":"<uuid-do-vencedor>"}'
```
