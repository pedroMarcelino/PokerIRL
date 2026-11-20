import { StrictMode, useState } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { CreateRoomPage } from "./pages/CreateRoomPage";
import { HomePage } from "./pages/HomePage";
import { JoinPage } from "./pages/JoinPage";
import { RoomPage } from "./pages/RoomPage";
import { clearSession, loadSession } from "./storage";
import "./styles.css";

function RoomRoute() {
  const { code = "" } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(() => loadSession(code));

  if (!/^\d{6}$/.test(code)) return <Navigate to="/" replace />;

  if (!session) {
    return (
      <JoinPage
        fixedCode={code}
        onJoined={(_joinedCode, joinedSession) => setSession(joinedSession)}
      />
    );
  }

  return (
    <RoomPage
      code={code}
      session={session}
      onLeave={() => {
        clearSession(code);
        setSession(null);
      }}
      onExit={() => {
        clearSession(code);
        navigate("/", { replace: true });
      }}
    />
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/criar" element={<CreateRoomPage />} />
        <Route path="/entrar" element={<JoinPage />} />
        <Route path="/r/:code" element={<RoomRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
);
