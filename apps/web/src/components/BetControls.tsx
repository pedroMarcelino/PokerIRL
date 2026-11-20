import { CHIP_VALUES, type ChipValue } from "@porkerirl/shared";

type Props = {
  amount: number;
  availableChips: number;
  minimumBet: number;
  pending: boolean;
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
  onAddChip,
  onAmountChange,
  onClear,
  onConfirm,
}: Props) {
  const overBalance = amount > availableChips;
  const belowMinimum = minimumBet > 0 && amount < minimumBet;
  const valid = Number.isSafeInteger(amount) && amount > 0 && !overBalance && !belowMinimum;

  return (
    <section className="bet-controls" aria-label="Fazer aposta">
      <div className="bet-controls__header">
        <span className="eyebrow">Sua aposta</span>
        <span className="bet-controls__available">{availableChips} fichas disponíveis</span>
      </div>

      <div className="chip-row" role="group" aria-label="Some fichas à aposta">
        {CHIP_VALUES.map((value) => {
          const disabled = pending || value > availableChips - amount;
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

      {minimumBet > 0 && (
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
          disabled={pending}
          aria-invalid={overBalance || belowMinimum}
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
          disabled={pending || amount === 0}
          onClick={onClear}
        >
          Limpar
        </button>
      </div>

      {overBalance && (
        <p className="bet-controls__error" role="alert">
          Você tem apenas {availableChips} fichas disponíveis.
        </p>
      )}
      {belowMinimum && !overBalance && (
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
