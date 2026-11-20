import assert from "node:assert/strict";
import { test } from "node:test";
import type { AddressInfo } from "node:net";
import { EVENTS, type ServerEvent } from "@pokerirl/shared";
import { WebSocket } from "ws";
import { buildApp } from "../src/app.js";
import { createRoomService } from "../src/domain/room-service.js";
import { attachRealtime, type Broadcaster } from "../src/realtime/websocket.js";
import { MemoryRoomRepository } from "../src/repositories/memory.js";

async function waitFor(predicate: () => boolean, timeoutMs = 3000): Promise<void> {
  const start = Date.now();
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) throw new Error("Timeout esperando evento");
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

test("API + WebSocket: criar, entrar, apostar e fechar rodada", async (t) => {
  const service = createRoomService(new MemoryRoomRepository());
  let realtime: Broadcaster = { broadcast: () => {} };
  const broadcast: Broadcaster = { broadcast: (code, event) => realtime.broadcast(code, event) };
  const app = await buildApp({ service, broadcast, corsOrigin: "*" });
  realtime = attachRealtime(app.server, service);

  await app.listen({ port: 0, host: "127.0.0.1" });

  const { port } = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  type Body = { [key: string]: any };

  const post = async (
    path: string,
    body: unknown,
    token?: string,
  ): Promise<{ status: number; body: Body }> => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "close",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Body };
  };

  const put = async (path: string, body: unknown, token?: string) => {
    const response = await fetch(`${base}${path}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        connection: "close",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as Body };
  };

  const events: ServerEvent[] = [];
  const socket = new WebSocket(`ws://127.0.0.1:${port}/ws`);
  await new Promise<void>((resolve, reject) => {
    socket.once("open", resolve);
    socket.once("error", reject);
  });
  socket.on("message", (raw) => events.push(JSON.parse(raw.toString()) as ServerEvent));
  t.after(async () => {
    socket.terminate();
    await app.close();
  });

  const created = await post("/rooms", {
    dealerName: "Ana",
    initialChips: 100,
    betMode: "free",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.room.betMode, "free");
  const code = created.body.room.code as string;
  const dealerToken = created.body.token as string;
  const dealerId = created.body.playerId as string;

  socket.send(JSON.stringify({ type: "subscribe", code }));
  await waitFor(() => events.some((event) => event.type === EVENTS.ROOM_STATE));

  const joined = await post(`/rooms/${code}/join`, { name: "Bruno" });
  assert.equal(joined.status, 200);
  await waitFor(() => events.some((event) => event.type === EVENTS.PLAYER_JOINED));
  const brunoId = joined.body.playerId as string;
  const brunoToken = joined.body.token as string;

  const reorderedIds = [brunoId, dealerId];
  const reordered = await put(
    `/rooms/${code}/turn-order`,
    { playerIds: reorderedIds },
    dealerToken,
  );
  assert.equal(reordered.status, 200);
  assert.deepEqual(reordered.body.room.turnOrder, reorderedIds);
  await waitFor(
    () => events.filter((event) => event.type === EVENTS.ROOM_STATE).length >= 2,
  );

  const notDealerOrder = await put(
    `/rooms/${code}/turn-order`,
    { playerIds: [dealerId, brunoId] },
    brunoToken,
  );
  assert.equal(notDealerOrder.status, 403);
  assert.equal(notDealerOrder.body.error.code, "UNAUTHORIZED");

  const badOrder = await put(
    `/rooms/${code}/turn-order`,
    { playerIds: [dealerId] },
    dealerToken,
  );
  assert.equal(badOrder.status, 400);
  assert.equal(badOrder.body.error.code, "VALIDATION_ERROR");

  const bet = await post(
    `/rooms/${code}/bets`,
    { amount: 25 },
    dealerToken,
  );
  assert.equal(bet.status, 200);
  assert.equal(bet.body.room.pot, 25);
  await waitFor(() => events.some((event) => event.type === EVENTS.BET_PLACED));

  const badBet = await post(`/rooms/${code}/bets`, { amount: 0 }, brunoToken);
  assert.equal(badBet.status, 400);
  assert.equal(badBet.body.error.code, "VALIDATION_ERROR");

  // Um valor que não é ficha (7) também é aceito pela API.
  const customBet = await post(`/rooms/${code}/bets`, { amount: 7 }, brunoToken);
  assert.equal(customBet.status, 200);
  assert.equal(customBet.body.room.pot, 32);

  const closed = await post(
    `/rooms/${code}/rounds/close`,
    { winnerId: brunoId },
    dealerToken,
  );
  assert.equal(closed.status, 200);
  assert.equal(closed.body.result.amount, 32);
  assert.equal(closed.body.room.pot, 0);
  assert.equal(closed.body.room.round, 2);
  await waitFor(() => events.some((event) => event.type === EVENTS.ROUND_CLOSED));

  const notDealer = await post(
    `/rooms/${code}/rounds/close`,
    { winnerId: dealerId },
    brunoToken,
  );
  assert.equal(notDealer.status, 403);
  assert.equal(notDealer.body.error.code, "UNAUTHORIZED");

  const state = (await fetch(`${base}/rooms/${code}`, {
    headers: { connection: "close" },
  }).then((response) => response.json())) as Body;
  assert.equal(state.room.players.find((p: { id: string }) => p.id === brunoId)?.chips, 125);
});

test("API: sala com vez recusa aposta abaixo do mínimo com 409", async (t) => {
  const service = createRoomService(new MemoryRoomRepository());
  const app = await buildApp({
    service,
    broadcast: { broadcast: () => {} },
    corsOrigin: "*",
  });
  await app.listen({ port: 0, host: "127.0.0.1" });
  const { port } = app.server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;
  t.after(async () => app.close());

  const post = async (path: string, body: unknown, token?: string) => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        connection: "close",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    return { status: response.status, body: (await response.json()) as any };
  };

  const created = await post("/rooms", {
    dealerName: "Ana",
    initialChips: 200,
    betMode: "turn",
  });
  assert.equal(created.status, 201);
  assert.equal(created.body.room.betMode, "turn");
  const code = created.body.room.code as string;

  const joined = await post(`/rooms/${code}/join`, { name: "Bruno" });

  const beforeStart = await post(
    `/rooms/${code}/bets`,
    { amount: 50 },
    created.body.token as string,
  );
  assert.equal(beforeStart.status, 409);
  assert.equal(beforeStart.body.error.code, "GAME_NOT_STARTED");

  const started = await post(`/rooms/${code}/start`, {}, created.body.token as string);
  assert.equal(started.status, 200);
  assert.equal(started.body.room.currentPlayerId, created.body.playerId);
  assert.equal(started.body.room.started, true);

  const first = await post(
    `/rooms/${code}/bets`,
    { amount: 50 },
    created.body.token as string,
  );
  assert.equal(first.status, 200);
  assert.equal(first.body.room.currentPlayerId, joined.body.playerId);

  const outOfTurn = await post(
    `/rooms/${code}/bets`,
    { amount: 50 },
    created.body.token as string,
  );
  assert.equal(outOfTurn.status, 409);
  assert.equal(outOfTurn.body.error.code, "NOT_YOUR_TURN");

  const tooSmall = await post(
    `/rooms/${code}/bets`,
    { amount: 25 },
    joined.body.token as string,
  );
  assert.equal(tooSmall.status, 409);
  assert.equal(tooSmall.body.error.code, "BET_TOO_SMALL");

  const invalidMode = await post("/rooms", {
    dealerName: "Carla",
    initialChips: 200,
    betMode: "errado",
  });
  assert.equal(invalidMode.status, 400);
  assert.equal(invalidMode.body.error.code, "VALIDATION_ERROR");
});

test("rotas públicas ficam sob /api quando o prefixo é configurado", async () => {
  const service = createRoomService(new MemoryRoomRepository());
  const app = await buildApp({
    service,
    broadcast: { broadcast: () => {} },
    basePath: "/api",
  });

  const prefixed = await app.inject({ method: "GET", url: "/api/health" });
  assert.equal(prefixed.statusCode, 200);
  assert.deepEqual(prefixed.json(), { ok: true });

  const unprefixed = await app.inject({ method: "GET", url: "/health" });
  assert.equal(unprefixed.statusCode, 404);
  await app.close();
});

test("entrypoint da Vercel responde /api depois de ready()", async () => {
  process.env.DB_DRIVER = "memory";
  const { default: server } = await import("../src/vercel.js");

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", () => resolve()));
  const address = server.address();
  assert.ok(address && typeof address !== "string", "servidor sem endereço");

  try {
    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { ok: true });
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
});
