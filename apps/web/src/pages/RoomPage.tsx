import { isValidBetAmount, type ChipValue } from "@pokerirl/shared";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { ActivityLog } from "../components/ActivityLog";
import { BetControls } from "../components/BetControls";
import { CloseRoundDialog } from "../components/CloseRoundDialog";
import { InviteCard } from "../components/InviteCard";
import { PokerCheatSheet } from "../components/PokerCheatSheet";
import { PlayerCard } from "../components/PlayerCard";
import { PotCard } from "../components/PotCard";
import { StartMatchDialog } from "../components/StartMatchDialog";
import { TurnOrderCard } from "../components/TurnOrderCard";
import { useRoom } from "../hooks/useRoom";
import type { Session } from "../storage";

type Props = {
  code: string;
  session: Session;
  onLeave: () => void;
  onExit: () => void;
};

export function RoomPage({ code, session, onLeave, onExit }: Props) {
  const { room, loading, loadError, connection, setRoom } = useRoom(code);
  const [betAmount, setBetAmount] = useState(0);
  const [betPending, setBetPending] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [closePending, setClosePending] = useState(false);
  const [startOpen, setStartOpen] = useState(false);
  const [startPending, setStartPending] = useState(false);
  const [orderPending, setOrderPending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3200);
    return () => clearTimeout(timer);
  }, [notice]);

  const me = room?.players.find((player) => player.id === session.playerId);
  const isTurnMode = room?.betMode === "turn";
  const minimumBet = isTurnMode ? Math.max(0, room.currentBet - (me?.betThisRound ?? 0)) : 0;
  const matchStarted = !isTurnMode || Boolean(room?.started);
  const isMyTurn = !isTurnMode || room?.currentPlayerId === me?.id;
  const currentPlayerName = room?.players.find((player) => player.id === room.currentPlayerId)?.name ?? null;

  // Avisa quando a vez chega, mesmo que o aviso venha da consulta periódica
  // em vez do WebSocket.
  const previousTurn = useRef(isMyTurn);
  useEffect(() => {
    if (isMyTurn && !previousTurn.current && matchStarted) {
      setNotice("Agora é a sua vez de apostar!");
    }
    previousTurn.current = isMyTurn;
  }, [isMyTurn, matchStarted]);

  function handleAddChip(value: ChipValue) {
    setBetAmount((current) => current + value);
  }

  function handleAmountChange(value: number) {
    setBetAmount(value);
  }

  function handleClear() {
    setBetAmount(0);
  }

  async function handleStart() {
    setStartPending(true);
    setNotice(null);
    try {
      const { room: updated } = await api.startGame(code, session.token);
      setRoom(updated);
      setStartOpen(false);
      setBetAmount(0);
      const starter = updated.players.find((player) => player.id === updated.currentPlayerId);
      setNotice(`Partida iniciada. A vez é de ${starter?.name ?? "quem começa"}`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Não foi possível iniciar a partida");
    } finally {
      setStartPending(false);
    }
  }

  async function handleBet() {
    if (!isValidBetAmount(betAmount) || !isMyTurn || !matchStarted) return;
    setBetPending(true);
    setNotice(null);
    try {
      const { room: updated } = await api.placeBet(code, session.token, betAmount);
      setRoom(updated);
      setBetAmount(0);
      setNotice(`Aposta de ${betAmount} registrada`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Não foi possível apostar");
    } finally {
      setBetPending(false);
    }
  }

  async function handleReorder(playerIds: string[]) {
    setOrderPending(true);
    setNotice(null);
    try {
      const { room: updated } = await api.reorderPlayers(code, session.token, playerIds);
      setRoom(updated);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Não foi possível mudar a ordem");
    } finally {
      setOrderPending(false);
    }
  }

  async function handleCloseRound(winnerId: string) {
    setClosePending(true);
    setNotice(null);
    try {
      const { room: updated, result } = await api.closeRound(code, session.token, winnerId);
      setRoom(updated);
      setCloseOpen(false);
      setBetAmount(0);
      setNotice(`${result.winnerName} ganhou ${result.amount} fichas`);
    } catch (cause) {
      setNotice(cause instanceof Error ? cause.message : "Não foi possível encerrar a rodada");
    } finally {
      setClosePending(false);
    }
  }

  return (
    <main className="room-page">
      <header className="room-header">
        <div className="brand">PokerIRL</div>
        <div className="room-header__meta">
          <span className="room-code">Sala {code}</span>
          {me && <span className="room-header__name">Olá, {me.name}</span>}
        </div>
      </header>

      {loadError && <p className="banner banner--error" role="alert">{loadError}</p>}
      {notice && <p className="banner" role="status">{notice}</p>}

      {loading && !room ? (
        <p className="loading">Carregando a sala…</p>
      ) : room ? (
        <div className="room-layout">
          <ActivityLog entries={room.activity ?? []} />
          <PotCard room={room} connection={connection} />

          {me ? (
            <BetControls
              amount={betAmount}
              availableChips={me.chips}
              minimumBet={minimumBet}
              pending={betPending}
              isMyTurn={isMyTurn}
              matchStarted={matchStarted}
              currentPlayerName={currentPlayerName}
              onAddChip={handleAddChip}
              onAmountChange={handleAmountChange}
              onClear={handleClear}
              onConfirm={handleBet}
            />
          ) : (
            <div className="bet-controls">
              <p>Sua sessão nesta sala não é mais válida.</p>
              <button type="button" className="button button--primary button--wide" onClick={onLeave}>
                Entrar novamente
              </button>
            </div>
          )}

          <InviteCard code={code} />

          {me?.isDealer && (
            <>
              <TurnOrderCard
                players={room.players}
                order={room.turnOrder}
                currentPlayerId={isTurnMode ? room.currentPlayerId : null}
                locked={isTurnMode ? Boolean(room.started) : false}
                pending={orderPending}
                onReorder={handleReorder}
              />
              {!room.started && (
                <button
                  type="button"
                  className="button button--primary button--wide"
                  onClick={() => setStartOpen(true)}
                >
                  Começar partida
                </button>
              )}
              <button
                type="button"
                className="button button--gold button--wide"
                disabled={isTurnMode && !room.started}
                onClick={() => setCloseOpen(true)}
              >
                Encerrar rodada
              </button>
            </>
          )}

          <section className="players" aria-label="Jogadores">
            <div className="section-heading">
              <h2>Jogadores</h2>
              <span>{room.players.length} na sala</span>
            </div>
            <ul className="players__list">
              {room.players.map((player) => (
                <PlayerCard
                  key={player.id}
                  player={player}
                  position={Math.max(1, room.turnOrder.indexOf(player.id) + 1)}
                  isMe={player.id === session.playerId}
                  isLastWinner={player.id === room.lastWinnerId}
                  isCurrent={isTurnMode && player.id === room.currentPlayerId}
                />
              ))}
            </ul>
          </section>

          <PokerCheatSheet />

          <button type="button" className="link-button" onClick={onExit}>
            Sair desta sala
          </button>
        </div>
      ) : null}

      {startOpen && room && (
        <StartMatchDialog
          players={room.players}
          order={room.turnOrder}
          betMode={room.betMode}
          pending={startPending}
          onConfirm={handleStart}
          onClose={() => setStartOpen(false)}
        />
      )}

      {closeOpen && room && (
        <CloseRoundDialog
          players={room.players}
          pot={room.pot}
          pending={closePending}
          onConfirm={handleCloseRound}
          onClose={() => setCloseOpen(false)}
        />
      )}
    </main>
  );
}
