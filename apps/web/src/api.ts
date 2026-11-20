import type { BetMode, RoomView, RoundResult } from "@pokerirl/shared";

// Mesmo domínio em produção (Vercel) e no Docker (nginx). No dev, o Vite faz
// proxy de /api para http://localhost:3000.
const API_BASE = "/api";

export type CreatedPlayer = { room: RoomView; playerId: string; token: string };
export type ClosedRound = { room: RoomView; result: RoundResult };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

type ErrorPayload = { error?: { code?: string; message?: string } };

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "content-type": "application/json",
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(options.headers as Record<string, string> | undefined),
      },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Não foi possível falar com o servidor");
  }

  const payload = (await response.json().catch(() => null)) as (T & ErrorPayload) | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      payload?.error?.code ?? "UNKNOWN_ERROR",
      payload?.error?.message ?? "Não foi possível completar a operação",
    );
  }
  if (!payload) throw new ApiError(response.status, "INVALID_RESPONSE", "Resposta inválida");
  return payload;
}

export const api = {
  createRoom(dealerName: string, initialChips: number, betMode: BetMode) {
    return request<CreatedPlayer>("/rooms", {
      method: "POST",
      body: JSON.stringify({ dealerName, initialChips, betMode }),
    });
  },

  joinRoom(code: string, name: string) {
    return request<CreatedPlayer>(`/rooms/${code}/join`, {
      method: "POST",
      body: JSON.stringify({ name }),
    });
  },

  getRoom(code: string) {
    return request<{ room: RoomView }>(`/rooms/${code}`);
  },

  reorderPlayers(code: string, token: string, playerIds: string[]) {
    return request<{ room: RoomView }>(
      `/rooms/${code}/turn-order`,
      { method: "PUT", body: JSON.stringify({ playerIds }) },
      token,
    );
  },

  startGame(code: string, token: string) {
    return request<{ room: RoomView }>(
      `/rooms/${code}/start`,
      { method: "POST" },
      token,
    );
  },

  placeBet(code: string, token: string, amount: number) {
    return request<{ room: RoomView }>(
      `/rooms/${code}/bets`,
      { method: "POST", body: JSON.stringify({ amount }) },
      token,
    );
  },

  closeRound(code: string, token: string, winnerId: string) {
    return request<ClosedRound>(
      `/rooms/${code}/rounds/close`,
      { method: "POST", body: JSON.stringify({ winnerId }) },
      token,
    );
  },
};
