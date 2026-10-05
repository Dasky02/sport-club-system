# Požadavky a sledovatelnost zadání

Zdroj: uživatelem dodané `zadani_sportovni_klub_v2.odt` („Zadání semestrální práce: Informační systém pro správu sportovního klubu“) a doplňující pokyny pro tento ročníkový projekt. ODT byl při návrhu přečten z jeho `content.xml`, nikoli odhadnut z názvu. Doplnění uživatele zpřesňuje databázi, bezpečnost a etapové předání; nezužuje finální funkční rozsah ODT.

**Aktuální stav je E0 — technický skeleton.** Implementovány jsou přihlašovací účty, autentizace/informace, živé technické stránky a infrastruktura. Klubové funkce jsou konkrétně navrženy, ale dosud nemají doménové tabulky/API/UI. „Navrženo“ není „implementováno“ ani „akceptováno“. Skutečně provedené technické kontroly a jejich omezení se evidují v [ověření](verification.md).

## Funkční požadavky ODT

| ID | Požadavek ze zadání | Návrh / důkaz pro finální akceptaci | Cílová etapa | Stav v E0 |
| --- | --- | --- | --- | --- |
| R01 | Správa hráčů, trenérů, týmů a základních údajů | Profily oddělené od účtů, sport, týmy, sezónní intervalová členství; CRUD UI/API a negativní týmové testy | E1 | Navrženo: [doména](domain-model.md), [DB](database-design.md) |
| R02 | Administrátor, trenér, hráč a rodič/zákonný zástupce s odpovídajícími oprávněními | Jedna role účtu + objektové vazby; admin přiřazení; A01–A16 v [autorizaci](authorization.md) | E1–E6 | Enum role a USER registrace implementované; klubové kontroly plánované |
| R03 | Tréninky, zápasy a další klubové akce | Obecný Event TRAINING/MATCH/OTHER; kalendář, místo/čas, změna/zrušení, stejně pro oba sporty | E2 | Navrženo |
| R04 | Potvrzování účasti a omluvy hráčem/rodičem | Samostatná Availability s autorem; vlastní hráč nebo schválené dítě; uzávěrka a validace | E2 | Navrženo |
| R05 | Trenér z dostupnosti připraví nominaci | Samostatná Nomination; publikace, náhradníci, audit, notifikace; dostupnost nenominuje automaticky | E2 | Navrženo |
| R06 | Evidence skutečné docházky | Samostatná Attendance pro obecnou událost; skutečnost až po začátku, oddělená od dostupnosti/nominace | E2 | Navrženo |
| R07 | Členské příspěvky, splatnosti a stav úhrady; skutečné platby zadává admin | Předpis, platba, alokace, ledger storna; odvozené nesplaceno/částečně/zaplaceno; příklad 1000→400→600→storno v [roadmapě](roadmap.md) | E4 | Navrženo |
| R08 | Upozornění na blížící se a prodlené splatnosti členovi i administrátorovi | Scheduler, schránka, recipient výběr člena/zástupce a adminů, idempotentní marker, úhrada zastaví reminder | E4 | Navrženo |
| R09 | Platební brána mimo rozsah | Zaznamenání platby provedené mimo aplikaci; žádná brána ani online strhávání | E4 | Respektováno v návrhu |
| R10 | Notifikace nových událostí, změn a nominací | Transakční outbox a doručení, vlastní schránka, přečtení, deduplikace; test po restartu workeru | E2 | Navrženo |
| R11 | Vnitrosystémová komunikace trenérů, hráčů a rodičů | Vlastní Conversation/Participant/Message a UI vedle notifikací; scoped čtení/odeslání; A11 | E5 | Navrženo; není nahrazena notifikacemi |
| R12 | Správa soutěží a sezón | Sportovní Competition, CompetitionSeason, účastníci a archivace sezóny | E1+E3 | Navrženo |
| R13 | Zápasy, soupeři, výsledky a individuální statistiky po zápasu | Match, Opponent, potvrzené revize skóre, admin typed definice a hodnoty skutečných účastníků | E3 | Navrženo |
| R14 | Tabulky a pořadí ze zaznamenaných výsledků | Jen aktivní potvrzené výsledky; admin bodování/tie breakers, minitabulka, přepočet a verze cache | E3 | Navrženo |
| R15 | Týmové a individuální statistiky | Týmové součty z výsledků, individuální definice/typed hodnoty, agregace SUM/AVG/COUNT atd. podle typu; filtry tým/hráč/sezóna | E3 | Navrženo |
| R16 | Historie sezón, výsledků a statistik | Archivované sezóny, členství a revize; změna profilu/statistiky nepřepisuje význam minulých hodnot; upgrade/restore test | E1–E6 | Navrženo |

