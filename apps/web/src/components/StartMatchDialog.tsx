import type { BetMode, PlayerView } from "@pokerirl/shared";
import { useEffect, useRef } from "react";

type Props = {
  players: PlayerView[];
  order: string[];
  betMode: BetMode;
  pending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function StartMatchDialog({ players, order, betMode, pending, onConfirm, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const byId = new Map(players.map((player) => [player.id, player]));
  const ids = [
    ...order.filter((id) => byId.has(id)),
    ...players.map((player) => player.id).filter((id) => !order.includes(id)),
  ];
  const starter = byId.get(ids[0] ?? "")?.name ?? "o primeiro da ordem";

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
        <p className="eyebrow">Começar partida</p>
        <h2>Confira a ordem</h2>
        {betMode === "turn" ? (
          <p className="modal__pot">
            Quem começa é <strong>{starter}</strong>. Ao iniciar, a ordem fica travada e a vez passa
            a valer. A cada rodada o início gira para o próximo jogador.
          </p>
        ) : (
          <p className="modal__pot">
            Ao iniciar, a ordem fica travada. As apostas continuam livres — sem vez obrigatória.
          </p>
        )}

        <ol className="start-order__list">
          {ids.map((id, index) => {
            const player = byId.get(id)!;
            return (
              <li key={id} className="start-order__item">
                <span className="turn-order__index">{index + 1}</span>
                <span>
                  {player.isDealer && <span aria-label="Dealer">👑 </span>}
                  {player.name}
                </span>
                {index === 0 && betMode === "turn" && (
                  <span className="start-order__badge">começa</span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="modal__actions">
          <button type="button" className="button button--ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button type="button" className="button button--primary" onClick={onConfirm} disabled={pending}>
            {pending ? "Iniciando…" : "Começar partida"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
