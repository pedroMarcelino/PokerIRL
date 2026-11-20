import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { AppError } from "./domain/errors.js";
import type { RoomService } from "./domain/room-service.js";
import type { Broadcaster } from "./realtime/websocket.js";
import { roomsRoutes } from "./routes/rooms.js";

type Dependencies = {
  service: RoomService;
  broadcast: Broadcaster;
  corsOrigin?: string;
  /** Prefixo das rotas públicas. Local/Docker não usam; na Vercel é "/api". */
  basePath?: string;
};

export async function buildApp(dependencies: Dependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  // Sem origem configurada, reflete a origem da requisição. Com /api no mesmo
  // domínio o CORS nem chega a ser necessário, mas isso evita travar previews.
  await app.register(cors, { origin: dependencies.corsOrigin ?? true });

  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.status).send({
        error: { code: error.code, message: error.message },
      });
    }
    app.log.error(error);
    return reply.code(500).send({
      error: { code: "INTERNAL_ERROR", message: "Erro interno do servidor" },
    });
  });

  if (dependencies.basePath) {
    await app.register(roomsRoutes, { ...dependencies, prefix: dependencies.basePath });
  } else {
    await app.register(roomsRoutes, dependencies);
  }
  return app;
}
