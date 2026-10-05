import Link from "next/link";

export default function NotFound() {
  return <section className="state-card"><p className="eyebrow">404</p><h1>Stránka tu není.</h1><p>Vraťte se na úvod nebo otevřete svůj účet.</p><Link className="button" href="/">Zpět na úvod</Link></section>;
}
