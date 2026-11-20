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
