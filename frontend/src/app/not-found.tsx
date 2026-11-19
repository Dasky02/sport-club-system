import Link from "next/link";

export default function NotFound() {
  return <section className="state-card"><h1>Stránka tu není.</h1><Link className="button" href="/">Zpět na úvod</Link></section>;
}
