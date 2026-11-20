import type { PlayerView } from "@pokerirl/shared";
import { useState } from "react";

type Props = {
  players: PlayerView[];
  order: string[];
  pending: boolean;
  onReorder: (playerIds: string[]) => void;
};

export function TurnOrderCard({ players, order, pending, onReorder }: Props) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const byId = new Map(players.map((player) => [player.id, player]));
  const ids = [
    ...order.filter((id) => byId.has(id)),
    ...players.map((player) => player.id).filter((id) => !order.includes(id)),
  ];

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target]!, next[index]!];
    onReorder(next);
  }

  function dropOn(targetId: string) {
    if (!draggingId || draggingId === targetId) return;
    const from = ids.indexOf(draggingId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const next = [...ids];
    next.splice(from, 1);
    next.splice(to, 0, draggingId);
    onReorder(next);
    setDraggingId(null);
  }

  return (
    <section className="turn-order" aria-label="Ordem de jogo">
      <div className="turn-order__header">
        <span className="eyebrow">Ordem de jogo</span>
        <span className="turn-order__hint">Arraste ou use as setas</span>
      </div>

      <ol className="turn-order__list">
        {ids.map((id, index) => {
          const player = byId.get(id)!;
          return (
            <li
              key={id}
              className={`turn-order__item ${draggingId === id ? "turn-order__item--dragging" : ""}`}
              draggable={!pending}
              onDragStart={(event) => {
                setDraggingId(id);
                event.dataTransfer.effectAllowed = "move";
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                dropOn(id);
              }}
              onDragEnd={() => setDraggingId(null)}
            >
              <span className="turn-order__index">{index + 1}</span>
              <span className="turn-order__drag" aria-hidden="true">
                ⠿
              </span>
              <span className="turn-order__name">
                {player.isDealer && (
                  <span role="img" aria-label="Dealer">
                    👑
                  </span>
                )}{" "}
                {player.name}
              </span>
              <span className="turn-order__actions">
                <button
                  type="button"
                  aria-label={`Subir ${player.name} na ordem`}
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Descer ${player.name} na ordem`}
                  disabled={pending || index === ids.length - 1}
                  onClick={() => move(index, 1)}
                >
                  ▼
                </button>
              </span>
            </li>
          );
        })}
      </ol>

      <p className="turn-order__note">
        Só o dealer muda esta ordem. Ela continua valendo nas próximas rodadas.
      </p>
    </section>
  );
}
