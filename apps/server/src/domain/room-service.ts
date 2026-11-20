import { randomInt, randomUUID } from "node:crypto";
import {
  DEFAULT_BET_MODE,
  MAX_NAME_LENGTH,
  ROOM_CODE_LENGTH,
  isValidBetAmount,
  type BetMode,
  type RoomView,
  type RoundResult,
} from "@pokerirl/shared";
import {
  AppError,
  betTooSmall,
  insufficientChips,
  invalidWinner,
  nameTaken,
  roomNotFound,
  unauthorized,
  validationError,
} from "./errors.js";
import { withLock } from "./locks.js";
import type { RoomRecord, RoomRepository } from "../repositories/types.js";

export type CreateRoomInput = { dealerName: string; initialChips: number; betMode?: BetMode };
export type JoinRoomInput = { code: string; name: string };
export type PlaceBetInput = { code: string; token: string; amount: number };
export type CloseRoundInput = { code: string; token: string; winnerId: string };
export type ReorderPlayersInput = { code: string; token: string; playerIds: string[] };

export type CreatedPlayer = { room: RoomView; playerId: string; token: string };
export type ClosedRound = { room: RoomView; result: RoundResult };

function normalizeName(value: string): string {
  const name = value.trim();
  if (!name || name.length > MAX_NAME_LENGTH) {
    throw validationError(`Nome deve ter entre 1 e ${MAX_NAME_LENGTH} caracteres`);
  }
  return name;
}

/** Mantém a ordem salva, mas nunca perde quem entrou depois nem aceita IDs fantasmas. */
function orderedIds(room: RoomRecord): string[] {
  const known = new Set(room.players.map((player) => player.id));
  const seen = new Set<string>();
  const result: string[] = [];
  for (const id of room.turnOrder ?? []) {
    if (known.has(id) && !seen.has(id)) {
      seen.add(id);
      result.push(id);
    }
  }
  for (const player of room.players) {
    if (!seen.has(player.id)) {
      seen.add(player.id);
      result.push(player.id);
    }
  }
  return result;
}

function toView(room: RoomRecord): RoomView {
  return {
    code: room.code,
    betMode: room.betMode,
    turnOrder: orderedIds(room),
    initialChips: room.initialChips,
    round: room.round,
    pot: room.pot,
    currentBet: room.currentBet,
    lastWinnerId: room.lastWinnerId,
    status: room.status,
    players: room.players.map(({ id, name, chips, betThisRound, isDealer }) => ({
      id,
      name,
      chips,
      betThisRound,
      isDealer,
    })),
  };
}

