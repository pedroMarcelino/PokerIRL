import assert from "node:assert/strict";
import { test } from "node:test";
import { AppError, AppError as ErrorType } from "../src/domain/errors.js";
import { createRoomService } from "../src/domain/room-service.js";
import { MemoryRoomRepository } from "../src/repositories/memory.js";

function setup() {
  const repository = new MemoryRoomRepository();
  const service = createRoomService(repository);
  return { repository, service };
}

async function expectError(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AppError, "erro esperado era AppError");
    assert.equal((error as ErrorType).code, code);
    return true;
  });
}

test("criar sala: dealer é jogador, começa com o valor inicial e tem a coroa", async () => {
  const { service } = setup();
  const created = await service.createRoom({ dealerName: "Ana", initialChips: 1000 });

  assert.match(created.room.code, /^\d{6}$/);
  assert.equal(created.room.players.length, 1);
  assert.equal(created.room.players[0]?.name, "Ana");
  assert.equal(created.room.players[0]?.chips, 1000);
  assert.equal(created.room.players[0]?.isDealer, true);
  assert.equal(created.room.pot, 0);
  assert.equal(created.room.round, 1);
  assert.equal(created.room.betMode, "free");
  assert.deepEqual(created.room.turnOrder, [created.room.players[0]?.id]);
  assert.equal("token" in created.room.players[0]!, false);
});

test("entrar na sala: jogador tardio recebe o mesmo valor inicial e nome único é exigido", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 500 });
  const joined = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });

  assert.equal(joined.room.players.length, 2);
  assert.equal(joined.room.players[1]?.chips, 500);
  assert.equal(joined.room.players[1]?.isDealer, false);
  assert.deepEqual(joined.room.turnOrder, [dealer.playerId, joined.playerId]);

  await expectError(
    service.joinRoom({ code: dealer.room.code, name: "bruno" }),
    "NAME_TAKEN",
  );
});

test("apostar: debita fichas, atualiza pote e valor da rodada", async () => {
  const { repository, service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });

  const afterFirst = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 25,
  });
  assert.equal(afterFirst.room.players[0]?.chips, 75);
  assert.equal(afterFirst.room.players[0]?.betThisRound, 25);
  assert.equal(afterFirst.room.pot, 25);
  assert.equal(afterFirst.room.currentBet, 25);

  const afterSecond = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 50,
  });
  assert.equal(afterSecond.room.pot, 75);
  assert.equal(afterSecond.room.currentBet, 50);
  assert.equal(repository.bets.length, 2);
});

test("apostar: aceita qualquer inteiro positivo e recusa valores inválidos", async () => {
  const { service, repository } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 20 });

  // 7 não é uma ficha, mas é um valor inteiro válido digitado pelo jogador.
  const accepted = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 7,
  });
  assert.equal(accepted.room.pot, 7);
  assert.equal(repository.bets.at(-1)?.amount, 7);

  for (const amount of [0, -5, 2.5, Number.NaN]) {
    await expectError(
      service.placeBet({ code: dealer.room.code, token: dealer.token, amount }),
      "VALIDATION_ERROR",
    );
  }
  await expectError(
    service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 50 }),
    "INSUFFICIENT_CHIPS",
  );
  await expectError(
    service.placeBet({ code: dealer.room.code, token: "token-errado", amount: 5 }),
    "UNAUTHORIZED",
  );
});

test("apostar: valor acumulado de fichas entra inteiro no pote", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 500 });

  const after = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 50 + 50 + 50, // três cliques na ficha de 50
  });

  assert.equal(after.room.players[0]?.chips, 350);
  assert.equal(after.room.players[0]?.betThisRound, 150);
  assert.equal(after.room.pot, 150);
  assert.equal(after.room.currentBet, 150);
});

