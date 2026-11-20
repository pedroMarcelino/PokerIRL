import type { ConnectionStatus } from "../socket";

const LABELS: Record<ConnectionStatus, string> = {
  online: "ao vivo",
  connecting: "conectando…",
  offline: "reconectando…",
};

export function ConnectionBadge({ status }: { status: ConnectionStatus }) {
  return (
    <span className={`connection connection--${status}`} role="status">
      <span className="connection__dot" aria-hidden="true" />
      {LABELS[status]}
    </span>
  );
}
