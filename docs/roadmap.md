# Implementační plán a dokončení projektu

Skeleton je první etapa. **Finální ročníkový projekt musí splnit celý rozsah `zadani_sportovni_klub_v2.odt`**, nikoli pouze autentizaci nebo první sport. Následující doménové etapy jsou plánované; checkboxy se mění až po implementaci, testech a akceptaci. Záznam sportu v DB nebo návrh tabulky sám o sobě není hotová správa soutěží.

## Stav první etapy

Technický základ v tomto repozitáři: Spring Boot z původní šablony, účty s pěti hodnotami rolí, bezpečný session tok a CSRF, PostgreSQL/Flyway základ pro `users`, samostatný Next.js frontend s úvodem/registrací/přihlášením/dashboardem, kontejnerizace, CI a dokumentace. Přesný výsledek provedených kontrol a případná omezení prostředí popisuje [README](../README.md). Dokumentace nesmí nahrazovat neprovedený test tvrzením o úspěchu.

Zatím nejsou implementovány klubové tabulky ani CRUD, administrátorské přiřazování rolí, týmová autorizace, události, nominace, docházka, výsledky, tabulky, dynamické statistiky, příspěvky, messaging či doménové notifikace. Jejich konkrétní návrh je v [doméně](domain-model.md), [databázi](database-design.md) a [oprávněních](authorization.md). Veřejná registrace vytvoří USER, ne hráče/rodiče/trenéra.

## Etapy a výstupy

| Etapa | Výstup a závislosti | Povinná akceptace před uzavřením |
| --- | --- | --- |
| E0 — technický skeleton a návrh | Nový samostatný repozitář s vlastní historií; zachovaná licence a původ šablony; backend, Next.js, DB, Docker, CI; všechna doménová rozhodnutí v docs | Čistý clone postup, Maven verify nad čerstvým PostgreSQL, frontend unit/integration + lint/typecheck/build, auth/CSRF/CORS/session/401/403, INFO/VERSION v JAR, Compose ověření. Neprovedené kontroly zapsat jako neprovedené. |
| E1 — členové a týmy | Migrace sportů, sezón, profilů, rodičovských vazeb a časových členství; administrátorské UI; scoped dotazy; audit. Závisí na E0 | Dva sporty založitelné v UI/DB bez kódu; dítě bez účtu, rodič s více dětmi, trenér více týmů; negativní přístupy A01–A08 a A16; historický přestup; frontend responzivní seznam a formuláře. |
| E2 — události a účast | Kalendář obecného Event; oddělené dostupnost/nominace/docházka; notifikační outbox a schránka; změny a rušení. Závisí na E1 | Trénink, zápas i jiná událost; hráč/rodič potvrdí dostupnost a trenér publikuje nominaci; skutečná docházka se neodvozuje z nominace; notifikace nové/změněné události a nominace idempotentně; A03, A06–A09, A12–A13. |
| E3 — soutěže, výsledky, tabulky a statistiky | Soutěžní sezóny, soupeři, revize výsledků, admin pravidla a dynamické definice statistik; přepočet; historické pohledy. Závisí na E1+E2 | Povinné demonstrační scénáře fotbalu **i basketbalu** bez změny kódu; konfigurovatelné body/tie breakers v UI; minitabulka a restart podskupiny; validace typů, agregací a verzí statistik; A15, A18. |
| E4 — členské příspěvky | Předpisy, splatnosti, skutečné admin platby, alokace a storna; idempotentní reminder scheduler. Závisí na E1+outbox z E2 | Nesplaceno/částečně/zaplaceno; několik úhrad, kredit, korekce a souběh; notifikace před i po splatnosti příslušnému členu **a adminovi**; A05, A09–A10, A14. Bez platební brány. |
| E5 — vnitrosystémová komunikace | Samostatné přímé/týmové konverzace, účastníci, zprávy, přečtení a zánik přístupu. Závisí na E1 | Trenér komunikuje s hráčem a rodičem v oprávněném týmu; messaging má vlastní UI vedle notifikací; A11; odebrání vazby ihned zabrání čtení/odeslání. |
| E6 — úplná akceptace a nasazení | Doplněná příručka skutečných obrazovek všech čtyř rolí, migrace upgrade, mobilní a chybové stavy, HTTPS nasazení, záloha/obnova, systémové scénáře | Celá [matice požadavků](requirements.md) má funkční důkaz/test; backendové i frontendové unit a integrační testy; čisté deploy a restore; žádný doménový požadavek nesmí zůstat jen v roadmapě. |

