# Release notes

## Nevydané — P1/P2, 2026-10-27

- V2: oddělené osoby, zachování původních účtů, bezpečný jednorázový setup správce, aktuální kontext a správa sportů.
- V3: sezóny, vlastní i externí týmy, sezónní názvy, hráči bez účtů a intervalová hráčská/trenérská členství.
- Administrátorské formuláře, oprávněné soupisky bez kontaktů či data narození, historie členství a archivace sezóny.
- Rodičovské vazby mají pouze databázový základ; dětské přihlášení zůstává zablokované do P3. Události, výsledky, statistiky, finance a komunikace zůstávají plánované.

Verze aplikace zůstává 0.1.0; tato část popisuje rozpracované změny před vydáním. Skutečné provedené kontroly jsou v docs/verification.md.

## [0.1.0] – 2026-10-05

První samostatný týmový skeleton sport-club-system.

- Zachovaný Spring backend šablony v backend/, Java 17 a Spring Boot 4.0.3.
- Session autentizace, CSRF, rotace session ID, jednotný logout a JSON security chyby.
- Flyway users migrace, PostgreSQL 16 a Hibernate validate.
- Next.js App Router s registrací, přihlášením, dashboardem a skutečnými informačními endpointy.
- Docker, CI, testy a návrh domény/databáze/oprávnění celého zadání.

Klubové doménové funkce (týmy, události, příspěvky, soutěže, statistiky, komunikace a notifikace) nejsou v této verzi implementované. Jejich plán a akceptace jsou v docs.
