import type { PlayerView } from "@pokerirl/shared";
import { useState } from "react";

type Props = {
  players: PlayerView[];
  order: string[];
  currentPlayerId: string | null;
  locked: boolean;
  pending: boolean;
  onReorder: (playerIds: string[]) => void;
};

export function TurnOrderCard({
  players,
  order,
  currentPlayerId,
  locked,
  pending,
  onReorder,
}: Props) {
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
        <span className="turn-order__hint">
          {locked ? "Travada depois do início" : "Arraste ou use as setas"}
        </span>
      </div>

      <ol className="turn-order__list">
        {ids.map((id, index) => {
          const player = byId.get(id)!;
          return (
            <li
              key={id}
              className={[
                "turn-order__item",
                draggingId === id ? "turn-order__item--dragging" : "",
                currentPlayerId === id ? "turn-order__item--current" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              draggable={!pending && !locked}
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
                {currentPlayerId === id && <span className="turn-order__badge">vez</span>}
              </span>
              <span className="turn-order__actions">
                <button
                  type="button"
                  aria-label={`Subir ${player.name} na ordem`}
                  disabled={pending || locked || index === 0}
                  onClick={() => move(index, -1)}
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Descer ${player.name} na ordem`}
                  disabled={pending || locked || index === ids.length - 1}
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
        {locked
          ? "Ordem travada: ela vale até o fim da partida e quem começa gira a cada rodada."
          : "Só o dealer muda esta ordem. Confira antes de começar: depois fica travada."}
      </p>
    </section>
  );
}
