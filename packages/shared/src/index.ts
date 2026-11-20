/**
 * Contrato compartilhado entre servidor e (futuro) frontend.
 * Se alterar algo aqui, atualize tambem docs/04-api-e-eventos.md.
 */

/** Valores fixos das fichas fisicas. */
export const CHIP_VALUES = [5, 10, 15, 25, 50] as const;

export type ChipValue = (typeof CHIP_VALUES)[number];

export function isChipValue(value: number): value is ChipValue {
  return (CHIP_VALUES as readonly number[]).includes(value);
}

/** Aposta válida: qualquer inteiro positivo (soma de fichas ou valor digitado). */
export function isValidBetAmount(value: number): boolean {
  return Number.isSafeInteger(value) && value > 0;
}

export const ROOM_CODE_LENGTH = 6;
export const MAX_NAME_LENGTH = 24;

/** Salas e histórico de apostas expiram depois de 24 horas. */
export const ROOM_TTL_MS = 24 * 60 * 60 * 1000;

/** Formas de apostar: livre (qualquer valor) ou com vez (mínimo = maior aposta da rodada). */
export const BET_MODES = ["free", "turn"] as const;
export type BetMode = (typeof BET_MODES)[number];
export const DEFAULT_BET_MODE: BetMode = "free";

export type PlayerView = {
  id: string;
  name: string;
  chips: number;
  betThisRound: number;
  isDealer: boolean;
};

/** Uma linha do log de atividade exibido no topo da sala. */
export type ActivityEntry = {
  id: string;
  kind: "start" | "bet" | "win";
  playerName: string;
  /** `null` para o início da partida, que não envolve fichas. */
  amount: number | null;
  round: number;
  /** ISO 8601. */
  at: string;
};

export type RoomView = {
  code: string;
  betMode: BetMode;
  /** IDs dos jogadores na ordem definida pelo dealer para a rodada. */
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
  status: "open";
  players: PlayerView[];
  /** Últimas jogadas da sala, da mais recente para a mais antiga. */
  activity: ActivityEntry[];
};

export type RoundResult = {
  winnerId: string;
  winnerName: string;
  amount: number;
  round: number;
};

export const EVENTS = {
  ROOM_STATE: "room:state",
  PLAYER_JOINED: "player:joined",
  BET_PLACED: "bet:placed",
  ROUND_CLOSED: "round:closed",
} as const;

export type ServerEvent =
  | { type: typeof EVENTS.ROOM_STATE; room: RoomView }
  | { type: typeof EVENTS.PLAYER_JOINED; player: PlayerView; room: RoomView }
  | { type: typeof EVENTS.BET_PLACED; playerId: string; amount: number; room: RoomView }
  | { type: typeof EVENTS.ROUND_CLOSED; result: RoundResult; room: RoomView };

/** Ordem das cartas, da mais fraca para a mais forte. */
export const CARD_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"] as const;
export type CardRank = (typeof CARD_RANKS)[number];

export type CardSuit = "spades" | "hearts" | "diamonds" | "clubs";
export type PlayingCard = { rank: CardRank; suit: CardSuit };

/**
 * Colinha: ordem de força das mãos, da mais forte para a mais fraca.
 * Cada mão traz cinco cartas de exemplo e uma explicação de como vencer com ela.
 */
