export type PlayerRecord = {
  id: string;
  name: string;
  chips: number;
  betThisRound: number;
  isDealer: boolean;
  token: string;
};

import type { ActivityEntry, BetMode } from "@pokerirl/shared";

export type RoomRecord = {
  code: string;
  betMode: BetMode;
  turnOrder: string[];
  initialChips: number;
  round: number;
  pot: number;
  currentBet: number;
  lastWinnerId: string | null;
  /** ID de quem deve apostar agora no modo `turn`; `null` no modo `free` ou antes do início. */
  currentPlayerId: string | null;
  /** `true` depois que o dealer iniciou a partida e travou a ordem de jogo. */
  started: boolean;
/** ID de quem começou a rodada atual; usado para girar o início da próxima. */
  startingPlayerId: string | null;
  status: "open";
  players: PlayerRecord[];
  /** Momento em que a sala é apagada (TTL de 24h no Mongo). */
  expiresAt: Date;
  /** Log curto de atividade, do mais recente para o mais antigo. */
  activity: ActivityEntry[];
};

export type BetRecord = {
  roomCode: string;
  playerId: string;
  playerName: string;
  amount: number;
  round: number;
  createdAt: Date;
};

export interface RoomRepository {
  insert(room: RoomRecord): Promise<void>;
  get(code: string): Promise<RoomRecord | null>;
  put(room: RoomRecord): Promise<void>;
  recordBet(bet: BetRecord): Promise<void>;
}
