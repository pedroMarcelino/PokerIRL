import type { BetRecord, RoomRecord, RoomRepository } from "./types.js";

export class MemoryRoomRepository implements RoomRepository {
  private readonly rooms = new Map<string, RoomRecord>();
  readonly bets: BetRecord[] = [];

  async insert(room: RoomRecord): Promise<void> {
    if (this.rooms.has(room.code)) throw new Error("Código já existe");
    this.rooms.set(room.code, structuredClone(room));
  }

  async get(code: string): Promise<RoomRecord | null> {
    const room = this.rooms.get(code);
    if (!room) return null;
    if (!room.expiresAt || room.expiresAt.getTime() <= Date.now()) {
      this.rooms.delete(code);
      return null;
    }
    return structuredClone(room);
  }

  async put(room: RoomRecord): Promise<void> {
    this.rooms.set(room.code, structuredClone(room));
  }

  async recordBet(bet: BetRecord): Promise<void> {
    this.bets.push(structuredClone(bet));
  }
}
