import { connectMongo } from "./db/mongo.js";
import { env } from "./env.js";
import { MemoryRoomRepository } from "./repositories/memory.js";
import { MongoRoomRepository } from "./repositories/mongo.js";
import type { RoomRepository } from "./repositories/types.js";

/** O banco é escolhido por DB_DRIVER; na Vercel use mongodb (memória não sobrevive a instâncias). */
export async function createRepository(): Promise<RoomRepository> {
  if (env.DB_DRIVER === "mongodb") {
    const db = await connectMongo(env.MONGODB_URI!, env.MONGODB_DB);
    const repository = new MongoRoomRepository(db);
    await repository.init();
    return repository;
  }
  return new MemoryRoomRepository();
}