První vertikální doménové MVP může projít s **jednou fotbalovou konfigurací** (členové → událost → výsledek → tabulka → statistika). Je to průběžná dodávka. E3 a finální akceptace povinně přidávají basketbal pouhou konfigurací. Podpora druhého sportu není volitelná budoucí funkce za koncem projektu.

Každá etapa dodá Flyway migrace, reálné REST DTO a validace, service oprávnění, frontend obrazovky, testy, aktualizaci příručky a stavové matice. Nevznikají prázdné controllery, fiktivní endpointy ani dashboardy s náhodnými klubovými čísly. Listy a formuláře musí ukazovat stav načítání, prázdná data, chybu API, validaci a odmítnuté oprávnění.

## Orientační harmonogram ze zadání

ODT doporučuje 2 týdny návrhu, 5 týdnů základní implementace a 2 týdny testování/nasazení. Je to relativní plán od dohodnutého začátku práce, nikoli potvrzený kalendářní termín. E0 a návrh E1–E5 patří do prvních dvou týdnů; E1–E5 jsou rozdělené do následujících pěti týdnů; poslední dva týdny tvoří E6. Testování jednotlivých funkcí se provádí průběžně, neodkládá se do poslední etapy. Při změně rozsahu se přesune termín nebo kapacita, povinné funkce ODT se potichu nevyřadí.

## Konkrétní doménové akceptační scénáře

Tyto scénáře jsou připravené pro navazující implementaci; **v skeletonu nejsou provedené**.

### Dva sporty a soutěžní výpočet

- Admin založí fotbal a basketbal, týmy a soutěže z UI. Uloží fotbal 3/1/0 a basketbal výhra 2/prohra 1/kontumační prohra 0, zákaz remízy a různé pořadí kritérií. Na serveru není `if (sport == FOOTBALL)` pro pevné pole góly nebo pevné body.
- Fotbal A–B 2:0, A–C 0:1, B–C 1:1: tabulka má C 4 body, A 3, B 1. Návrh výsledku se nezapočte; jeho potvrzení se započte právě jednou. Anulování posledního zápasu vede k novému přepočtu.
- Basketbal A–B 80:70, B–C 90:80, C–A 85:75: všechny týmy mají jednu výhru/jednu prohru a 3 body. Při konfiguraci z [modelu](domain-model.md) jsou vzájemné body i rozdíly shodné, pořadí určí vstřelené skóre C 165, B 160, A 155. Potvrzení výsledku 80:80 se odmítne.
- Samostatné fixtures ověří minitabulku tří a čtyř týmů, rozdělení shodné skupiny a restart kritérií pro menší skupinu, chybějící vzájemný zápas v obou režimech, kontumaci, úplnou shodu a ruční auditované rozhodnutí. Algoritmus skončí i bez rozdělení skupiny.
- Admin změní body novou verzí pravidel a explicitně přepočte sezonu. Původní snapshot je dohledatelný; body se nehromadí z předchozí cache. Oprava výsledku aktualizuje tabulku i statistiky v jedné konzistentní revizi.

### Statistika bez úpravy kódu

- Admin přidá `INTEGER` „Góly“ s min 0 a SUM; basketbalu „Body“ a „Doskoky“. Formulář se vygeneruje z definic. Negativní/decimal hodnota pro celočíselnou statistiku se odmítne i přímým API.
- Přidá `DECIMAL` „Herní minuty“ se škálou a AVG, `BOOLEAN` „Základní sestava“ s COUNT_TRUE a `TEXT` „Poznámka“ s NONE. TEXT+SUM se odmítne při konfiguraci. Chybějící hodnota se v AVG nezamění za nulu.
- Přejmenuje definici novou verzí. Starý zápas zobrazí původní verzi; změna datového typu pod existující historií se odmítne. Hodnoty cizího sportu/hráče bez účasti se nezapíšou. Agregace lze filtrovat hráčem, týmem a sezónou.

