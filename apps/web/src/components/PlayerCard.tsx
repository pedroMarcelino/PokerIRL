import type { PlayerView } from "@pokerirl/shared";

type Props = {
  player: PlayerView;
  position: number;
  isMe: boolean;
  isLastWinner: boolean;
};

export function PlayerCard({ player, position, isMe, isLastWinner }: Props) {
  const classes = [
    "player-card",
    isMe ? "player-card--me" : "",
    isLastWinner ? "player-card--winner" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <li className={classes}>
      <div className="player-card__identity">
        <span className="player-card__name">
          <span className="player-card__position" aria-label={`${position}º na ordem de jogo`}>
            {position}º
          </span>
          {player.isDealer && (
            <span className="crown" role="img" aria-label="Dealer">
              👑
            </span>
          )}
          {player.name}
          {isMe && <span className="player-card__you">você</span>}
        </span>
        {isLastWinner && <span className="player-card__winner">ganhou a última</span>}
      </div>
      <div className="player-card__numbers">
        <span className="player-card__chips">
          <span className="player-card__caption">fichas</span>
          <strong>{player.chips}</strong>
        </span>
        <span className="player-card__bet">
          <span className="player-card__caption">apostou</span>
          <strong>{player.betThisRound}</strong>
        </span>
      </div>
    </li>
  );
}
