import Image from "next/image";
import { HomeActions } from "@/components/HomeActions";
import { ClubIcon, type ClubIconName } from "@/components/ClubIcon";

const features: { icon: ClubIconName; title: string; description: string }[] = [
  { icon: "calendar", title: "Klubový kalendář", description: "Termíny tréninků a zápasů. Dostupnost můžete potvrdit přímo u akce." },
  { icon: "team", title: "Týmy a soupisky", description: "Přehled sezón a členství podle toho, ke kterým týmům máte přístup." },
  { icon: "bell", title: "Oznámení", description: "Změny termínů a zveřejněné nominace najdete ve vlastní schránce." },
];

export default function HomePage() {
  return (
    <>
    <section className="welcome" aria-labelledby="welcome-title">
      <div className="welcome-copy">
        <h1 id="welcome-title">Klubový portál</h1>
        <p>Přehled klubového dění pro hráče, trenéry a rodiče.</p>
        <HomeActions />
      </div>
      <div className="welcome-photo">
        <Image src="/club-training.webp" alt="" fill sizes="(max-width: 760px) 100vw, 52vw" preload />
      </div>
    </section>
    <ul className="welcome-features" aria-label="Funkce klubového portálu">
      {features.map(({ icon, title, description }) => (
        <li key={title}>
          <ClubIcon name={icon} />
          <div><h2>{title}</h2><p>{description}</p></div>
        </li>
      ))}
    </ul>
    </>
  );
}
