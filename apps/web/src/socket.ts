import { EVENTS, type ServerEvent } from "@porkerirl/shared";

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:3000/ws";

export type ConnectionStatus = "connecting" | "online" | "offline";

export function subscribeRoom(
  code: string,
  onEvent: (event: ServerEvent) => void,
  onStatus: (status: ConnectionStatus) => void,
): () => void {
  let socket: WebSocket | null = null;
  let retryTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function connect() {
    if (disposed) return;
    onStatus("connecting");
    socket = new WebSocket(WS_URL);

    socket.onopen = () => {
      onStatus("online");
      socket?.send(JSON.stringify({ type: "subscribe", code }));
    };

    socket.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data as string) as ServerEvent;
        if (Object.values(EVENTS).includes(event.type)) onEvent(event);
      } catch {
        // Ignora mensagens que não seguem o contrato.
      }
    };

    socket.onerror = () => socket?.close();

    socket.onclose = () => {
      if (disposed) return;
      onStatus("offline");
      retryTimer = setTimeout(connect, 1500);
    };
  }

  connect();

  return () => {
    disposed = true;
    if (retryTimer) clearTimeout(retryTimer);
    socket?.close();
  };
}
