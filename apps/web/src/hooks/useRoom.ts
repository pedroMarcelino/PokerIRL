import type { RoomView } from "@pokerirl/shared";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api";
import { subscribeRoom, type ConnectionStatus } from "../socket";

type RoomState = {
  room: RoomView | null;
  loading: boolean;
  loadError: string | null;
  connection: ConnectionStatus;
};

/**
 * Uma resposta HTTP pode ter sido iniciada antes de um evento do WebSocket.
 * Se a sala local já conhece uma jogada que a resposta não traz, ela é antiga
 * e não deve voltar o estado da tela.
 */
function isStale(fetched: RoomView, current: RoomView | null): boolean {
  const latestId = current?.activity[0]?.id;
  return Boolean(latestId && !fetched.activity.some((entry) => entry.id === latestId));
}

export function useRoom(code: string) {
  const [state, setState] = useState<RoomState>({
    room: null,
    loading: true,
    loadError: null,
    connection: "connecting",
  });
  const roomRef = useRef<RoomView | null>(null);

  useEffect(() => {
    roomRef.current = state.room;
  }, [state.room]);

  const refresh = useCallback(async () => {
    const { room } = await api.getRoom(code);
    if (isStale(room, roomRef.current)) return null;
    roomRef.current = room;
    setState((current) => ({ ...current, room, loadError: null }));
    return room;
  }, [code]);

  useEffect(() => {
    let active = true;
    refresh()
      .catch((error: Error) => {
        if (active) setState((current) => ({ ...current, loadError: error.message }));
      })
      .finally(() => {
        if (active) setState((current) => ({ ...current, loading: false }));
      });
    return () => {
      active = false;
    };
  }, [refresh]);

  useEffect(() => {
    return subscribeRoom(
      code,
      (event) => {
        if ("room" in event) {
          roomRef.current = event.room;
          setState((current) => ({ ...current, room: event.room, loadError: null }));
        }
      },
      (connection) => setState((current) => ({ ...current, connection })),
    );
  }, [code]);

  // O WebSocket transmite para os sockets conectados na mesma instância. Na
  // Vercel, uma aposta pode chegar por outra instância e o evento não aparece.
  // Esta consulta leve garante que vez, pote e log convirjam em poucos segundos.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState !== "visible") return;
      refresh().catch(() => {});
    }, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  return {
    ...state,
    refresh,
    setRoom: (room: RoomView) => {
      roomRef.current = room;
      setState((current) => ({ ...current, room }));
    },
  };
}