test("ordem de jogo: só o dealer reordena e a ordem vale para as próximas rodadas", async () => {
  const { repository, service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  const carla = await service.joinRoom({ code: dealer.room.code, name: "Carla" });

  const reversed = [carla.playerId, dealer.playerId, bruno.playerId];
  const reordered = await service.reorderPlayers({
    code: dealer.room.code,
    token: dealer.token,
    playerIds: reversed,
  });
  assert.deepEqual(reordered.turnOrder, reversed);
  assert.deepEqual((await repository.get(dealer.room.code))?.turnOrder, reversed);

  // A ordem não muda quando a rodada fecha.
  await service.closeRound({
    code: dealer.room.code,
    token: dealer.token,
    winnerId: bruno.playerId,
  });
  assert.deepEqual((await service.getRoom(dealer.room.code)).turnOrder, reversed);

  // Quem entra depois entra no fim da ordem.
  const diego = await service.joinRoom({ code: dealer.room.code, name: "Diego" });
  assert.deepEqual(diego.room.turnOrder, [...reversed, diego.playerId]);
});

test("ordem de jogo: recusa não-dealer e listas incompletas ou repetidas", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });

  await expectError(
    service.reorderPlayers({
      code: dealer.room.code,
      token: bruno.token,
      playerIds: [bruno.playerId, dealer.playerId],
    }),
    "UNAUTHORIZED",
  );
  await expectError(
    service.reorderPlayers({
      code: dealer.room.code,
      token: dealer.token,
      playerIds: [dealer.playerId],
    }),
    "VALIDATION_ERROR",
  );
  await expectError(
    service.reorderPlayers({
      code: dealer.room.code,
      token: dealer.token,
      playerIds: [dealer.playerId, dealer.playerId],
    }),
    "VALIDATION_ERROR",
  );
  await expectError(
    service.reorderPlayers({
      code: dealer.room.code,
      token: dealer.token,
      playerIds: [dealer.playerId, "id-que-nao-existe"],
    }),
    "VALIDATION_ERROR",
  );
});

test("modo com vez: ninguém aposta menos que a maior aposta da rodada", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 500,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });

  assert.equal(dealer.room.betMode, "turn");
  assert.equal(bruno.room.betMode, "turn");

  const first = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 50,
  });
  assert.equal(first.room.currentBet, 50);

  // Bruno tenta entrar com 25 e é recusado.
  await expectError(
    service.placeBet({ code: dealer.room.code, token: bruno.token, amount: 25 }),
    "BET_TOO_SMALL",
  );

  // 50 (igual) e 100 (acima) são aceitos.
  const called = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 50,
  });
  assert.equal(called.room.pot, 100);
  assert.equal(called.room.currentBet, 50);

  const raised = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 100,
  });
  assert.equal(raised.room.currentBet, 150);
  assert.equal(raised.room.players[1]?.betThisRound, 150);

  // Ana já tem 50 na rodada: falta 100 para alcançar os 150 de Bruno.
  await expectError(
    service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 25 }),
    "BET_TOO_SMALL",
  );
  const completed = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 100,
  });
  assert.equal(completed.room.players[0]?.betThisRound, 150);
});

test("modo sem sequência: aposta menor que a atual é aceita", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 500 });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });

  await service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 200 });
  const smaller = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 5,
  });
  assert.equal(smaller.room.players[1]?.betThisRound, 5);
  assert.equal(smaller.room.pot, 205);
  assert.equal(smaller.room.currentBet, 200);
});

test("modo com vez: a mínima zera na rodada seguinte", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 500,
    betMode: "turn",
  });

  await service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 100 });
  await service.closeRound({
    code: dealer.room.code,
    token: dealer.token,
    winnerId: dealer.playerId,
  });

  const next = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 5,
  });
  assert.equal(next.room.currentBet, 5);
});

test("fechar rodada: só o dealer pode, e o pote vai para o vencedor", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });

  await service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 25 });
  await service.placeBet({ code: dealer.room.code, token: bruno.token, amount: 50 });

  await expectError(
    service.closeRound({
      code: dealer.room.code,
      token: bruno.token,
      winnerId: bruno.playerId,
    }),
    "UNAUTHORIZED",
  );

  const closed = await service.closeRound({
    code: dealer.room.code,
    token: dealer.token,
    winnerId: bruno.playerId,
  });

  assert.equal(closed.result.amount, 75);
  assert.equal(closed.result.winnerName, "Bruno");
  assert.equal(closed.result.round, 1);
  assert.equal(closed.room.players.find((p) => p.id === bruno.playerId)?.chips, 125);
  assert.equal(closed.room.players.find((p) => p.id === dealer.playerId)?.chips, 75);
  assert.equal(closed.room.pot, 0);
  assert.equal(closed.room.currentBet, 0);
  assert.equal(closed.room.round, 2);
  assert.ok(closed.room.players.every((p) => p.betThisRound === 0));
  assert.equal(closed.room.lastWinnerId, bruno.playerId);
});

test("fechar rodada: dealer pode escolher a si mesmo e recusa vencedor de outra sala", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  const other = await service.createRoom({ dealerName: "Carla", initialChips: 100 });
  await service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 50 });

  const closed = await service.closeRound({
    code: dealer.room.code,
    token: dealer.token,
    winnerId: dealer.playerId,
  });
  assert.equal(closed.result.winnerId, dealer.playerId);
  assert.equal(closed.result.amount, 50);
  assert.equal(closed.room.players[0]?.chips, 100);

  await expectError(
    service.closeRound({
      code: dealer.room.code,
      token: dealer.token,
      winnerId: other.playerId,
    }),
    "INVALID_WINNER",
  );
});
