import { DEFAULT_BET_MODE, type BetMode } from "@porkerirl/shared";
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { saveSession } from "../storage";

const PRESETS = [500, 1000, 2000];

export function CreateRoomPage() {
  const navigate = useNavigate();
  const [dealerName, setDealerName] = useState("");
  const [initialChips, setInitialChips] = useState(1000);
  const [betMode, setBetMode] = useState<BetMode>(DEFAULT_BET_MODE);
  const [customChips, setCustomChips] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const created = await api.createRoom(dealerName.trim(), initialChips, betMode);
      saveSession(created.room.code, {
        token: created.token,
        playerId: created.playerId,
        name: dealerName.trim(),
      });
      navigate(`/r/${created.room.code}`, { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível criar a sala");
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
        <p className="eyebrow">Você é o dealer 👑</p>
        <h1>Criar sala</h1>
        <p className="form-card__description">
          Todo mundo — inclusive você — começa com a mesma quantidade de fichas.
        </p>

        <form onSubmit={handleSubmit}>
          <label className="field">
            <span>Seu nome</span>
            <input
              type="text"
              value={dealerName}
              maxLength={24}
              required
              autoFocus
              placeholder="Como você aparecerá na sala"
              onChange={(event) => setDealerName(event.target.value)}
            />
          </label>

          <fieldset className="field field--group">
            <legend>Fichas iniciais para cada jogador</legend>
            <div className="preset-row">
              {PRESETS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`preset ${initialChips === value ? "preset--selected" : ""}`}
                  onClick={() => {
                    setInitialChips(value);
                    setCustomChips("");
                  }}
                >
                  {value}
                </button>
              ))}
            </div>
            <label className="field__custom">
              Outro valor
              <input
                type="number"
                min={1}
                step={1}
                value={customChips}
                placeholder="Ex.: 750"
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomChips(value);
                  const parsed = Number(value);
                  if (Number.isSafeInteger(parsed) && parsed > 0) setInitialChips(parsed);
                }}
              />
            </label>
          </fieldset>

          <fieldset className="field field--group">
            <legend>Como funcionam as apostas</legend>
            <div className="mode-list">
              <label
                className={`mode-option ${betMode === "free" ? "mode-option--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="betMode"
                  value="free"
                  checked={betMode === "free"}
                  onChange={() => setBetMode("free")}
                />
                <span className="mode-option__text">
                  <strong>Sem sequência</strong>
                  <small>Cada um aposta o que quiser, sem valor mínimo.</small>
                </span>
              </label>

              <label
                className={`mode-option ${betMode === "turn" ? "mode-option--selected" : ""}`}
              >
                <input
                  type="radio"
                  name="betMode"
                  value="turn"
                  checked={betMode === "turn"}
                  onChange={() => setBetMode("turn")}
                />
                <span className="mode-option__text">
                  <strong>Por rodada, cada um com a sua vez</strong>
                  <small>
                    Se alguém apostou 50, os outros precisam apostar 50 ou mais — como no poker.
                  </small>
                </span>
              </label>
            </div>
          </fieldset>

          {error && <p className="form-error" role="alert">{error}</p>}

          <button className="button button--primary button--wide" type="submit" disabled={pending}>
            {pending ? "Criando…" : "Criar sala e entrar como dealer"}
          </button>
        </form>
      </div>
    </main>
  );
}
