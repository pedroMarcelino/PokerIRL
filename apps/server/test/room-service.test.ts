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

  await expectError(
    service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 10 }),
    "GAME_NOT_STARTED",
  );
  const started = await service.startGame({ code: dealer.room.code, token: dealer.token });
  assert.equal(started.currentPlayerId, dealer.playerId);

  const first = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 50,
  });
  assert.equal(first.room.currentBet, 50);
  assert.equal(first.room.currentPlayerId, bruno.playerId);

  // Bruno tenta entrar com 25 e é recusado por estar abaixo da aposta da rodada.
  await expectError(
    service.placeBet({ code: dealer.room.code, token: bruno.token, amount: 25 }),
    "BET_TOO_SMALL",
  );

  // 50 (igual) é aceito; o aumento de 100 agora cabe na vez da Ana.
  const called = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 50,
  });
  assert.equal(called.room.pot, 100);
  assert.equal(called.room.currentBet, 50);
  assert.equal(called.room.currentPlayerId, dealer.playerId);

  const raised = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 100,
  });
  assert.equal(raised.room.currentBet, 150);
  assert.equal(raised.room.players[0]?.betThisRound, 150);
  assert.equal(raised.room.currentPlayerId, bruno.playerId);

  // Bruno já tem 50 na rodada: falta 100 para alcançar os 150 da Ana.
  await expectError(
    service.placeBet({ code: dealer.room.code, token: bruno.token, amount: 25 }),
    "BET_TOO_SMALL",
  );
  const completed = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 100,
  });
  assert.equal(completed.room.players[1]?.betThisRound, 150);
  assert.equal(completed.room.currentPlayerId, dealer.playerId);
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

  await service.startGame({ code: dealer.room.code, token: dealer.token });
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

test("modo com vez: fora da vez é recusado e a vez avança depois de cada aposta", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 500,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  const carla = await service.joinRoom({ code: dealer.room.code, name: "Carla" });

  await expectError(
    service.placeBet({ code: dealer.room.code, token: bruno.token, amount: 10 }),
    "GAME_NOT_STARTED",
  );
  const started = await service.startGame({ code: dealer.room.code, token: dealer.token });
  assert.equal(started.currentPlayerId, dealer.playerId);

  await expectError(
    service.placeBet({ code: dealer.room.code, token: bruno.token, amount: 10 }),
    "NOT_YOUR_TURN",
  );
  const first = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 10,
  });
  assert.equal(first.room.currentPlayerId, bruno.playerId);

  await expectError(
    service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 10 }),
    "NOT_YOUR_TURN",
  );
  const second = await service.placeBet({
    code: dealer.room.code,
    token: bruno.token,
    amount: 10,
  });
  assert.equal(second.room.currentPlayerId, carla.playerId);

  const third = await service.placeBet({
    code: dealer.room.code,
    token: carla.token,
    amount: 10,
  });
  assert.equal(third.room.currentPlayerId, dealer.playerId);
  assert.equal(third.room.pot, 30);
});

test("modo com vez: quem começa gira a cada rodada e o dealer 👑 continua fixo", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 500,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  const carla = await service.joinRoom({ code: dealer.room.code, name: "Carla" });
  await service.startGame({ code: dealer.room.code, token: dealer.token });

  assert.equal((await service.getRoom(dealer.room.code)).currentPlayerId, dealer.playerId);
  for (const expected of [bruno.playerId, carla.playerId, dealer.playerId]) {
    const closed = await service.closeRound({
      code: dealer.room.code,
      token: dealer.token,
      winnerId: dealer.playerId,
    });
    assert.equal(closed.room.currentPlayerId, expected);
    assert.equal(closed.room.players.find((player) => player.isDealer)?.id, dealer.playerId);
  }
});

test("modo com vez: jogador sem fichas é pulado na vez", async () => {
  const { repository, service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 100,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  const carla = await service.joinRoom({ code: dealer.room.code, name: "Carla" });

  const record = await repository.get(dealer.room.code);
  assert.ok(record);
  record.players.find((player) => player.id === bruno.playerId)!.chips = 0;
  await repository.put(record);

  await service.startGame({ code: dealer.room.code, token: dealer.token });
  const first = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 10,
  });
  assert.equal(first.room.currentPlayerId, carla.playerId);

  const second = await service.placeBet({
    code: dealer.room.code,
    token: carla.token,
    amount: 10,
  });
  assert.equal(second.room.currentPlayerId, dealer.playerId);
});

