import type { RoomView } from "@pokerirl/shared";
import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { subscribeRoom, type ConnectionStatus } from "../socket";

type RoomState = {
  room: RoomView | null;
  loading: boolean;
  loadError: string | null;
  connection: ConnectionStatus;
};

export function useRoom(code: string) {
  const [state, setState] = useState<RoomState>({
    room: null,
    loading: true,
    loadError: null,
    connection: "connecting",
  });

  const refresh = useCallback(async () => {
    const { room } = await api.getRoom(code);
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
          setState((current) => ({ ...current, room: event.room, loadError: null }));
        }
      },
      (connection) => setState((current) => ({ ...current, connection })),
    );
  }, [code]);

  return { ...state, refresh, setRoom: (room: RoomView) => setState((s) => ({ ...s, room })) };
}
