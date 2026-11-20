import type { Collection, Db } from "mongodb";
import type { BetRecord, RoomRecord, RoomRepository } from "./types.js";

type RoomDocument = Omit<RoomRecord, "code"> & { _id: string };

function toDocument(room: RoomRecord): RoomDocument {
  const { code, ...rest } = room;
  return { _id: code, ...rest };
}

function fromDocument(doc: RoomDocument): RoomRecord {
  const { _id, ...rest } = doc;
  // Salas antigas continuam válidas: modo livre e ordem de entrada na sala.
  return {
    code: _id,
    ...rest,
    betMode: rest.betMode ?? "free",
    turnOrder: rest.turnOrder?.length ? rest.turnOrder : rest.players.map((player) => player.id),
  };
}

export class MongoRoomRepository implements RoomRepository {
  private readonly rooms: Collection<RoomDocument>;
  private readonly bets: Collection<BetRecord>;

  constructor(db: Db) {
    this.rooms = db.collection<RoomDocument>("rooms");
    this.bets = db.collection<BetRecord>("bets");
  }

  async init(): Promise<void> {
    await this.bets.createIndex({ roomCode: 1, round: 1 });
  }

  async insert(room: RoomRecord): Promise<void> {
    await this.rooms.insertOne(toDocument(room));
  }

  async get(code: string): Promise<RoomRecord | null> {
    const doc = await this.rooms.findOne({ _id: code });
    return doc ? fromDocument(doc) : null;
  }

  async put(room: RoomRecord): Promise<void> {
    await this.rooms.replaceOne({ _id: room.code }, toDocument(room), { upsert: true });
  }

  async recordBet(bet: BetRecord): Promise<void> {
    await this.bets.insertOne(bet);
  }
}