## Technické a výstupní požadavky ODT

| ID | Požadavek ze zadání | Konkrétní řešení a akceptace | Cílová etapa | Stav v E0 |
| --- | --- | --- | --- | --- |
| T01 | Samostatný webový frontend přes REST API | Next.js App Router/TypeScript, skutečný Spring JSON klient, credentials/CSRF; žádná doménová business logika v Next serveru | E0–E6 | Implementovaný auth/info základ; doménové UI plánované |
| T02 | Responzivní desktop a mobil | Responzivní skeleton; všechny následující tabulky, kalendář, formuláře a konverzace mají mobilní variantu a akceptaci | E0–E6 | Implementovaný layout skeletonu; doménové ověření plánované |
| T03 | Java/Spring Boot REST backend | Zachované vrstvy/DTO šablony, Java 17/Spring Boot 4, transakční service a omezené repository dotazy | E0–E6 | Implementovaný auth/info základ |
| T04 | Alespoň dva týmové sporty bez změny kódu | Sporty v DB; fotbal a basketbal konfigurované adminem, odlišné body/tie breakers a statistiky; dva plné scénáře E3 | E1+E3 | Navrženo; druhý sport je povinná finální akceptace |
| T05 | Admin spravuje názvy a typy individuálních statistik v UI | Stabilní definice a neměnné verze; INTEGER/DECIMAL/BOOLEAN/TEXT, kompatibilní validace/agregace; dynamický formulář | E3 | Navrženo; žádná pevná sportovní pole |
| T06 | Obecný model akcí nezávislý na sportu | Jeden Event se třemi typy, specializovaný Match jen pro výsledkové údaje | E2 | Navrženo |
| T07 | Relační DB pro členy/týmy/akce/soutěže/sezóny | PostgreSQL 16, UUID/FK/constraints, etapové Flyway migrace, validate; ERD a návrh SQL v [DB](database-design.md) | E0–E5 | Implementované users; zbytek návrh |
| T08 | Uložení a analýza historie sezón | Nemazat minulá členství/výsledky/statistiky, archivované přehledy; verzování definic a pravidel | E1–E6 | Navrženo |
| T09 | Registrace, login, bezpečné hashování hesla | Zachovaný BCrypt UserService, JSON session tok, CSRF, session fixation ochrana, logout, 401/403 | E0 | Implementováno; provedené testy viz [ověření](verification.md) |
| T10 | Víceúrovňový role přístup | Role + tým + dítě + čas/stav; serverová kontrola každého detailu/seznamu/zápisu; negativní A01–A18 | E0–E6 | Autentizace implementovaná, doménová autorizace plánovaná |
| T11 | Unit a integrační testy backendu i frontendu | Backend unit a PostgreSQL/Spring integration; frontend unit a komponentové/provider HTTP integration; stage akceptace a CI | E0–E6 | Testy skeletonu; všechny doménové testy plánované |
| T12 | Nasazení s Docker/Compose a HTTPS | Multi-stage images, DB healthcheck, TLS proxy/secure cookie, záloha a obnova podle [deployment](deployment.md) | E0+E6 | Konfigurace a návod připravené; skutečné produkční HTTPS nasazení zatím neproběhlo |
| T13 | Kompletní funkční webový IS | Všechny R01–R16 a T01–T12 mají implementaci a akceptační důkaz, včetně obou sportů | E6 | Nedokončeno — skeleton je první etapa |
| T14 | Projektová dokumentace a uživatelská příručka | Aktuální skeleton postup a plánované workflow čtyř rolí, následně skutečné obrazovky a postupy [příručky](user-guide.md) | E0–E6 | Dokumentováno; příručka domény se dokončí s funkcemi |

