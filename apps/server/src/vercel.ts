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

// O Fastify monta o contexto/hooks de cada rota no evento `preReady`. Sem
// `ready()`, a primeira requisição quebra em preParsingHookRunner com
// "Cannot read properties of undefined (reading 'length')". `ready()` não
// abre porta: só finaliza a inicialização antes de exportar o servidor.
await app.ready();

export default app.server;
