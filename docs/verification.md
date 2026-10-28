# Ověření projektu

Historické ověření E0 z 5. 10. 2026 nad novým samostatným `sport-club-system`, odvozeným ze šablony commit 32dded5e33b83f038655199eb81044fa3d4c66a8. Výchozí stav a chyby před úpravami jsou v [baseline](baseline.md). Aktuální ověření P1 z 27. 10. 2026 je na konci dokumentu; starší výsledky nejsou automaticky důkazem nové verze.

## Provedené kontroly E0 — 5. 10. 2026

| Kontrola | Výsledek a důkaz |
| --- | --- |
| Backend Java 17 / Maven Wrapper verify | **PASS: 9 testů, 0 failures, 0 errors, 0 skipped**; unit testy UserService/InfoService a HTTP integrační testy nad čerstvým PostgreSQL 16 Testcontainerem. |
| Migrace a schéma | Flyway V1 vytvoří users, Hibernate validate projde; ověřeno v integračním testu i v čistém volume celé Compose sestavy. |
| Autentizace a role | Registrace vždy USER i při zaslaném role=ADMIN; BCrypt hash bez hesla v odpovědi; login/me/nový HTTP klient s původní cookie; bez HTTP Basic. |
| CSRF a session | Mutace bez tokenu odmítnuty; login změní session ID a zruší starý token; logout invaliduje session a cookie na Path=/api; stará cookie neumožní me. |
| Validace BCrypt | Unicode heslo překračující 72 UTF-8 bajtů vrací 400 VALIDATION_ERROR a nevytvoří účet; frontend limit také kontroluje. |
| Security a CORS | JSON 401/403 i ve filtrech včetně odmítnutého CORS preflight a GET; skutečný context-path /api; localhost:3000 s credentials a X-CSRF-TOKEN povolen, cizí origin odmítnut. |
| Info, health a OpenAPI | Všechny info endpointy veřejně dostupné; minimální health jen status, metrics chráněné; springdoc 3.0.3 runtime; classpath VERSION=0.1.0 v JAR. |
| Frontend | npm ci, lint, typecheck, build **PASS**; **16/16 unit a integračních testů PASS** (API/CSRF, AuthProvider, formulář a dashboard, chyby a opožděné odpovědi). |
| Docker obrazy a celá sestava | Backend i Next.js standalone sestavené; DB/backend/frontend běží **healthy**. Runtime /api/info/version vrací 0.1.0 bez souboru VERSION vedle JAR. |
| Browser HTTP | Playwright Chromium: **4/4 PASS**, desktop a Pixel 7; skutečné API, registrace, chybné i správné přihlášení, session refresh, logout a výpadek API/retry. |
| Browser lokální HTTPS | Izolovaný Caddy s interním certifikátem: **4/4 PASS**, stejný tok na desktopu/mobilu, cookie HttpOnly/Secure/SameSite=Lax/Path=/api. curl s explicitní testovací CA ověřil certifikát a hostname. Browser pro lokální interní CA použil ignoreHTTPSErrors; systémová důvěra certifikátů se neměnila. |
| Vizuální/responzivní kontrola | Zkontrolované desktopové a mobilní screenshoty úvodu; dashboard E2E ověřuje žádný horizontální overflow. |
| Compose a CI syntax | Všechny tři verzované Compose konfigurace validní; YAML a actionlint 1.7.12 kontrola workflow **PASS**. |
| Veřejný obsah a původ | Vyloučeny skutečné source .env, .git historie, build outputs a keys. scripts/check_public_content.py ověřuje verzované/neignorované soubory a známé credential patterny bez výpisu hodnot. LICENSE shodná byte-for-byte, kontrolní hashe všech sledovaných souborů původního místního template shodné. |

Testcontainers na macOS použil Docker socket `unix://$HOME/.docker/run/docker.sock`; Docker 28.5.1, Compose 2.40.2. Node 24.14.0 je shodný lokálně, v CI i Dockerfile. Není použit žádný produkční default účet.

## Browserové testy zopakovat

Po `docker compose up --build -d --wait` z kořene:

```sh
cd frontend
npm ci
npx playwright install chromium
npm run test:e2e
```

Testy vytvářejí jedinečné smyšlené účty; spouštějte je nad vývojovým prostředím. Výstupy jsou ignorované v `.verification/e2e`. E2E test config dovoluje změnit E2E_BASE_URL a E2E_API_URL pro vlastní testovací nasazení. Ověření skutečného veřejného certifikátu nepoužívá ignoreHTTPSErrors.

