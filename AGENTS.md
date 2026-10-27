# Pokyny pro práci v projektu

## Rozsah a zdroje pravdy

Pracujte pouze v tomto samostatném `sport-club-system`. Původní privátní `petrsafrata/Spring-project-template` neupravujte, necommitujte/nepushujte do něj a neměňte jeho nastavení. Zachovejte LICENSE, NOTICE a původ implementací.

Před doménovou prací čtěte [požadavky](docs/requirements.md), [pracovní plán](docs/implementation-plan.md), [API kontrakt](docs/api-contract.md) a relevantní části [databáze](docs/database.md), [DBML](docs/sport-club.dbml) a [oprávnění](docs/authorization.md). Roadmapa E0–E6 určuje celý povinný rozsah; pracovní balíčky P0–P9 určují jeho pořadí. Dokumentace rozlišuje návrh, implementaci a skutečně provedenou akceptaci.

Historický výchozí stav při dokumentační přípravě 27. 10. 2026 byl E0: funkční auth/info, Next.js technické stránky a infrastruktura, pouze V1 `users`. P1 na větvi `feat/identity-and-club-setup` přidává V2 (`persons`, `club`, `audit_log`, `sports` a rozšíření users), vlastní onboarding, aktuální kontext, jednorázový setup a správu sportů. P2 na větvi `feat/teams-and-memberships` přidává V3 (7 dalších tabulek, celkem 12): sezóny, týmy, offline hráče, intervalová členství a scoped soupisky/historii. Dalších 26 tabulek a P3–P9 zůstává plánovaných. `guardian_links` je v P2 jen DB základ pro P3, CHILD zůstává blokovaný. E1 jako celek není dokončená. Výsledky běhů patří výhradně do datovaného `docs/verification.md`; přítomnost implementace nebo testu není důkaz jeho úspěšného spuštění. Další balíček je P3: ověřené rodičovské vazby, účet na existující osobu, person-link a omezená CHILD aktivace. Nové skutečné schema kroky dostanou další volnou migraci, V3 se nepřepisuje. Před další prací ověřte aktuální soubory a Git stav.

## Zachovávaná architektura a pravidla

- Backend: Java 17, Spring Boot, `cz.jpmad.springprojecttemplate`, api/service/repository/model, constructor injection a record DTO. P2 relační dotazy používají NamedParameterJdbcTemplate ve stejné transakci jako P1 JPA; SQL scope pro items i counts musí být shodný. Zachovat BCrypt UserService, session `JSESSIONID`, CSRF a centrální JSON chyby. Nepřidávat paralelní JWT/NextAuth autentizaci.
- Frontend: Next.js App Router/TypeScript, skutečný Spring REST klient, `/api` právě jednou, credentials a CSRF. Zachovat ochranu před opožděnou auth odpovědí a rozlišení 401 od výpadku sítě. Doménové policy patří backendu.
- Flyway mění schéma, Hibernate pouze validuje. Aplikované migrace včetně V1 nepřepisovat. Čísla dalších migrací koordinovat podle skutečného stavu, nevytvářet předem prázdné SQL soubory.
- Při převodu účtů zachovat UUID a hashe, nevymýšlet osobní údaje ani vztahy ze staré role. `person_id` může být dočasně NULL s omezeným onboardingem; NOT NULL až po ověřeném backfillu samostatnou změnou.
- P1 má vlastní GET/POST `/me/person`, kontext, setup a admin správu sportů. P2 přidává ADMIN osoby/hráče/sezóny/týmy/členství a scoped čtení; správa jiných účtů, person-link a změny rolí patří až P3. PENDING má pouze povolený onboarding/auth rozsah a prázdný `/me/context`; CHILD je do P3 blokovaný i při zastaralé session. P2 vrací šest skutečných ADMIN capabilities a READ_TEAM pouze pro aktuální vazby; žádné předčasné finanční nebo rodičovské capabilities.
- `CLUB_SETUP_TOKEN` je soukromé nastavení backendu bez výchozí hodnoty; prázdný setup vypíná. První registrant automatický ADMIN není. Setup vyžaduje aktuální enabled STANDARD účet s vlastní osobou, zámek a audit; po dokončení se neopakuje. Token nikdy do veřejné konfigurace nebo dokumentačního příkladu s použitelnou hodnotou.
- Jedna instalace/klub, více DB sportů současně, každý tým právě jeden sport. Fotbal i basketbal bez sportovních větví a pevných polí statistik. Definice, agregace a bodování jsou konfigurovaná data.
- USER/ADMIN a STANDARD/CHILD se kombinují s aktuálními týmovými/rodičovskými vazbami. Kontrolovat je i se starou session, v detailech, seznamech, exportech a počtech. Jeden ADMIN může být jediným uživatelem a trenérem.
- CHILD má vlastní profil a ověřeného aktivního STANDARD rodiče; žádné finance včetně vlastních částek či počtů oznámení. Ztráta posledního rodiče blokuje účet i session. Hráčský profil bez účtu rodiče nevyžaduje.
- Dostupnost, nominace a skutečná účast jsou různé údaje. Historická členství, potvrzené výsledky/části/statistiky a použité konfigurace se nepřepisují; oprava vytváří revizi.
- Finance evidují skutečné adminem zaznamenané částečné platby a storna na osobu. Bez brány a kreditu. Notifikace jsou samostatné vedle konverzací; ADMIN nemá automatický přístup do soukromých zpráv.
- Nevracet entities či nepovolené osobní/finanční údaje v obecných DTO. Hesla, session, setup tokeny a CSRF nikdy do logů, auditu, URL ani veřejných env. Žádné výchozí produkční účty ani skutečné osobní údaje ve fixtures.

## Dodávka a ověření

Dodávejte malé funkční průchody backend → reálné UI → testy. Prázdné controllery, produkční mock data a pouhé tabulky nejsou dokončená funkce. Uveďte ID požadavků, změny schématu a přístupové hranice. Aktualizujte příručku a stav požadavků podle skutečnosti; neoznačujte plánované nebo neprovedené kontroly za hotové.

Příkazy z odpovídajícího adresáře:

```sh
# backend/; Java 17 a běžící Docker pro PostgreSQL Testcontainers
./mvnw -B -ntp verify

# frontend/; Node z .nvmrc, závislosti přes npm ci
npm run lint
npm run typecheck
npm test
npm run build

# kořen repozitáře
python3 scripts/check_public_content.py
docker compose --env-file .env.example config --quiet
git diff --check
```

Na macOS vyberte JDK pro daný shell přes `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`; při problému se socketem použijte `DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`. Neměňte globální Java nastavení. Start a E2E postup je v README a `docs/verification.md`. Testy spouštějte podle dopadu změny; u čisté dokumentace stačí kontrola obsahu, odkazů a diffu. U doménových změn doplňujte smysluplné unit/integrační a přístupové testy, včetně přímého HTTP a souběhu tam, kde rozhoduje transakce.

Před zveřejněním kontrolujte veřejný obsah. `.env`, databázová data, soukromé dokumenty a generované adresáře se necommitují. Zachovávejte rozpracované změny ostatních a nemažte jejich data. Automatické aktualizace závislostí neslučujte bez relevantního ověření kompatibility.
