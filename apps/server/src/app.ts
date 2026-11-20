import cors from "@fastify/cors";
import Fastify, { type FastifyInstance } from "fastify";
import { AppError } from "./domain/errors.js";
import type { RoomService } from "./domain/room-service.js";
import type { Broadcaster } from "./realtime/websocket.js";
import { roomsRoutes } from "./routes/rooms.js";

type Dependencies = {
  service: RoomService;
  broadcast: Broadcaster;
  corsOrigin: string;
};

export async function buildApp(dependencies: Dependencies): Promise<FastifyInstance> {
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: dependencies.corsOrigin });

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

  await app.register(roomsRoutes, dependencies);
  return app;
}
