import type { RoomView } from "@porkerirl/shared";
import { ConnectionBadge } from "./ConnectionBadge";
import type { ConnectionStatus } from "../socket";

type Props = {
  room: RoomView;
  connection: ConnectionStatus;
};

export function PotCard({ room, connection }: Props) {
  return (
    <section className="pot-card" aria-label="Estado da rodada">
      <div className="pot-card__top">
        <span className="eyebrow">Rodada {room.round}</span>
        <ConnectionBadge status={connection} />
      </div>
      <p className="pot-card__label">Pote total</p>
      <p className="pot-card__value">{room.pot}</p>
      <p className="pot-card__hint">
        Valor da rodada: <strong>{room.currentBet}</strong>
        <span className="pot-card__mode">
          {room.betMode === "turn" ? "Com vez (mínimo igual ao valor da rodada)" : "Sem sequência"}
        </span>
      </p>
    </section>
  );
}
