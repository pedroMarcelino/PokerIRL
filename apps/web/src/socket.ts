import { EVENTS, type ServerEvent } from "@pokerirl/shared";

// Derived from the current page: works on the Vercel domain, on localhost and
// behind the Docker proxy, with no hostname baked into the bundle.
const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
const WS_URL = `${protocol}//${window.location.host}/api/ws`;

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
