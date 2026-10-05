import Link from "next/link";
import { ApiStatus } from "@/components/ApiStatus";

export default function HomePage() {
  return (
    <>
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-copy">
          <p className="eyebrow"><span className="status-dot" /> Ročníkový projekt · etapa 1</p>
          <h1 id="hero-title">Společný základ<br />pro váš <span>sportovní klub.</span></h1>
          <p className="lead">Místo pro tým, který chce mít svůj klub pod kontrolou. Začínáme účty a bezpečným přihlášením; klubové funkce připravujeme v dalších etapách.</p>
          <div className="actions">
            <Link className="button" href="/register">Vytvořit účet <span aria-hidden="true">↗</span></Link>
            <Link className="button button-secondary" href="/login">Přihlásit se</Link>
          </div>
          <p className="subtle">Nový účet získá roli USER. Klubové role přiděluje administrátor.</p>
        </div>
        <aside className="hero-panel" aria-label="Stav technického základu">
          <div className="panel-heading"><span className="eyebrow">Připraveno pro tým</span><span className="pill">Etapa 1</span></div>
          <div className="court" aria-hidden="true"><span className="court-circle" /><span className="court-line" /><span className="court-ball">●</span></div>
          <ApiStatus />
        </aside>
      </section>
      <section className="scope-section" aria-labelledby="scope-title">
        <div className="section-heading"><p className="eyebrow">Jasný rozsah</p><h2 id="scope-title">Co je dostupné nyní</h2></div>
        <div className="feature-grid">
          <article className="feature-card"><span className="feature-number">01</span><h3>Uživatelský účet</h3><p>Registrace, přihlášení, obnovení session a odhlášení nad skutečným backendem.</p></article>
          <article className="feature-card"><span className="feature-number">02</span><h3>Technický základ</h3><p>Next.js frontend, Spring backend a PostgreSQL s migracemi. Verzi API ověříte přímo na této stránce.</p></article>
          <article className="feature-card planned"><span className="pill">Plánováno</span><h3>Život sportovního klubu</h3><p>Týmy, události, výsledky, statistiky, příspěvky a komunikace jsou součástí navazujících etap.</p></article>
        </div>
      </section>
    </>
  );
}
