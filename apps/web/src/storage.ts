const PREFIX = "pokerirl:session:";

export type Session = {
  token: string;
  playerId: string;
  name: string;
};

export function saveSession(code: string, session: Session): void {
  localStorage.setItem(`${PREFIX}${code}`, JSON.stringify(session));
}

export function loadSession(code: string): Session | null {
  try {
    const raw = localStorage.getItem(`${PREFIX}${code}`);
    if (!raw) return null;
    const session = JSON.parse(raw) as Session;
    if (!session.token || !session.playerId || !session.name) return null;
    return session;
  } catch {
    return null;
  }
}

export function clearSession(code: string): void {
  localStorage.removeItem(`${PREFIX}${code}`);
}