### Událost, rodič a historie

- Nezletilý hráč nemá účet, jeho rodič má ověřenou vazbu. Rodič u tréninku potvrdí dostupnost, trenér u zápasu vytvoří nominaci, skutečnou docházku zapisuje po události zvlášť. Hráč s nominací a absencí se nevykáže jako přítomný.
- Stejný tok funguje pro jinou klubovou událost a basketbal, bez nového controlleru pro druh sportu.
- Při přestupu se vytvoří nové členství, minulá sezóna a výsledky zůstanou. Odebrání rodičovské vazby nebo přiřazení trenéra zruší další přístup, i když je session stále přihlášená.
- Změna času/rušení a publikování nominace vytvoří schránkové notifikace právě jednou pro správné uživatele; ne pro cizí tým.

### Příspěvky a komunikace

- Předpis 1 000 CZK, platby 400 a 600: stavy nesplaceno → částečně → zaplaceno. Storno úhrady 600 vrátí zůstatek 600 a zachová původní zápisy. Nová platba 700 může alokovat 600 a ponechat kredit 100.
- Pokus o alokaci více než zbývající částka platby nebo předpisu se odmítne. Dva souběžné požadavky zůstatek nepřečerpají; opakování stejného idempotentního požadavku nevytvoří druhou platbu.
- Před splatností a po ní obdrží notifikaci člen/jeho oprávněný zástupce a administrátor. Opakovaný scheduler běh nevytvoří duplicitu. Plná úhrada zastaví další upozornění, odstávka neztratí dosud neodeslané upozornění.
- Trenér, hráč a rodič vedou konverzaci oddělenou od automatických notifikací. Cizí účet ji nevidí; zánik vazby či týmu odmítne následující čtení/odeslání.

## Testovací strategie a definition of done

- **Backend unit:** bodování, skupinové tie breakers a minitabulky, typová validace a agregace statistik, zůstatky/alokace/storna, intervalová a objektová autorizace, recipient výběr a reminder deduplikace. Čisté funkce se testují bez mockování celé Spring aplikace.
- **Backend integration:** Spring security a service/repository nad čistým PostgreSQL Testcontainerem, skutečné Flyway migrace, session/CSRF/CORS/401/403, negativní scénáře A01–A18, transakční rollback, souběh alokací a outbox. Upgrade migrace musí zachovat testovací minulou sezónu.
- **Frontend unit:** API/error mapping, CSRF klient a auth stav, typed statistické validace, formatter peněz a výpočet formulářového stavu. Testy nesmějí pouze kopírovat stejný vzorec z implementace.
- **Frontend integration:** komponenty/providery/router s realistickým HTTP mockem: login/refresh/logout, API výpadek odlišený od 401, formulář dostupnosti, nominace, statistiky a částečné platby, 403/404 a prázdné stavy, notifikace a samostatná konverzace. Testuje se chování uživatele, ne interní názvy CSS.
- **Systémová akceptace:** Compose sestava, reálný browser tok, dvě sportovní konfigurace a čtyři role, mobilní a desktopové rozhraní, HTTPS/cookies/proxy a obnova zálohy. CI kontroluje backend verify, frontend testy/lint/typecheck/build; publikování release je samostatný krok.

Hotová etapa má reviewed PR, zelené relevantní unit a integrační testy obou částí, průchod konkrétní akceptací, migrační/rollback plán, dokumentované přístupové hranice a pravdivý stav příručky. Konfigurovaný HTTPS reverse proxy v repozitáři není důkaz živého nasazení; produkční URL a ověření TLS/cookies musí být zapsané až po skutečném nasazení podle [postupu](deployment.md).
