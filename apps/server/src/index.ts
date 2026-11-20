import { buildApp } from "./app.js";
import { connectMongo, disconnectMongo } from "./db/mongo.js";
import { env } from "./env.js";
import { createRoomService } from "./domain/room-service.js";
import { attachRealtime, type Broadcaster } from "./realtime/websocket.js";
import { MemoryRoomRepository } from "./repositories/memory.js";
import { MongoRoomRepository } from "./repositories/mongo.js";
import type { RoomRepository } from "./repositories/types.js";

async function main(): Promise<void> {
  let repository: RoomRepository;

  if (env.DB_DRIVER === "mongodb") {
    const db = await connectMongo(env.MONGODB_URI!, env.MONGODB_DB);
    const mongoRepository = new MongoRoomRepository(db);
    await mongoRepository.init();
    repository = mongoRepository;
  } else {
    repository = new MemoryRoomRepository();
  }

  const service = createRoomService(repository);

  // Deixa explícito na subida qual repositório foi selecionado.
  console.log(`[startup] banco=${env.DB_DRIVER} database=${env.MONGODB_DB}`);

  // As rotas são registradas antes do WebSocket existir; este proxy liga os dois.
  let realtime: Broadcaster = { broadcast: () => {} };
  const broadcast: Broadcaster = { broadcast: (code, event) => realtime.broadcast(code, event) };

  const app = await buildApp({ service, broadcast, corsOrigin: env.CORS_ORIGIN });
  realtime = attachRealtime(app.server, service);

  await app.listen({ port: env.PORT, host: "0.0.0.0" });

  const shutdown = async () => {
    await app.close();
    await disconnectMongo();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
