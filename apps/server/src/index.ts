import { buildApp } from "./app.js";
import { disconnectMongo } from "./db/mongo.js";
import { createRoomService } from "./domain/room-service.js";
import { env } from "./env.js";
import { attachRealtime, type Broadcaster } from "./realtime/websocket.js";
import { createRepository } from "./repository.js";

async function main(): Promise<void> {
  const repository = await createRepository();
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
