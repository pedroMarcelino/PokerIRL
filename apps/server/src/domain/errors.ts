export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const validationError = (message: string) => new AppError(400, "VALIDATION_ERROR", message);
export const unauthorized = (message = "Token inválido ou ausente") => new AppError(403, "UNAUTHORIZED", message);
export const roomNotFound = () => new AppError(404, "ROOM_NOT_FOUND", "Sala não encontrada");
export const nameTaken = () => new AppError(409, "NAME_TAKEN", "Esse nome já está em uso na sala");
export const insufficientChips = () => new AppError(409, "INSUFFICIENT_CHIPS", "Fichas insuficientes");
export const invalidWinner = () => new AppError(409, "INVALID_WINNER", "Vencedor não pertence à sala");
export const betTooSmall = (missing: number) =>
  new AppError(
    409,
    "BET_TOO_SMALL",
    `Nesta sala você precisa completar pelo menos ${missing} fichas nesta rodada`,
  );

export const notYourTurn = (playerName?: string) =>
  new AppError(
    409,
    "NOT_YOUR_TURN",
    playerName
      ? `Ainda não é a sua vez. Agora é a vez de ${playerName}.`
      : "Ainda não é a sua vez de apostar.",
  );

export const gameNotStarted = () =>
  new AppError(409, "GAME_NOT_STARTED", "O dealer ainda não iniciou a partida");

export const gameAlreadyStarted = () =>
  new AppError(409, "GAME_ALREADY_STARTED", "A partida já começou e a ordem não pode mais ser alterada");
