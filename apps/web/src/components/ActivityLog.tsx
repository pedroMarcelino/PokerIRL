import type { ActivityEntry } from "@pokerirl/shared";

function describe(entry: ActivityEntry): string {
  if (entry.kind === "bet") return `${entry.playerName} apostou ${entry.amount} fichas`;
  if (entry.kind === "win") return `${entry.playerName} ganhou ${entry.amount} fichas`;
  return `Partida iniciada por ${entry.playerName}`;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

type Props = { entries: ActivityEntry[] };

export function ActivityLog({ entries }: Props) {
  const latest = entries[0];

  return (
    <details className="activity">
      <summary className="activity__summary">
        <span className="activity__label">Última jogada</span>
        <span className="activity__line">{latest ? describe(latest) : "Nenhuma jogada ainda"}</span>
        <span className="activity__chevron" aria-hidden="true">
          ⌄
        </span>
      </summary>
      <ol className="activity__list">
        {entries.length === 0 ? (
          <li className="activity__empty">As apostas e os vencedores aparecem aqui.</li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className={`activity__item activity__item--${entry.kind}`}>
              <span>{describe(entry)}</span>
              <small>
                Rodada {entry.round}
                {formatTime(entry.at) ? ` · ${formatTime(entry.at)}` : ""}
              </small>
            </li>
          ))
        )}
      </ol>
    </details>
  );
}
