import {
  CARD_RANKS,
  POKER_HANDS,
  type CardRank,
  type CardSuit,
  type PlayingCard,
} from "@pokerirl/shared";
import { useState } from "react";

const SUIT_SYMBOL: Record<CardSuit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};

const SUIT_LABEL: Record<CardSuit, string> = {
  spades: "espadas",
  hearts: "copas",
  diamonds: "ouros",
  clubs: "paus",
};

const RANK_LABEL: Record<CardRank, string> = {
  A: "Ás",
  K: "Rei",
  Q: "Dama",
  J: "Valete",
  "10": "10",
  "9": "9",
  "8": "8",
  "7": "7",
  "6": "6",
  "5": "5",
  "4": "4",
  "3": "3",
  "2": "2",
};

function cardLabel(card: PlayingCard): string {
  return `${RANK_LABEL[card.rank]} de ${SUIT_LABEL[card.suit]}`;
}

function PlayingCardView({ card }: { card: PlayingCard }) {
  const isRed = card.suit === "hearts" || card.suit === "diamonds";
  return (
    <span
      className={`playing-card ${isRed ? "playing-card--red" : ""}`}
      aria-label={cardLabel(card)}
    >
      <span className="playing-card__corner">
        <span>{card.rank}</span>
        <span aria-hidden="true">{SUIT_SYMBOL[card.suit]}</span>
      </span>
      <span className="playing-card__center" aria-hidden="true">
        {SUIT_SYMBOL[card.suit]}
      </span>
    </span>
  );
}

export function PokerCheatSheet() {
  const [selectedRank, setSelectedRank] = useState<number | null>(null);
  const [closedCards, setClosedCards] = useState<Set<number>>(() => new Set());

  function toggleCards(rank: number) {
    setClosedCards((current) => {
      const next = new Set(current);
      if (next.has(rank)) next.delete(rank);
      else next.add(rank);
      return next;
    });
  }

  return (
    <details className="cheat-sheet">
      <summary>
        Colinha de poker
        <span className="cheat-sheet__hint">cartas, exemplos e como ganhar</span>
      </summary>

      <div className="cheat-sheet__body">
        <section className="rank-order" aria-labelledby="rank-order-title">
          <h3 id="rank-order-title">Ordem das cartas — da mais fraca para a mais forte</h3>
          <div className="rank-order__row">
            {CARD_RANKS.map((rank) => (
              <span key={rank} className="rank-order__card">
                {rank}
              </span>
            ))}
          </div>
          <p className="rank-order__note">
            O Ás é a carta mais alta, no fim da fila. Na sequência A-2-3-4-5, porém, ele vale 1 e
            vira a menor.
          </p>
        </section>

        <section className="hands" aria-labelledby="hands-title">
          <h3 id="hands-title">Mãos — da mais forte para a mais fraca</h3>
          <ul className="hands__list">
            {POKER_HANDS.map((hand) => {
              const isSelected = selectedRank === hand.rank;
              const cardsOpen = !closedCards.has(hand.rank);
              return (
                <li
                  key={hand.rank}
                  className={`hand ${isSelected ? "hand--selected" : ""}`}
                >
                  <div className="hand__header">
                    <button
                      type="button"
                      className="hand__select"
                      aria-expanded={isSelected}
                      onClick={() => setSelectedRank(hand.rank)}
                    >
                      <span className="cheat-sheet__rank">{hand.rank}</span>
                      <span className="hand__titles">
                        <strong>{hand.name}</strong>
                        <small>{hand.hint}</small>
                      </span>
                    </button>
                    <button
                      type="button"
                      className="hand__toggle"
                      aria-expanded={cardsOpen}
                      aria-label={`${cardsOpen ? "Ocultar cartas de" : "Mostrar cartas e descrição de"} ${hand.name}`}
                      onClick={() => {
                        toggleCards(hand.rank);
                        setSelectedRank(hand.rank);
                      }}
                    >
                      <span className="hand__chevron" aria-hidden="true" />
                    </button>
                  </div>

                  {cardsOpen && (
                    <div className="hand__cards" role="group" aria-label={`Exemplo de ${hand.name}`}>
                      {hand.cards.map((card, index) => (
                        <button
                          key={`${card.rank}-${card.suit}-${index}`}
                          type="button"
                          className="playing-card-button"
                          aria-label={`Ver como ganhar com ${hand.name}: ${cardLabel(card)}`}
                          onClick={() => setSelectedRank(hand.rank)}
                        >
                          <PlayingCardView card={card} />
                        </button>
                      ))}
                    </div>
                  )}

                  {isSelected && (
                    <div className="hand__detail" aria-live="polite">
                      <p className="hand__detail-title">Como ganhar com {hand.name}</p>
                      <p>{hand.howToWin}</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>

        <p className="cheat-sheet__note">
          As cartas são físicas. Em caso de empate, compare na mesa — o sistema não decide.
        </p>
      </div>
    </details>
  );
}