test("partida iniciada trava a ordem; modo livre não usa vez", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 100,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  await service.startGame({ code: dealer.room.code, token: dealer.token });

  await expectError(
    service.reorderPlayers({
      code: dealer.room.code,
      token: dealer.token,
      playerIds: [bruno.playerId, dealer.playerId],
    }),
    "GAME_ALREADY_STARTED",
  );
  await expectError(
    service.startGame({ code: dealer.room.code, token: bruno.token }),
    "UNAUTHORIZED",
  );
  await expectError(
    service.startGame({ code: dealer.room.code, token: dealer.token }),
    "GAME_ALREADY_STARTED",
  );

  const free = await service.createRoom({ dealerName: "Carla", initialChips: 100 });
  const freeRoom = await service.getRoom(free.room.code);
  assert.equal(freeRoom.currentPlayerId, null);
  assert.equal(freeRoom.started, false);
  const freeStarted = await service.startGame({ code: free.room.code, token: free.token });
  assert.equal(freeStarted.started, true, "o dealer também inicia salas sem sequência");
  assert.equal(freeStarted.currentPlayerId, null);
  await expectError(
    service.reorderPlayers({
      code: free.room.code,
      token: free.token,
      playerIds: [free.playerId],
    }),
    "GAME_ALREADY_STARTED",
  );
  await service.placeBet({ code: free.room.code, token: free.token, amount: 10 });
  assert.equal((await service.getRoom(free.room.code)).pot, 10);
});

test("entrada tardia entra no fim da ordem sem destravar a partida", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 100,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  await service.startGame({ code: dealer.room.code, token: dealer.token });

  const carla = await service.joinRoom({ code: dealer.room.code, name: "Carla" });
  assert.deepEqual(carla.room.turnOrder, [dealer.playerId, bruno.playerId, carla.playerId]);
  assert.equal(carla.room.started, true);
  assert.equal(carla.room.currentPlayerId, dealer.playerId);
  assert.equal(carla.room.players[2]?.chips, 100);

  const after = await service.placeBet({
    code: dealer.room.code,
    token: dealer.token,
    amount: 10,
  });
  assert.equal(after.room.currentPlayerId, bruno.playerId);
  await expectError(
    service.reorderPlayers({
      code: dealer.room.code,
      token: dealer.token,
      playerIds: [bruno.playerId, dealer.playerId, carla.playerId],
    }),
    "GAME_ALREADY_STARTED",
  );
});

test("sala expira depois de 24 horas e passa a não existir", async () => {
  const { repository, service } = setup();
  const created = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  const record = await repository.get(created.room.code);
  assert.ok(record);
  const hours = (record.expiresAt.getTime() - Date.now()) / (60 * 60 * 1000);
  assert.ok(hours > 23.9 && hours <= 24, `expiração prevista para ${hours}h`);

  record.expiresAt = new Date(Date.now() - 1000);
  await repository.put(record);
  assert.equal(await repository.get(created.room.code), null);
  await expectError(service.getRoom(created.room.code), "ROOM_NOT_FOUND");
  await expectError(
    service.placeBet({ code: created.room.code, token: created.token, amount: 10 }),
    "ROOM_NOT_FOUND",
  );
});

test("log de atividade registra início, aposta e vitória em ordem reversa", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({
    dealerName: "Ana",
    initialChips: 100,
    betMode: "turn",
  });
  const bruno = await service.joinRoom({ code: dealer.room.code, name: "Bruno" });
  assert.deepEqual((await service.getRoom(dealer.room.code)).activity, []);

  await service.startGame({ code: dealer.room.code, token: dealer.token });
  await service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 25 });
  const closed = await service.closeRound({
    code: dealer.room.code,
    token: dealer.token,
    winnerId: bruno.playerId,
  });

  const activity = closed.room.activity;
  assert.deepEqual(activity.map((entry) => entry.kind), ["win", "bet", "start"]);
  assert.equal(activity[0]?.playerName, "Bruno");
  assert.equal(activity[0]?.amount, 25);
  assert.equal(activity[0]?.round, 1);
  assert.equal(activity[1]?.playerName, "Ana");
  assert.equal(activity[1]?.amount, 25);
  assert.equal(activity[2]?.amount, null);
  for (const entry of activity) assert.ok(entry.id && entry.at);
});

test("log de atividade é limitado às jogadas mais recentes", async () => {
  const { service } = setup();
  const dealer = await service.createRoom({ dealerName: "Ana", initialChips: 100 });
  for (let i = 0; i < 35; i += 1) {
    await service.placeBet({ code: dealer.room.code, token: dealer.token, amount: 1 });
  }
  const activity = (await service.getRoom(dealer.room.code)).activity;
  assert.equal(activity.length, 30);
  assert.equal(activity[0]?.amount, 1);
});
