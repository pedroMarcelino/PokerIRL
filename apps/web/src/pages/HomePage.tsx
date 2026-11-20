import { Link } from "react-router-dom";

export function HomePage() {
  return (
    <main className="splash">
      <div className="splash__card">
        <p className="eyebrow">Cartas na mesa, fichas no celular</p>
        <h1>
          Cassino <span>Denso</span>
        </h1>
        <p className="splash__description">
          Crie uma sala, chame todo mundo pelo código e acompanhe as apostas em tempo real.
          As cartas continuam 100% físicas — aqui só tem ficha.
        </p>

        <div className="splash__actions">
          <Link className="button button--primary button--wide" to="/criar">
            Criar sala 👑
          </Link>
          <Link className="button button--ghost button--wide" to="/entrar">
            Entrar na sala
          </Link>
        </div>

        <p className="splash__footnote">Sem carta virtual. Sem timer. Só a sua mesa.</p>
      </div>
    </main>
  );
}
