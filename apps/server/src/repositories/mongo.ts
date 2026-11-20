import { ROOM_TTL_MS } from "@pokerirl/shared";
import type { Collection, Db } from "mongodb";
import type { BetRecord, RoomRecord, RoomRepository } from "./types.js";

type RoomDocument = Omit<RoomRecord, "code"> & { _id: string };
/** Documentos antigos não têm os campos da vez; o tipo de leitura é parcial. */
type LegacyRoomDocument = Partial<RoomDocument> & { _id: string };

function toDocument(room: RoomRecord): RoomDocument {
  const { code, ...rest } = room;
  return { _id: code, ...rest };
}

function fromDocument(doc: RoomDocument): RoomRecord {
  const { _id, ...rest } = doc as LegacyRoomDocument;
  // Salas antigas continuam válidas: modo livre e ordem de entrada na sala.
  const players = rest.players ?? [];
  const turnOrder = rest.turnOrder?.length ? rest.turnOrder : players.map((player) => player.id);
  const betMode = rest.betMode ?? "free";
  // Salas antigas ainda não têm início formal: o dealer pode conferir a ordem
  // e iniciar quando quiser, em vez de herdarem a ordem travada.
  const started = typeof rest.started === "boolean" ? rest.started : false;
  const currentPlayerId =
    rest.currentPlayerId === undefined
      ? started && betMode === "turn"
        ? (turnOrder[0] ?? null)
        : null
      : rest.currentPlayerId;
  const startingPlayerId = rest.startingPlayerId ?? currentPlayerId;
  return {
    ...rest,
    code: _id,
    players,
    betMode,
    turnOrder,
    started,
    startingPlayerId,
    currentPlayerId,
    // Documentos gravados antes da expiração não têm o campo: já nascem vencidos.
    expiresAt: rest.expiresAt ?? new Date(0),
    activity: rest.activity ?? [],
  } as RoomRecord;
}

export class MongoRoomRepository implements RoomRepository {
  private readonly rooms: Collection<RoomDocument>;
  private readonly bets: Collection<BetRecord>;

  constructor(db: Db) {
    this.rooms = db.collection<RoomDocument>("rooms");
    this.bets = db.collection<BetRecord>("bets");
  }

  async init(): Promise<void> {
    // TTL do Mongo remove salas 24h depois de expiresAt e apostas 24h depois
    // de createdAt. A checagem em get() cobre a janela do monitor de TTL.
    await this.rooms.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    await this.bets.createIndex({ createdAt: 1 }, { expireAfterSeconds: ROOM_TTL_MS / 1000 });
    await this.bets.createIndex({ roomCode: 1, round: 1 });
  }

  async insert(room: RoomRecord): Promise<void> {
    await this.rooms.insertOne(toDocument(room));
  }

  async get(code: string): Promise<RoomRecord | null> {
    const doc = await this.rooms.findOne({ _id: code });
    if (!doc) return null;
    const room = fromDocument(doc);
    if (room.expiresAt.getTime() <= Date.now()) {
      await this.rooms.deleteOne({ _id: code });
      return null;
    }
    return room;
  }

  async put(room: RoomRecord): Promise<void> {
    await this.rooms.replaceOne({ _id: room.code }, toDocument(room), { upsert: true });
  }

  async recordBet(bet: BetRecord): Promise<void> {
    await this.bets.insertOne(bet);
  }
}
