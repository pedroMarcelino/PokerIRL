import { buildApp } from "./app.js";
import { createRoomService } from "./domain/room-service.js";
import { env } from "./env.js";
import { attachRealtime, type Broadcaster } from "./realtime/websocket.js";
import { createRepository } from "./repository.js";

// Entrypoint usado pelo serviço "server" na Vercel. As rotas públicas entram
// por /api (rewrite do vercel.json) e o WebSocket por /api/ws no mesmo domínio.
const service = createRoomService(await createRepository());

let realtime: Broadcaster = { broadcast: () => {} };
const broadcast: Broadcaster = { broadcast: (code, event) => realtime.broadcast(code, event) };

const app = await buildApp({
  service,
  broadcast,
  corsOrigin: env.CORS_ORIGIN,
  basePath: "/api",
});

realtime = attachRealtime(app.server, service, "/api/ws");

export default app.server;