## Známé limity a neprovedené kontroly

- **Produkční npm audit: 0 známých zranitelností. Celý audit: 5 high položek v dev řetězci Next ESLint → braces**, jedna neopravená chyba se závislými balíčky. Advisory a řetězec jsou v [frontend README](../frontend/README.md). Není to čistý audit všech závislostí; prod standalone tento řetězec neobsahuje.
- **GitHub CI spuštěno při publikaci** do [Dasky02/sport-club-system](https://github.com/Dasky02/sport-club-system); aktuální stav jednotlivých commitů je v [Actions](https://github.com/Dasky02/sport-club-system/actions/workflows/ci.yml). Místní kontroly odpovídající CI a syntaktický actionlint prošly. **Release a GHCR dosud nespouštěny**: publikování zdrojového repozitáře nevydalo release ani nenahrálo images.
- **Veřejné produkční HTTPS/ACME nasazení s vlastní doménou neproběhlo.** HTTPS je konfigurované a lokálně ověřené, nikoli živě veřejně nasazené. Produkční DNS/porty/certifikát a cookies tým ověří dle [deployment](deployment.md).
- **Záloha/obnova nebyla provozně provedena.** Postup je dokumentovaný, finální akceptace musí ověřit obnovitelnost skutečné zálohy.
- **P1–P3 dodávají identitu, týmový a rodičovský základ, podrobné datované výsledky jsou níže.** Události/účast, soutěže, statistiky, finance, notifikace, messaging a výsledková historie stále vyžadují navazující implementaci. Samotné založení sportů není akceptace jejich výsledkových scénářů. Přehled v [requirements](requirements.md) a [roadmap](roadmap.md).
- Statický credential check je kontrola známých patternů a souborů, ne záruka neexistence libovolné tajné hodnoty. Před veřejným publikováním byl finální Git obsah zkontrolovaný; žádné skutečné env hodnoty se do repozitáře nepřevzaly. Kontrola se opakuje v CI.

Nový [veřejný repozitář](https://github.com/Dasky02/sport-club-system) byl vytvořen a nahrán po kontrole obsahu na výslovnou žádost uživatele. GitHub uvádí PUBLIC, isFork=false a výchozí větev main; historie začíná vlastním root commitem. Původní privátní template nebyl cílem žádné write operace.

## Kontrola přípravy implementace — 27. 10. 2026

Nad výchozím `main` `c0b52d6` byl doplněn [pracovní plán](implementation-plan.md), [plánovaný API kontrakt](api-contract.md) a [pokyny pro navazující práci](../AGENTS.md). Doménové SQL/API/UI se touto změnou neimplementují. Předchozí výsledky z 5. 10. nejsou novým testem této přípravy.

- **PASS:** kontrola veřejného obsahu nad 108 verzovanými/neignorovanými soubory, kontrola lokálních Markdown odkazů, čtyř JSON příkladů API a whitespace v upravené dokumentaci.
- **PASS:** porovnání migračního plánu s DBML pokrývá všech 38 tabulek právě jednou. Prověřeny závislosti fee tabulek před notifikacemi a dodatečného vytvoření cyklického FK aktivní výsledkové revize. Jde o kontrolu návrhu, nikoli provedenou migraci.
- **Ověřeno prostředí:** dostupná Java 17.0.15 a Maven Wrapper 3.9.12; výchozí shell má Java 25.0.2, proto je nutná volba JDK 17 pro projekt. Node 24.14.0, npm 11.15.0, Python 3.12.5, běžící Docker daemon 28.5.1. PostgreSQL image nebyla v lokální cache; stav běžící aplikace ani vývojové DB tato kontrola nepotvrzuje.
- **Neprovedeno v této změně:** nové backend/frontend testy, browserové průchody, audit závislostí, produkční nasazení a restore. Změněna je pouze dokumentace; před prvním implementačním balíčkem se obnoví technický baseline podle pracovního plánu.

## Implementace a ověření P1 — 27. 10. 2026

Lokální větev `feat/identity-and-club-setup`, výchozí `main` `c0b52d6`. Dodané skutečné funkce: V2 identity/klub/audit/sporty, vlastní onboarding, USER/ADMIN a STANDARD/CHILD datový základ, aktuální serverový kontext, jednorázový setup a administrátorská správa sportů. CHILD je do doplnění hráčských a rodičovských vazeb zablokovaný; P1 ještě nedodává P2/P3 ani celou E1.

| Kontrola | Skutečný výsledek |
| --- | --- |
| Výchozí baseline před implementací | Maven verify **9/9 PASS**, frontend lint/typecheck a **16/16 testů PASS**. |
| Finální backend | Java 17 / `./mvnw -B -ntp verify`: **25 testů PASS**, 0 failures, 0 errors, 0 skipped. Šest unit testů a 19 integračních/upgrade scénářů. Výstupní JAR sestaven. |
| Upgrade V1 → V2 | Skutečná V1 fixture se všemi pěti původními rolemi: zachována všechna UUID, hashe a časy. COACH/PLAYER/PARENT přejdou na USER bez domyšlených osob/vztahů. Existující nejstarší ADMIN zůstane a uzavře setup s auditem; bez ADMIN migrace nikoho nepovýší. V1 soubor se nezměnil. |
| Autorizace a souběh | PENDING omezený na vlastní onboarding/kontext; role a enabled aktuální i se starou session. CHILD/deaktivovaný/smazaný účet odmítnut. Dva setupy mají právě jednoho vítěze, souběžný onboarding nevytvoří osiřelou osobu. Service po čekání na klubový zámek znovu odmítne odebraného ADMIN. Requestové security contexty nesdílejí mutovanou session instanci. |
| Setup, validace a sporty | Chybný token nic nezmění; prázdná konfigurace vrátí nedostupný setup; opakování po úspěchu odmítnuto. Strukturované chyby bez vstupních tajných hodnot. Fotbal a basketbal vytvořeny přes stejné API, stránkování, stabilní kód, přejmenování a deaktivace; běžný účet nemá přístup. Chybějící CSRF odmítnut, nepovolený DELETE vrátí 405 bez smazání. |
| Finální frontend | **47/47 testů PASS**, lint/typecheck/build **PASS**. Testy zahrnují skutečný API transport s HTTP mockem, osobu, setup, nezapisování tokenu do storage, obnovu role/kontextu, auth race, chyby a sportovní formuláře. Partial PATCH mění pouze požadované pole; deaktivace ze staré karty nepřepíše cizí přejmenování. |
| Browser desktop | Chromium proti skutečnému JAR a produkčnímu Next standalone, PostgreSQL 16: **3/3 PASS**. Auth/session/logout, odlišení výpadku, celý P1 průchod včetně chybného/opakovaného setupu a přejmenování/deaktivace. |
| Browser mobil | Pixel 7, nezávislá čistá testovací DB se znovu provedenou V1/V2: **3/3 PASS**, stejné scénáře. Celkem desktop+mobil **6/6**, žádný přeskočený scénář. |
| Vizuální kontrola | Prohlédnuty desktopový a mobilní screenshot správy sportů; čitelné formuláře/karty a ověřená absence horizontálního přetékání. |
| Konfigurace a obsah | Všechny tři Compose konfigurace validní s `.env.example`; kontrola veřejného obsahu a `git diff --check` prošly. Token je jen soukromý backend env, nemá výchozí hodnotu a neposílá se do frontend buildu. |

Browserové ověření použilo pouze vytvořenou zahoditelnou DB na portu 15432, backend 18080 a frontend 13000; běžná vývojová data nebyla resetována. Frontend byl sestaven s testovací veřejnou URL `http://localhost:18080/api`. Pro obvyklý vývoj/build použijte vlastní `NEXT_PUBLIC_API_URL` podle README. Testovací přihlašovací údaje nebyly produkční a nejsou seedem aplikace. Lokální logy/screenshoty jsou ignorované v `.verification/`.

Reprodukce P1 browserového scénáře: nad **samostatnou novou testovací DB** nakonfigurujte backendový `CLUB_SETUP_TOKEN`, spusťte odpovídající frontend/backend a nastavte tutéž hodnotu jako soukromý `E2E_SETUP_TOKEN` jen v shellu testovacího procesu. Dále:

```sh
cd frontend
E2E_SETUP_PROJECT=desktop npm run test:e2e -- auth.spec.ts club-setup.spec.ts --project=desktop
```

Mobilní průchod spusťte až nad další čistou izolovanou DB/restartovaným backendem:

```sh
E2E_SETUP_PROJECT=mobile npm run test:e2e -- auth.spec.ts club-setup.spec.ts --project=mobile
```

Pro jiné porty přidejte `E2E_BASE_URL` a `E2E_API_URL`. Token nikdy nepatří do `NEXT_PUBLIC_*`, URL ani sdíleného příkazu s jeho hodnotou. Bez explicitního testovacího tokenu je jednorázový P1 scénář přeskočen; obyčejné auth scénáře běží dál. Tyto testy se nepouštějí nad živým klubem a běžná data se kvůli nim nemažou.

**Neprovedeno pro P1:** nové sestavení celých Docker images, nové HTTPS/ACME ověření, veřejné nasazení, provozní restore, nový audit závislostí a GitHub CI této lokální větve. Produkční runtime byl ověřen jako sestavený JAR + Next standalone, Compose jako konfigurace. Staré HTTPS ověření E0 zůstává historickým výsledkem. Žádný plánovaný týmový, finanční nebo sportovní výsledkový scénář se tímto neoznačuje za hotový.


## Publikace P1 a ověření P2 — 27. 10. 2026

P1 commit `192dd6a` je publikovaný v [PR #23](https://github.com/Dasky02/sport-club-system/pull/23), základ `main` `c0b52d6`. GitHub CI tohoto PR má tři úspěšné joby: Backend verify, Frontend checks, Public content and Compose ([běh](https://github.com/Dasky02/sport-club-system/actions/runs/40494184203)). PR nebyl automaticky sloučen. P2 je na samostatné větvi `feat/teams-and-memberships` nad P1, bez změny zdrojového template.

P2 dodává V3 a skutečné sezóny, vlastní i externí týmy, sezónní názvy, ADMIN osoby/offline hráče, intervalová hráčská a trenérská členství, self-coach a scoped soupisky/historii. Pokrývá týmový rozsah R01, část R02/R12/R16, T01–T04/T07–T11 a U06/U08/U11. Neuzavírá celou E1. `guardian_links` je jen DB příprava P3; CHILD je stále blokovaný, rodičovské a finanční schopnosti nejsou dostupné.

| Kontrola | Skutečný výsledek |
| --- | --- |
| Backend Java 17 / Maven verify | **40/40 PASS**, 0 failures/errors/skipped. Včetně všech P1 regresí, 8 P2 HTTP/PostgreSQL scénářů, 6 unit scénářů nové služby a samostatného V2→V3 migračního testu. JAR sestaven; po textové aktualizaci info resources znovu package se skipTests, obsah resources porovnán byte-for-byte. |
| Upgrade a integrita | V2→V3 zachová UUID/osoby/BCrypt/admin setup/audit/sporty, nevytvoří smyšlené hráče. Skutečné PostgreSQL 16 provede V1–V3 a btree_gist, celkem 12 tabulek. Překryv stejné dvojice odmítá EXCLUDE (23P01), sousední intervaly i souběh v jiném týmu projdou. V1/V2 zůstávají beze změny. |
| Oprávnění a souběh | Negativní scoped detail/list/count, minimální DTO i pro ADMIN, konec a budoucí začátek vztahu, revokace při staré session, archivovaný read/write, souběžné členství a atomický rollback osoby/hráče. Jednotný datumový snapshot rosteru/historie ověřen dvěma testy přes pražskou půlnoc. |
| Frontend | **64/64 PASS**, lint/typecheck/build PASS. P2 přidává 17 transportních/komponentových/unit scénářů: přístupové brány, sezóna/archiv, atomický hráč, výslovná existující osoba, konflikt bez retry/ztráty formuláře, minimální roster, intervaly, pozdní odpovědi a načtení výběrů přes první stovku. |
| Browser desktop | Chromium, skutečný JAR + Next production standalone + izolovaný PostgreSQL 16: **3/3 PASS**, 0 skipped. Dva původní auth/session/výpadek scénáře a nový úplný P1/P2 průchod. |
| Browser mobil | Pixel 7 nad další čistou testovací DB se znovu aplikovanými V1–V3: **3/3 PASS**, 0 skipped. Celkem desktop+mobil **6/6 PASS**. |
| P2 průchod | Registrace → osoba → jednorázový setup → fotbal+basketbal → sezóna a oba týmy → dva hráči bez účtů/rodičů → jediný ADMIN trenérem obou → přejmenování základního týmu zachová sezónní název → ukončení/přestup/historie → historická soupiska → archiv blokuje mutaci a ponechá read. JSON rosteru ani základního player detailu nemá kontakty/DOB. |
| Vizuální kontrola | Prohlédnuty desktopový a Pixel 7 screenshot soupisky. Čitelné karty a ovládání, testovaná absence horizontálního přetékání. |
| Konfigurace a obsah | Všechny tři Compose konfigurace PASS. Veřejný obsah PASS; lokální Markdown odkazy, 5 JSON příkladů, 38 cílových/12 migrovaných tabulek a git diff --check PASS. Byte-for-byte V1/V2 zachované. |

Běhy používaly pouze vlastní zahoditelný container/DB bez projektu volumes: DB 15432, API 18080, standalone 13000. Ostatní data se neresetovala. Výstupy jsou ignorované v `.verification/`; přihlašovací údaje jsou smyšlené, žádný produkční seed. Pro reprodukci nastavte soukromý backendový CLUB_SETUP_TOKEN a stejný E2E_SETUP_TOKEN jen pro testovací proces a vyberte jeden setup scénář:

```sh
# frontend/; samostatná čistá testovací DB pro každý projekt
E2E_SETUP_PROJECT=desktop npm run test:e2e -- auth.spec.ts roster.spec.ts --project=desktop
# po přípravě druhé čisté izolované DB a restartu backendu
E2E_SETUP_PROJECT=mobile npm run test:e2e -- auth.spec.ts roster.spec.ts --project=mobile
```

Pro jiné porty nastavte E2E_BASE_URL/E2E_API_URL; frontend build musí mít odpovídající NEXT_PUBLIC_API_URL. Token nikdy do veřejné proměnné/URL nebo příkazu s jeho skutečnou hodnotou. `roster.spec.ts` a `club-setup.spec.ts` nepouštějte se setup tokenem nad stejnou DB současně: oba vyžadují nedokončený klub. Bez tokenu se tyto opt-in scénáře přeskočí; obyčejné auth testy běží dál.

**Neprovedeno pro P2:** GitHub CI nové P2 větve, nové Docker image buildy, nové HTTPS/ACME ověření, veřejné nasazení, provozní restore a nový audit závislostí. P1 CI výsledek není CI důkaz P2. Historie výsledků/statistik, rodičovský průchod a CHILD akceptace čekají na navazující implementaci; samotný DB základ tyto požadavky nesplňuje.


## Dokončení P3 a sloučení P1 — 28. 10. 2026

Na výslovnou žádost uživatele byl [PR #23](https://github.com/Dasky02/sport-club-system/pull/23) sloučen do main merge commitem `d7add37`. Jeho tři CI kontroly byly úspěšné a následný [běh nad main](https://github.com/Dasky02/sport-club-system/actions/runs/40588664240) také skončil úspěšně. Navazující větev `feat/guardians-and-child-accounts` zachovává P2 `cf4f6a7` a doplňuje P3; nové předání proto zahrnuje P2/P3 nad sloučeným P1.

P3 skutečně dodává správu účtů na ověřených osobách, person-link neúplného účtu, role/typ/přístup/aktivaci s odůvodněním, guardian grant/revoke, Moje děti a omezené CHILD přihlášení se sportovním čtením. Rozšiřuje R02, T10, U06/U12 a přístupové A04/A16/A20/A23–A27 v rozsahu existujících funkcí. Příspěvky, notifikace, události, výsledky a komunikace stále nejsou implementované; jejich deny testy pro dítě nejsou funkční akceptací těchto domén.

| Kontrola | Skutečný výsledek |
| --- | --- |
| Backend Java 17, Maven verify | **54/54 PASS**, 0 failures/errors/skipped. Oproti P2 devět nových skutečných HTTP/PostgreSQL scénářů, čtyři unit testy child policy a bezpečné obnovy vlastní session a jeden upgrade V3→V4. Zachované P1/P2 regrese. Po aktualizaci textových resources znovu package se skipTests; všech devět resources v JAR porovnáno byte-for-byte. |
| Migrace V3→V4 | Zachována UUID, osoby, BCrypt, setup, sporty, tým a členství. Unsupported legacy CHILD je zakázán bez vymyšlené osoby. V4 přidává auth_revision/guardy, stále 12 tabulek. Ověřena trvalá změna revize po odvolání a reaktivaci, regrant/povolení rodiče dítě samo nezapnou; self guardian a přepojení identity DB odmítá. V1/V2/V3 beze změny. |
| Oprávnění a transakce | Dva rodiče/dvě děti, scoped seznamy i counts a cizí detail, parent history vs current team. CHILD bez profilu/aktivního rodiče nelze aktivovat; žádný ADMIN/coach/guardian a žádné samoobslužné změny osoby. Poslední enabled STANDARD COMPLETE ADMIN chráněn v souběhu. Ověřen rollback při selhání auditu. |
| Sessions a finanční hranice | Nepoužitá stará cookie po disable→re-enable/aktivaci zůstává odvolaná. Aktuální revision se kontroluje i po čekání na zámek. Vlastní onboarding/setup přijmou jen očekávanou revizi +1. Child allowlist odmítá přímé fee/payment/export/notifikační cesty včetně count/read; finanční služby ještě neexistují. |
| Frontend | **85/85 PASS**, lint/typecheck a produkční build PASS s testovací API URL 18080. Reálné clients/formuláře, reason a potvrzení změn, vymazání prvního hesla ihned při odeslání i chybě, ochrana citlivých requests, vlastní CHILD read, parent profil/history, pozdní session/zdrojové odpovědi. Žádné nové runtime závislosti. |
| Browser P3 desktop | Chromium + skutečný JAR/Next production standalone/PostgreSQL16: **3/3 PASS**, žádný skip. Auth/session/výpadek a úplný P1/P3 průchod. |
| Browser P3 mobil | Pixel7, druhá čistá izolovaná DB se znovu provedenými V1–V4: **3/3 PASS**, žádný skip. Celkem P3 **6/6**. |
| Browser P2 regrese | Po finálním buildu další čistá DB, desktop auth + celý původní P2 průchod obou sportů, offline hráčů, trenéra, přestupu, historie a archivu: **3/3 PASS**. Celkem v dokončení P3 **9/9 browserových scénářů**. |
| Vizuální a návrhová kontrola | Prohlédnuty desktopové i mobilní Moje děti a CHILD soupiska, absence horizontálního přetékání ověřena. Aktualizované DBML parse/export PASS: 38 cílových tabulek a 76 vztahů; ERD obnoven lokálně a users/auth_revision vizuálně zkontrolován. |
| Konfigurace a veřejný obsah | Všechny tři Compose konfigurace PASS, kontrola veřejného obsahu a git diff --check PASS. Lokální Markdown odkazy a JSON příklady validní; V1–V3 byte-for-byte shodné s P2. |

P3 browserový průchod vytvoří dva rodiče a dva hráče se samostatnými účty přes skutečné formuláře, odmítne předčasnou CHILD aktivaci, schválí tři vazby, aktivuje účty a ověří oddělené parent/child scopes i přímé zákazy. Odvolání jedné ze dvou vazeb přístup dítěte zachová; poslední účet zakáže. Nové schválení vyžaduje ruční aktivaci, původní cookie nepoužitá během zákazu se neobnoví. Zákaz posledního rodiče zakáže oba potomky; jeho nové povolení děti neaktivuje. Ověřena ochrana posledního ADMIN.

Testy čekají na dokončení vlastní onboarding/setup POST odpovědi před ověřením session, stejně jako skutečné UI. Souběžný starý request v jiné kartě během bezpečnostní změny může skončit 401; session se neobnovuje převzetím pozdější správní revize. Původní P1 očekávání souběžného onboardingu nyní připouští bezpečné 401 i konflikt, stále vznikne právě jedna osoba.

Reprodukce: nad vlastní novou testovací DB nastavte soukromý backend CLUB_SETUP_TOKEN a shodný E2E_SETUP_TOKEN pouze pro testovací proces. Vyberte právě jeden setup scénář nad každou DB:

```sh
# frontend/; odpovídající E2E_BASE_URL/E2E_API_URL a frontend build
E2E_SETUP_PROJECT=desktop npm run test:e2e -- auth.spec.ts guardians.spec.ts --project=desktop
# druhá nová izolovaná DB a restart backendu
E2E_SETUP_PROJECT=mobile npm run test:e2e -- auth.spec.ts guardians.spec.ts --project=mobile
```

`club-setup.spec.ts`, `roster.spec.ts` a `guardians.spec.ts` každý přebírá první správu klubu. Nepouštějte je se setup tokenem zároveň nad stejnou DB; zvolte jeden. Regresi rosteru spusťte nad další čistou testovací DB. Běžná klubová data se kvůli testům nemažou. Lokální běhy používaly výhradně vlastní zahoditelný container bez projektových volumes (15432/18080/13000); soukromá konfigurace není verzovaná a po ověření je odstraněna.

**Neprovedeno pro P3:** nové celé Docker image buildy, nové HTTPS/ACME nasazení, provozní restore nebo nový audit závislostí. Ověřen byl JAR + produkční Next standalone; Compose jako konfigurace. Tento lokální záznam vzniká před publikací PR; aktuální GitHub CI posuzujte podle konkrétního head commitu v PR/Actions. Budoucí domény P4–P9 nejsou tímto dokončené.