## Dodatečná omezení uživatele

| ID | Upřesnění | Řešení / hranice |
| --- | --- | --- |
| U01 | Template pouze zdroj, žádný commit/push/nastavení/viditelnost původního repozitáře | Práce výhradně v novém `sport-club-system`, vlastní Git historie; původ a licence zachované. Publikování nového repo je samostatný závěrečný krok po kontrole obsahu. |
| U02 | Zachovat vhodnou architekturu a implementace šablony | Vrstvy, package, UUID User/BCrypt, UserRepository/UserService, AuthController/records, error handler, info/OpenAPI, wrapper, PostgreSQL/Testcontainers; cílené opravy místo paralelní autentizace. |
| U03 | Převod Vite do Next.js; nový monorepo základ | `backend/`, `frontend/`, Docker/CI/cache paths a VERSION; nepoužívat Vite/Apache ani browser URL s Docker hostname. |
| U04 | Dynamické statistiky s validací a agregací | Verze definice, typed hodnoty, seznam povolených agregací, null/zero pravidla a historická kompatibilita v [modelu](domain-model.md). |
| U05 | Konfigurovatelné tabulky pro oba sporty | Admin datová pravidla, pořadí kritérií shody, minitabulka, chybějící vzájemné zápasy, přepočet potvrzených výsledků; ne ruční pořadí bodů. |
| U06 | Oddělení účtu, hráče a rodičovské vazby; týmová autorizace | Player/Coach profily, GuardianLink, intervalová členství; USER nemá automatický profil, tým ani dítě. |
| U07 | Částečné úhrady, splatnosti, admin zaznamenává platbu | PaymentAllocation, kredit a auditem podložené storno, transakční limity; jen skutečně provedené platby. |
| U08 | Historie členství a výsledků/statistik nesmí zmizet | Vlastní sezónní data, datumované vztahy, append-only revize, archivace a řízené admin opravy. |
| U09 | Rozsáhlé funkce navazující, pravdivý stav | Žádné prázdné controllery/fiktivní API v E0. Tento přehled, roadmapa a příručka výslovně odlišují skutečný skeleton a plán. |
| U10 | První MVP pro jeden sport není finální rozsah | První vertikální scénář může být fotbal; E3 a E6 musí akceptovat basketbal konfiguračně bez úprav kódu. |

## Hodnocení a důkazy

ODT hodnotí úplnost funkcí, kvalitu kódu a dobrou praxi, přívětivé UI, správné role, obecnost sportů a kvalitu dokumentace. Důkazem je fungující vertikální scénář, reviewed PR a relevantní test, ne počet tabulek či názvů rolí. Každý navazující PR uvádí ID požadavků, skutečně dodaný rozsah, migrační dopad a provedené testy. Hotová funkce aktualizuje tuto tabulku z „navrženo“ na „implementováno“ až po konkrétní akceptaci.

Závěrečná akceptace E6 musí projít čtyři role a celé dvě sportovní konfigurace od správy členů po archivovanou sezónu, včetně finance+notifikací+samostatné komunikace. Všechny neprovedené kontroly, známé chyby a nedokončené funkce jsou viditelné ve výsledku předání; není dovoleno je schovat pod „další rozšíření“, když jsou součástí ODT.

Relativní doporučený harmonogram ODT (2 týdny návrh, 5 implementace, 2 testování/nasazení) je zachovaný v [roadmapě](roadmap.md). Konkrétní počáteční datum a kapacita týmu zatím nejsou sjednané.