export function createRoomService(repository: RoomRepository) {
  async function generateCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt++) {
      const code = randomInt(0, 10 ** ROOM_CODE_LENGTH)
        .toString()
        .padStart(ROOM_CODE_LENGTH, "0");
      if ((await repository.get(code)) === null) return code;
    }
    throw new AppError(500, "CODE_EXHAUSTED", "Não foi possível gerar um código único");
  }

  async function requireRoom(code: string): Promise<RoomRecord> {
    const room = await repository.get(code);
    if (!room) throw roomNotFound();
    return room;
  }

  return {
    async createRoom(input: CreateRoomInput): Promise<CreatedPlayer> {
      const name = normalizeName(input.dealerName);
      if (!Number.isSafeInteger(input.initialChips) || input.initialChips <= 0) {
        throw validationError("initialChips deve ser um inteiro positivo");
      }

      const dealerPlayer = {
        id: randomUUID(),
        name,
        chips: input.initialChips,
        betThisRound: 0,
        isDealer: true,
        token: randomUUID(),
      };
      const room: RoomRecord = {
        code: await generateCode(),
        betMode: input.betMode ?? DEFAULT_BET_MODE,
        turnOrder: [dealerPlayer.id],
        initialChips: input.initialChips,
        round: 1,
        pot: 0,
        currentBet: 0,
        lastWinnerId: null,
        status: "open",
        players: [dealerPlayer],
      };

      await repository.insert(room);
      return { room: toView(room), playerId: dealerPlayer.id, token: dealerPlayer.token };
    },

    async joinRoom(input: JoinRoomInput): Promise<CreatedPlayer> {
      const name = normalizeName(input.name);
      return withLock(input.code, async () => {
        const room = await requireRoom(input.code);
        const exists = room.players.some(
          (player) => player.name.toLocaleLowerCase("pt-BR") === name.toLocaleLowerCase("pt-BR"),
        );
        if (exists) throw nameTaken();

        const player = {
          id: randomUUID(),
          name,
          chips: room.initialChips,
          betThisRound: 0,
          isDealer: false,
          token: randomUUID(),
        };
        room.players.push(player);
        room.turnOrder = orderedIds(room);
        await repository.put(room);
        return { room: toView(room), playerId: player.id, token: player.token };
      });
    },

    async getRoom(code: string): Promise<RoomView> {
      return toView(await requireRoom(code));
    },

    async placeBet(input: PlaceBetInput): Promise<{ room: RoomView; playerId: string }> {
      return withLock(input.code, async () => {
        const room = await requireRoom(input.code);
        const player = room.players.find((candidate) => candidate.token === input.token);
        if (!player) throw unauthorized();
        if (!isValidBetAmount(input.amount)) {
          throw validationError("Aposta deve ser um número inteiro positivo");
        }
        if (player.chips < input.amount) throw insufficientChips();
        // No modo "com vez", o total acumulado do jogador na rodada precisa
        // alcançar a maior aposta já feita — é o "call" do poker.
        if (room.betMode === "turn" && player.betThisRound + input.amount < room.currentBet) {
          throw betTooSmall(room.currentBet - player.betThisRound);
        }

        await repository.recordBet({
          roomCode: room.code,
          playerId: player.id,
          playerName: player.name,
          amount: input.amount,
          round: room.round,
          createdAt: new Date(),
        });

        player.chips -= input.amount;
        player.betThisRound += input.amount;
        room.pot += input.amount;
        room.currentBet = Math.max(...room.players.map((candidate) => candidate.betThisRound), 0);
        await repository.put(room);
        return { room: toView(room), playerId: player.id };
      });
    },

    async reorderPlayers(input: ReorderPlayersInput): Promise<RoomView> {
      return withLock(input.code, async () => {
        const room = await requireRoom(input.code);
        const dealer = room.players.find((player) => player.isDealer);
        if (!dealer || dealer.token !== input.token) {
          throw unauthorized("Somente o dealer pode alterar a ordem de jogo");
        }

        const current = orderedIds(room);
        const ids = input.playerIds;
        const valid =
          Array.isArray(ids) &&
          ids.length === current.length &&
          new Set(ids).size === ids.length &&
          ids.every((id) => typeof id === "string" && current.includes(id));
        if (!valid) {
          throw validationError("A ordem deve conter todos os jogadores da sala, sem repetição");
        }

        room.turnOrder = [...ids];
        await repository.put(room);
        return toView(room);
      });
    },

    async closeRound(input: CloseRoundInput): Promise<ClosedRound> {
      return withLock(input.code, async () => {
        const room = await requireRoom(input.code);
        const dealer = room.players.find((player) => player.isDealer);
        if (!dealer || dealer.token !== input.token) {
          throw unauthorized("Somente o dealer pode fechar a rodada");
        }

        const winner = room.players.find((player) => player.id === input.winnerId);
        if (!winner) throw invalidWinner();

        const amount = room.pot;
        winner.chips += amount;
        room.lastWinnerId = winner.id;
        room.round += 1;
        room.pot = 0;
        room.currentBet = 0;
        for (const player of room.players) player.betThisRound = 0;

        await repository.put(room);
        return {
          room: toView(room),
          result: {
            winnerId: winner.id,
            winnerName: winner.name,
            amount,
            round: room.round - 1,
          },
        };
      });
    },
  };
}

export type RoomService = ReturnType<typeof createRoomService>;
