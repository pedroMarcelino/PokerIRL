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
    // Erros de parsing do Fastify (JSON vazio, corpo malformado etc.) já vêm
    // com status 4xx. Transformá-los em 500 escondia a causa real do cliente.
    const cause = error as { statusCode?: number; message?: string };
    const status =
      typeof cause.statusCode === "number" && cause.statusCode >= 400 && cause.statusCode < 500
        ? cause.statusCode
        : 500;
    if (status === 500) app.log.error(error);
    return reply.code(status).send({
      error: {
        code:
          status === 500
            ? "INTERNAL_ERROR"
            : status === 400
              ? "VALIDATION_ERROR"
              : "REQUEST_ERROR",
        message: status === 500 ? "Erro interno do servidor" : (cause.message ?? "Requisição inválida"),
      },
    });
  });

  if (dependencies.basePath) {
    await app.register(roomsRoutes, { ...dependencies, prefix: dependencies.basePath });
  } else {
    await app.register(roomsRoutes, dependencies);
  }
  return app;
}
