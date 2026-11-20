import type { PlayerView } from "@pokerirl/shared";
import { useEffect, useRef, useState } from "react";

type Props = {
  players: PlayerView[];
  pot: number;
  pending: boolean;
  onConfirm: (winnerId: string) => void;
  onClose: () => void;
};

export function CloseRoundDialog({ players, pot, pending, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onClose();
      }}
    >
      <div className="modal__content">
        <p className="eyebrow">Encerrar rodada</p>
        <h2>Quem ganhou?</h2>
        <p className="modal__pot">
          O pote de <strong>{pot}</strong> fichas vai para o jogador escolhido.
        </p>

        <div className="winner-list" role="radiogroup" aria-label="Escolha o vencedor">
          {players.map((player) => (
            <button
              key={player.id}
              type="button"
              role="radio"
              aria-checked={winnerId === player.id}
              className={`winner-option ${winnerId === player.id ? "winner-option--selected" : ""}`}
              disabled={pending}
              onClick={() => setWinnerId(player.id)}
            >
              <span className="winner-option__mark" aria-hidden="true" />
              <span>
                {player.isDealer && <span aria-hidden="true">👑 </span>}
                {player.name}
              </span>
              <span className="winner-option__chips">{player.chips} fichas</span>
            </button>
          ))}
        </div>

        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button
            type="button"
            className="button button--primary"
            disabled={!winnerId || pending}
            onClick={() => winnerId && onConfirm(winnerId)}
          >
            {pending ? "Encerrando…" : "Dar o pote ao vencedor"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
