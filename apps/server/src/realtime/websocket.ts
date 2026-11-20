import type { Server as HttpServer } from "node:http";
import { EVENTS, type ServerEvent } from "@porkerirl/shared";
import { WebSocket, WebSocketServer } from "ws";
import type { RoomService } from "../domain/room-service.js";

export type Broadcaster = {
  broadcast(code: string, event: ServerEvent): void;
};

type SubscribeMessage = { type: "subscribe"; code: string };

export function attachRealtime(server: HttpServer, service: RoomService): Broadcaster {
  const wss = new WebSocketServer({ server, path: "/ws" });
  const subscriptions = new Map<WebSocket, string>();

  wss.on("connection", (socket) => {
    socket.on("message", async (raw) => {
      try {
        const message = JSON.parse(raw.toString()) as SubscribeMessage;
        if (message.type !== "subscribe" || !/^\d{6}$/.test(message.code)) {
          socket.send(JSON.stringify({ type: "error", message: "Mensagem inválida" }));
          return;
        }

        const room = await service.getRoom(message.code);
        subscriptions.set(socket, message.code);
        socket.send(JSON.stringify({ type: EVENTS.ROOM_STATE, room } satisfies ServerEvent));
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Sala não encontrada" }));
      }
    });

    socket.on("close", () => subscriptions.delete(socket));
  });

  return {
    broadcast(code, event) {
      const payload = JSON.stringify(event);
      for (const [socket, roomCode] of subscriptions) {
        if (roomCode === code && socket.readyState === WebSocket.OPEN) {
          socket.send(payload);
        }
      }
    },
  };
}
