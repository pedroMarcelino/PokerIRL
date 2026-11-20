import { randomInt, randomUUID } from "node:crypto";
import {
  DEFAULT_BET_MODE,
  MAX_NAME_LENGTH,
  ROOM_CODE_LENGTH,
  ROOM_TTL_MS,
  isValidBetAmount,
  type ActivityEntry,
  type BetMode,
  type RoomView,
  type RoundResult,
} from "@pokerirl/shared";
import {
  AppError,
  betTooSmall,
  gameAlreadyStarted,
  gameNotStarted,
  insufficientChips,
  invalidWinner,
  nameTaken,
  notYourTurn,
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

/** Tamanho máximo do log exibido no topo da sala. */
const ACTIVITY_LIMIT = 30;

function logActivity(
  room: RoomRecord,
  kind: ActivityEntry["kind"],
  playerName: string,
  amount: number | null,
  round = room.round,
): void {
  const entry: ActivityEntry = {
    id: randomUUID(),
    kind,
    playerName,
    amount,
    round,
    at: new Date().toISOString(),
  };
  room.activity = [entry, ...(room.activity ?? [])].slice(0, ACTIVITY_LIMIT);
}

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

/** Próximo jogador com fichas, percorrendo a ordem em ciclo. */
function nextEligibleId(room: RoomRecord, fromId: string | null): string | null {
  const order = orderedIds(room);
  if (order.length === 0) return null;
  const from = fromId === null ? -1 : order.indexOf(fromId);
  for (let step = 1; step <= order.length; step += 1) {
    const id = order[(from + step + order.length) % order.length]!;
    const player = room.players.find((candidate) => candidate.id === id);
    if (player && player.chips > 0) return id;
  }
  return null;
}

/** Salas gravadas antes da vez continuam válidas; completa o estado sem apagar apostas. */
function normalizeTurnState(room: RoomRecord): void {
  if (room.betMode !== "turn") {
    room.currentPlayerId = null;
    return;
  }
  const order = orderedIds(room);
  if (room.currentPlayerId && !order.includes(room.currentPlayerId)) {
    room.currentPlayerId = null;
  }
  const current = room.players.find((player) => player.id === room.currentPlayerId);
  if (room.currentPlayerId && (!current || current.chips <= 0)) {
    room.currentPlayerId = nextEligibleId(room, room.currentPlayerId);
  }
  if (room.startingPlayerId && !order.includes(room.startingPlayerId)) {
    room.startingPlayerId = room.currentPlayerId;
  }
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
    currentPlayerId: room.betMode === "turn" ? room.currentPlayerId : null,
    started: room.started,
    status: room.status,
    activity: room.activity ?? [],
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
    normalizeTurnState(room);
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
        currentPlayerId: null,
        started: false,
        startingPlayerId: null,
        status: "open",
        expiresAt: new Date(Date.now() + ROOM_TTL_MS),
        activity: [],
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
        // Quem entra depois vai para o fim da ordem; se a sala já começou e
        // ninguém mais tem fichas, o recém-chegado entra na vez imediatamente.
        if (room.betMode === "turn" && room.started && !room.currentPlayerId) {
          room.startingPlayerId = player.id;
          room.currentPlayerId = player.id;
        }
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
        if (room.betMode === "turn") {
          if (!room.started) throw gameNotStarted();
          if (room.currentPlayerId !== player.id) {
            const current = room.players.find((candidate) => candidate.id === room.currentPlayerId);
            throw notYourTurn(current?.name);
          }
          // O total acumulado do jogador na rodada precisa alcançar a maior
          // aposta já feita — é o "call" do poker.
          if (player.betThisRound + input.amount < room.currentBet) {
            throw betTooSmall(room.currentBet - player.betThisRound);
          }
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
        // Cada aposta aceita encerra a vez daquele jogador. Quem tiver 0 fichas
        // é pulado automaticamente para não travar a rodada.
        if (room.betMode === "turn") {
          room.currentPlayerId = nextEligibleId(room, player.id);
        }
        logActivity(room, "bet", player.name, input.amount);
        await repository.put(room);
        return { room: toView(room), playerId: player.id };
      });
    },

    /** Dealer confere a ordem e inicia a partida; a partir daqui a ordem fica travada. */
    async startGame(input: { code: string; token: string }): Promise<RoomView> {
      return withLock(input.code, async () => {
        const room = await requireRoom(input.code);
        const dealer = room.players.find((player) => player.isDealer);
        if (!dealer || dealer.token !== input.token) {
          throw unauthorized("Somente o dealer pode iniciar a partida");
        }
        if (room.started) throw gameAlreadyStarted();

        room.started = true;
        if (room.betMode === "turn") {
          room.startingPlayerId = nextEligibleId(room, null);
          room.currentPlayerId = room.startingPlayerId;
        }
        logActivity(room, "start", dealer.name, null);
        await repository.put(room);
        return toView(room);
      });
    },

    async reorderPlayers(input: ReorderPlayersInput): Promise<RoomView> {
      return withLock(input.code, async () => {
        const room = await requireRoom(input.code);
        const dealer = room.players.find((player) => player.isDealer);
        if (!dealer || dealer.token !== input.token) {
          throw unauthorized("Somente o dealer pode alterar a ordem de jogo");
        }
        if (room.started) throw gameAlreadyStarted();

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

        // A rodada seguinte começa com o próximo da ordem — o "botão" gira
        // como no poker. O dealer 👑 continua fixo e quem tiver 0 fichas é pulado.
        if (room.betMode === "turn" && room.started) {
          const starter = nextEligibleId(room, room.startingPlayerId);
          room.startingPlayerId = starter;
          room.currentPlayerId = starter;
        }

        logActivity(room, "win", winner.name, amount, room.round - 1);
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