export const POKER_HANDS = [
  {
    rank: 10,
    name: "Royal flush",
    hint: "A-K-Q-J-10 do mesmo naipe",
    howToWin:
      "Ás, Rei, Dama, Valete e 10 todos do mesmo naipe. É a mão mais forte que existe: só empata com outro royal flush.",
    cards: [
      { rank: "A", suit: "spades" },
      { rank: "K", suit: "spades" },
      { rank: "Q", suit: "spades" },
      { rank: "J", suit: "spades" },
      { rank: "10", suit: "spades" },
    ],
  },
  {
    rank: 9,
    name: "Straight flush",
    hint: "Cinco cartas em sequência do mesmo naipe",
    howToWin:
      "Cinco valores seguidos do mesmo naipe, como 9-8-7-6-5 de copas. Vence qualquer mão abaixo dela; entre dois straight flush, ganha o de maior carta.",
    cards: [
      { rank: "9", suit: "hearts" },
      { rank: "8", suit: "hearts" },
      { rank: "7", suit: "hearts" },
      { rank: "6", suit: "hearts" },
      { rank: "5", suit: "hearts" },
    ],
  },
  {
    rank: 8,
    name: "Quadra",
    hint: "Quatro cartas de mesmo valor",
    howToWin:
      "Quatro cartas iguais, como quatro reis. Quem tiver a quadra de maior valor ganha; a quinta carta (kicker) só decide se as quadras forem iguais.",
    cards: [
      { rank: "K", suit: "clubs" },
      { rank: "K", suit: "diamonds" },
      { rank: "K", suit: "hearts" },
      { rank: "K", suit: "spades" },
      { rank: "7", suit: "clubs" },
    ],
  },
  {
    rank: 7,
    name: "Full house",
    hint: "Trinca + par",
    howToWin:
      "Três cartas de um valor e duas de outro, como três 10 e dois 4. Compara-se primeiro a trinca; se ela for igual, compara-se o par.",
    cards: [
      { rank: "10", suit: "diamonds" },
      { rank: "10", suit: "hearts" },
      { rank: "10", suit: "clubs" },
      { rank: "4", suit: "spades" },
      { rank: "4", suit: "diamonds" },
    ],
  },
  {
    rank: 6,
    name: "Flush",
    hint: "Cinco cartas do mesmo naipe",
    howToWin:
      "Cinco cartas do mesmo naipe sem formar sequência, como Ás, Valete, 8, 5 e 2 de ouros. Compare a maior carta, depois a segunda, e assim por diante.",
    cards: [
      { rank: "A", suit: "diamonds" },
      { rank: "J", suit: "diamonds" },
      { rank: "8", suit: "diamonds" },
      { rank: "5", suit: "diamonds" },
      { rank: "2", suit: "diamonds" },
    ],
  },
  {
    rank: 5,
    name: "Straight",
    hint: "Cinco cartas em sequência",
    howToWin:
      "Cinco valores seguidos com naipes diferentes, como Dama-Valete-10-9-8. Ganha quem tiver a maior carta da sequência. Ás também pode abrir A-2-3-4-5, a menor sequência.",
    cards: [
      { rank: "Q", suit: "spades" },
      { rank: "J", suit: "clubs" },
      { rank: "10", suit: "diamonds" },
      { rank: "9", suit: "hearts" },
      { rank: "8", suit: "clubs" },
    ],
  },
  {
    rank: 4,
    name: "Trinca",
    hint: "Três cartas de mesmo valor",
    howToWin:
      "Três cartas iguais, como três 7. Compare a trinca primeiro; se as trincas forem iguais, decidem as duas cartas restantes (kickers).",
    cards: [
      { rank: "7", suit: "hearts" },
      { rank: "7", suit: "diamonds" },
      { rank: "7", suit: "clubs" },
      { rank: "K", suit: "spades" },
      { rank: "4", suit: "diamonds" },
    ],
  },
  {
    rank: 3,
    name: "Dois pares",
    hint: "Dois pares diferentes",
    howToWin:
      "Dois pares de valores diferentes, como par de áses e par de 6. Ganha o maior par; se ele for igual, compara o segundo par e depois a quinta carta.",
    cards: [
      { rank: "A", suit: "clubs" },
      { rank: "A", suit: "hearts" },
      { rank: "6", suit: "diamonds" },
      { rank: "6", suit: "spades" },
      { rank: "9", suit: "hearts" },
    ],
  },
  {
    rank: 2,
    name: "Um par",
    hint: "Duas cartas de mesmo valor",
    howToWin:
      "Apenas duas cartas iguais. Um par de áses é o melhor par possível: para ganhar com esta mão, você precisa do par de maior valor e, em empate, dos melhores kickers.",
    cards: [
      { rank: "A", suit: "spades" },
      { rank: "A", suit: "hearts" },
      { rank: "K", suit: "diamonds" },
      { rank: "9", suit: "clubs" },
      { rank: "5", suit: "diamonds" },
    ],
  },
  {
    rank: 1,
    name: "Carta alta",
    hint: "Nenhuma combinação acima",
    howToWin:
      "Nenhuma combinação: vence quem tiver a carta mais alta. No exemplo, o Ás é a carta mais forte; se empatar, compara a segunda carta (Rei), e assim por diante.",
    cards: [
      { rank: "A", suit: "clubs" },
      { rank: "K", suit: "hearts" },
      { rank: "9", suit: "diamonds" },
      { rank: "6", suit: "spades" },
      { rank: "2", suit: "diamonds" },
    ],
  },
] as const;

export type PokerHand = (typeof POKER_HANDS)[number];
