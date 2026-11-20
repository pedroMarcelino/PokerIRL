import { BET_MODES, EVENTS, type PlayerView } from "@pokerirl/shared";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { unauthorized, validationError } from "../domain/errors.js";
import type { RoomService } from "../domain/room-service.js";
import type { Broadcaster } from "../realtime/websocket.js";

const nameSchema = z.string().trim().min(1).max(24);
const codeSchema = z.string().regex(/^\d{6}$/, "Código deve ter 6 dígitos");

type Options = { service: RoomService; broadcast: Broadcaster };

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) {
    throw validationError(result.error.issues.map((issue) => issue.message).join("; "));
  }
  return result.data;
}

function bearerToken(request: FastifyRequest): string {
  const header = request.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw unauthorized();
  const token = header.slice(7).trim();
  if (!token) throw unauthorized();
  return token;
}

export async function roomsRoutes(app: FastifyInstance, options: Options): Promise<void> {
  const { service, broadcast } = options;

  app.get("/health", async () => ({ ok: true }));

  app.post("/rooms", async (request, reply) => {
    const body = parse(
      z.object({
        dealerName: nameSchema,
        initialChips: z.number().int().positive(),
        betMode: z.enum(BET_MODES).default("free"),
      }),
      request.body,
    );
    const created = await service.createRoom(body);
    return reply.code(201).send(created);
  });

  app.get("/rooms/:code", async (request) => {
    const { code } = parse(z.object({ code: codeSchema }), request.params);
    return { room: await service.getRoom(code) };
  });

  app.post("/rooms/:code/join", async (request) => {
    const { code } = parse(z.object({ code: codeSchema }), request.params);
    const body = parse(z.object({ name: nameSchema }), request.body);
    const created = await service.joinRoom({ code, ...body });
    const player = created.room.players.find((candidate) => candidate.id === created.playerId)!;
    broadcast.broadcast(code, {
      type: EVENTS.PLAYER_JOINED,
      player: player as PlayerView,
      room: created.room,
    });
    return created;
  });

  app.post("/rooms/:code/start", async (request) => {
    const { code } = parse(z.object({ code: codeSchema }), request.params);
    const room = await service.startGame({ code, token: bearerToken(request) });
    broadcast.broadcast(code, { type: EVENTS.ROOM_STATE, room });
    return { room };
  });

  app.post("/rooms/:code/bets", async (request) => {
    const { code } = parse(z.object({ code: codeSchema }), request.params);
    const body = parse(z.object({ amount: z.number().int().positive() }), request.body);
    const bet = await service.placeBet({ code, token: bearerToken(request), ...body });
    broadcast.broadcast(code, {
      type: EVENTS.BET_PLACED,
      playerId: bet.playerId,
      amount: body.amount,
      room: bet.room,
    });
    return { room: bet.room };
  });

  app.put("/rooms/:code/turn-order", async (request) => {
    const { code } = parse(z.object({ code: codeSchema }), request.params);
    const body = parse(
      z.object({ playerIds: z.array(z.string().min(1)).min(1) }),
      request.body,
    );
    const room = await service.reorderPlayers({
      code,
      token: bearerToken(request),
      ...body,
    });
    broadcast.broadcast(code, { type: EVENTS.ROOM_STATE, room });
    return { room };
  });

  app.post("/rooms/:code/rounds/close", async (request) => {
    const { code } = parse(z.object({ code: codeSchema }), request.params);
    const body = parse(z.object({ winnerId: z.string().uuid() }), request.body);
    const closed = await service.closeRound({ code, token: bearerToken(request), ...body });
    broadcast.broadcast(code, { type: EVENTS.ROUND_CLOSED, result: closed.result, room: closed.room });
    return closed;
  });
}
