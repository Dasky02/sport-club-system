# Ověření etapy 1

Ověřeno 5. 10. 2026 nad novým samostatným `sport-club-system`, odvozeným ze šablony commit 32dded5e33b83f038655199eb81044fa3d4c66a8. Výchozí stav a chyby před úpravami jsou v [baseline](baseline.md). Toto je výsledek technického skeletonu, ne akceptace klubových funkcí.

## Provedené kontroly

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
- **Doménové funkce ani doménové akceptační scénáře zatím neimplementované/neprovedené.** Dva sporty, admin statistiky/tabulky, týmy, události/účast, rodičovské vazby, finance, notifikace, messaging a historie jsou konkrétní návrh a povinné další etapy. Přehled v [requirements](requirements.md) a [roadmap](roadmap.md).
- Statický credential check je kontrola známých patternů a souborů, ne záruka neexistence libovolné tajné hodnoty. Před veřejným publikováním byl finální Git obsah zkontrolovaný; žádné skutečné env hodnoty se do repozitáře nepřevzaly. Kontrola se opakuje v CI.

Nový [veřejný repozitář](https://github.com/Dasky02/sport-club-system) byl vytvořen a nahrán po kontrole obsahu na výslovnou žádost uživatele. GitHub uvádí PUBLIC, isFork=false a výchozí větev main; historie začíná vlastním root commitem. Původní privátní template nebyl cílem žádné write operace.
