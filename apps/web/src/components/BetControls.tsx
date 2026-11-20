import { CHIP_VALUES, type ChipValue } from "@pokerirl/shared";

type Props = {
  amount: number;
  availableChips: number;
  minimumBet: number;
  pending: boolean;
  /** No modo por rodada, só quem está na vez pode apostar. */
  isMyTurn: boolean;
  /** No modo por rodada, ninguém aposta antes do dealer iniciar a partida. */
  matchStarted: boolean;
  currentPlayerName: string | null;
  onAddChip: (value: ChipValue) => void;
  onAmountChange: (value: number) => void;
  onClear: () => void;
  onConfirm: () => void;
};

export function BetControls({
  amount,
  availableChips,
  minimumBet,
  pending,
  isMyTurn,
  matchStarted,
  currentPlayerName,
  onAddChip,
  onAmountChange,
  onClear,
  onConfirm,
}: Props) {
  const overBalance = amount > availableChips;
  const belowMinimum = minimumBet > 0 && amount < minimumBet;
  const blocked = !isMyTurn || !matchStarted;
  const valid =
    !blocked && Number.isSafeInteger(amount) && amount > 0 && !overBalance && !belowMinimum;

  const status = !matchStarted
    ? "Aguardando o início"
    : !isMyTurn
      ? `Vez de ${currentPlayerName ?? "outro jogador"}`
      : `${availableChips} fichas disponíveis`;

  return (
    <section className="bet-controls" aria-label="Fazer aposta">
      <div className="bet-controls__header">
        <span className="eyebrow">Sua aposta</span>
        <span className="bet-controls__available">{status}</span>
      </div>

      {!matchStarted && (
        <p className="bet-controls__wait" role="status">
          O dealer ainda não começou a partida.
        </p>
      )}
      {matchStarted && !isMyTurn && (
        <p className="bet-controls__wait" role="status">
          Agora é a vez de {currentPlayerName ?? "outro jogador"}. Sua aposta é liberada quando a vez
          chegar.
        </p>
      )}

      <div className="chip-row" role="group" aria-label="Some fichas à aposta">
        {CHIP_VALUES.map((value) => {
          const disabled = pending || blocked || value > availableChips - amount;
          return (
            <button
              key={value}
              type="button"
              className="chip"
              aria-label={`Somar ficha de ${value}`}
              disabled={disabled}
              onClick={() => onAddChip(value)}
            >
              +{value}
            </button>
          );
        })}
      </div>

      {minimumBet > 0 && !blocked && (
        <p className="bet-controls__minimum">
          Nesta sala você precisa apostar pelo menos <strong>{minimumBet}</strong> fichas nesta
          rodada.
        </p>
      )}

      <label className="bet-controls__label" htmlFor="bet-amount">
        Valor da aposta
      </label>
      <div className="bet-controls__input-row">
        <input
          id="bet-amount"
          type="number"
          min={Math.max(1, minimumBet)}
          max={availableChips}
          step={1}
          inputMode="numeric"
          placeholder={minimumBet > 0 ? String(minimumBet) : "0"}
          value={amount === 0 ? "" : amount}
          disabled={pending || blocked}
          aria-invalid={!blocked && (overBalance || belowMinimum)}
          onChange={(event) => {
            const raw = event.target.value;
            if (raw === "") return onAmountChange(0);
            const parsed = Number(raw);
            if (Number.isSafeInteger(parsed)) onAmountChange(parsed);
          }}
        />
        <button
          type="button"
          className="button button--ghost bet-controls__clear"
          disabled={pending || blocked || amount === 0}
          onClick={onClear}
        >
          Limpar
        </button>
      </div>

      {!blocked && overBalance && (
        <p className="bet-controls__error" role="alert">
          Você tem apenas {availableChips} fichas disponíveis.
        </p>
      )}
      {!blocked && belowMinimum && !overBalance && (
        <p className="bet-controls__error" role="alert">
          Faltam {minimumBet - amount} fichas para alcançar a aposta da rodada.
        </p>
      )}

      <button
        type="button"
        className="button button--primary button--wide bet-controls__confirm"
        disabled={!valid || pending}
        onClick={onConfirm}
      >
        {pending
          ? "Apostando…"
          : !matchStarted
            ? "Aguardando o dealer"
            : !isMyTurn
              ? "Não é sua vez"
              : belowMinimum
                ? `Aposta mínima: ${minimumBet}`
                : valid
                  ? `Confirmar aposta de ${amount}`
                  : "Escolha ou digite um valor"}
      </button>
      <p className="bet-controls__hint">Toque nas fichas para somar ou digite o valor direto.</p>
    </section>
  );
}
