import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { saveSession, type Session } from "../storage";

type Props = {
  fixedCode?: string;
  onJoined?: (code: string, session: Session) => void;
};

function normalizeCode(value: string): string {
  const pasted = value.match(/\d{6}/);
  if (pasted) return pasted[0];
  return value.replace(/\D/g, "").slice(0, 6);
}

export function JoinPage({ fixedCode, onJoined }: Props) {
  const navigate = useNavigate();
  const [code, setCode] = useState(fixedCode ?? "");
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await api.joinRoom(code, name.trim());
      const session = {
        token: created.token,
        playerId: created.playerId,
        name: name.trim(),
      };
      saveSession(created.room.code, session);
      if (onJoined) onJoined(created.room.code, session);
      else navigate(`/r/${created.room.code}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível entrar na sala");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="form-page">
      <Link className="back-link" to="/">
        ← Voltar
      </Link>
      <div className="form-card">
        <p className="eyebrow">Você recebeu um convite</p>
        <h1>Entrar na sala</h1>
        <p className="form-card__description">
          Digite o código de 6 dígitos ou cole o link que o dealer mandou.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Código da sala</span>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              required
              autoFocus={!fixedCode}
              value={code}
              placeholder="000000"
              className="input-code"
              onChange={(event) => setCode(normalizeCode(event.target.value))}
            />
          </label>

          <label className="field">
            <span>Seu nome</span>
            <input
              type="text"
              maxLength={24}
              required
              value={name}
              placeholder="Como você aparecerá na sala"
              onChange={(event) => setName(event.target.value)}
            />
          </label>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="button button--primary button--wide" type="submit" disabled={pending}>
            {pending ? "Entrando…" : "Entrar na sala"}
          </button>
        </form>
      </div>
    </main>
  );
}
