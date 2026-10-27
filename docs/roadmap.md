# Implementační plán a dokončení projektu

Skeleton je první etapa. **Finální ročníkový projekt musí splnit celý rozsah `zadani_sportovni_klub_v2.odt`**, nikoli pouze autentizaci nebo první sport. Následující doménové etapy jsou plánované; checkboxy se mění až po implementaci, testech a akceptaci. Záznam sportu v DB nebo návrh tabulky sám o sobě není hotová správa soutěží.

Konkrétní pořadí balíčků P0–P9, bezpečný převod současných účtů a závislosti Flyway migrací rozpracovává [pracovní plán](implementation-plan.md). [API kontrakt](api-contract.md) rozlišuje dostupné P1 a plán ostatních DTO. Celá etapa E1 se neuzavírá dokončením jediného balíčku.

## Implementovaný rozsah E0 + P1

E0 poskytuje auth/info, Next.js technické stránky, Docker a CI. P1 přidává V2 s osobami/klubem/auditem/sporty, přechod starých rolí na USER/ADMIN, STANDARD/CHILD a enabled, vlastní GET/POST `/me/person`, čerstvý `/me/context`, bezpečný setup a administrátorskou správu sportů. UI `/profile`, `/setup` a `/admin/sports` používá skutečné API. Prověřené běhy a omezení jsou datované v [ověření](verification.md); tento přehled žádné nové testy neoznačuje za úspěšné.

P1 je **podmnožina E1**. Není to administrace cizích osob/účtů, person-link, obecné přiřazování rolí, tým, trenérství, hráčský profil ani rodičovská vazba. CHILD zůstává blokovaný do P3. Neexistuje finance/team capability, události, nominace, docházka, výsledky, statistiky, příspěvky, messaging ani schránka. V2 má users/persons/club/audit_log/sports; dalších 33 tabulek cílového modelu je plán. Veřejná registrace vytvoří USER/STANDARD/PENDING a neúplná osoba nejdříve projde vlastním onboardingem.

## Etapy a výstupy

| Etapa | Výstup a závislosti | Povinná akceptace před uzavřením |
| --- | --- | --- |
| E0 — technický skeleton a návrh | Nový samostatný repozitář s vlastní historií; zachovaná licence a původ šablony; backend, Next.js, DB, Docker, CI; všechna doménová rozhodnutí v docs | Čistý clone postup, Maven verify nad čerstvým PostgreSQL, frontend unit/integration + lint/typecheck/build, auth/CSRF/CORS/session/401/403, INFO/VERSION v JAR, Compose ověření. Neprovedené kontroly zapsat jako neprovedené. |
| E1 — členové a týmy (část P1 implementovaná, celek rozpracovaný) | Migrace osob, účtů STANDARD/CHILD, sportů, sezón, profilů, rodičovských vazeb a časových členství; jednorázový setup, administrátorské UI, scoped dotazy a audit. Závisí na E0 | Dva sporty současně ve stejné aplikaci bez kódu, každý tým právě jeden sport; jediný trenér/admin i dítě bez účtu; omezený CHILD pod rodičem bez financí; rodič více dětí; negativní scénáře autorizace, historický přestup; frontend responzivní seznam a formuláře. |
| E2 — události a účast | Kalendář obecného Event; oddělené dostupnost/nominace/docházka; transakční notifikace a schránka; změny a rušení. Závisí na E1 | Trénink, zápas i jiná událost; hráč/rodič potvrdí dostupnost a trenér publikuje nominaci; skutečná docházka se neodvozuje z nominace; notifikace nové/změněné události a nominace idempotentně; A03, A06–A09, A12–A13. |
| E3 — soutěže, výsledky, tabulky a statistiky | Soutěžní sezóny, soupeři, revize výsledků, admin pravidla a dynamické definice statistik; přepočet; historické pohledy. Závisí na E1+E2 | Povinné demonstrační scénáře fotbalu **i basketbalu** bez změny kódu; konfigurovatelné body/tie breakers v UI; minitabulka a restart podskupiny; validace typů, agregací a verzí statistik; A15, A18. |
| E4 — členské příspěvky | Předpisy, splatnosti, skutečné admin částečné úhrady a storna; idempotentní reminder scheduler. Závisí na E1+schránka z E2 | Nesplaceno/částečně/zaplaceno; několik úhrad, korekce a souběh; notifikace před i po splatnosti standardnímu členu/oprávněnému rodiči **a adminovi**, nikdy dítěti; A05, A09–A10, A14. Bez platební brány. |
| E5 — vnitrosystémová komunikace | Samostatné přímé/týmové konverzace, účastníci, zprávy, přečtení a zánik přístupu. Závisí na E1 | Trenér komunikuje s hráčem a rodičem v oprávněném týmu; messaging má vlastní UI vedle notifikací; A11; odebrání vazby ihned zabrání čtení/odeslání. |
| E6 — úplná akceptace a nasazení | Doplněná příručka skutečných obrazovek všech čtyř rolí, migrace upgrade, mobilní a chybové stavy, HTTPS nasazení, záloha/obnova, systémové scénáře | Celá [matice požadavků](requirements.md) má funkční důkaz/test; backendové i frontendové unit a integrační testy; čisté deploy a restore; žádný doménový požadavek nesmí zůstat jen v roadmapě. |

První vertikální doménové MVP může projít s **jednou fotbalovou konfigurací** (členové → událost → výsledek → tabulka → statistika). Je to průběžná dodávka. E3 a finální akceptace povinně přidávají basketbal pouhou konfigurací. Podpora druhého sportu není volitelná budoucí funkce za koncem projektu.

Při realizaci ověříme oba sporty už v týmových formulářích E1. Základ formátů a soutěžní konfigurace z E3 musí předcházet dokončení zápasové části E2; pořadí etap není zákaz této potřebné závislosti. Potvrzení přečtení chatových zpráv uvedené v E5 vyžaduje před implementací doplnění kontraktu a úložiště; současné DBML obsahuje `read_at` pouze pro notifikační doručení. Povinná komunikace se dodá jako samostatné konverzace a zprávy, nepředstírá se hotový chatový read receipt.

Každá etapa dodá Flyway migrace, reálné REST DTO a validace, service oprávnění, frontend obrazovky, testy, aktualizaci příručky a stavové matice. Nevznikají prázdné controllery, fiktivní endpointy ani dashboardy s náhodnými klubovými čísly. Listy a formuláře musí ukazovat stav načítání, prázdná data, chybu API, validaci a odmítnuté oprávnění.

## Orientační harmonogram ze zadání

ODT doporučuje 2 týdny návrhu, 5 týdnů základní implementace a 2 týdny testování/nasazení. Je to relativní plán od dohodnutého začátku práce, nikoli potvrzený kalendářní termín. E0 a návrh E1–E5 patří do prvních dvou týdnů; E1–E5 jsou rozdělené do následujících pěti týdnů; poslední dva týdny tvoří E6. Testování jednotlivých funkcí se provádí průběžně, neodkládá se do poslední etapy. Při změně rozsahu se přesune termín nebo kapacita, povinné funkce ODT se potichu nevyřadí.

## Konkrétní doménové akceptační scénáře

Následující úplné doménové scénáře jsou připravené pro navazující implementaci. P1 dodává jen vlastní osobu, setup a sporty; výsledek jejich skutečného ověření je v `verification.md`. Týmové a ostatní navazující scénáře zatím provedené nejsou.

### Jediný trenér a dětský účet pod rodičem

- Standardní registrovaný USER dokončí prvotní nastavení pouze s jednorázovým instalačním tokenem z prostředí. Získá ADMIN, založí sport, sezónu a tým a přiřadí sebe trenérem. Veřejná registrace nepřiděluje ADMIN automaticky prvnímu příchozímu. Dva souběžné pokusy o setup mohou uspět nejvýše jednou; CHILD setup nikdy nesmí provést.
- Jeden účet vede hráčské profily, tréninky, zápasy a docházku. Není potřeba další administrátor, rodičovský účet ani účet hráče. Pozdější propojení s účtem zachová person/player ID a historii.
- Admin ověří vazbu rodiče na dítě, rodič má aktivní STANDARD účet. Teprve poté aktivuje CHILD na hráčově vlastní osobě. Rodič ve svém přehledu vidí své děti; každé dítě vidí jen vlastní povolené sportovní údaje. Více dětí nemění přístup mezi sourozenci.
- CHILD nedostane finance ani přes přímý HTTP požadavek na vlastní/cizí předpis, platbu, finanční export, součet nebo notifikaci. Finanční upozornění dostane rodič a administrátor, nikoli dítě. Skrytí odkazu v UI samo nestačí.
- Dítě nemůže změnit svůj typ účtu, rodiče, roli nebo privilegované osobní údaje. Zánik poslední platné rodičovské vazby/účtu okamžitě zablokuje další přístup dítěte a zneplatní session; obnovení vyžaduje nové ověření a explicitní aktivaci adminem.

### Dva sporty a soutěžní výpočet

- Admin založí fotbal a basketbal, týmy a soutěže z UI. Uloží fotbal 3/1/0 a basketbal výhra 2/prohra 1/kontumační prohra 0, zákaz remízy a různé pořadí kritérií. Na serveru není `if (sport == FOOTBALL)` pro pevné pole góly nebo pevné body.
- Fotbal A–B 2:0, A–C 0:1, B–C 1:1: tabulka má C 4 body, A 3, B 1. Návrh výsledku se nezapočte; jeho potvrzení se započte právě jednou. Anulování posledního zápasu vede k novému přepočtu.
- Basketbal A–B 80:70, B–C 90:80, C–A 85:75: všechny týmy mají jednu výhru/jednu prohru a 3 body. Při konfiguraci z [modelu](domain-model.md) jsou vzájemné body i rozdíly shodné, pořadí určí vstřelené skóre C 165, B 160, A 155. Potvrzení výsledku 80:80 se odmítne.
- Samostatné fixtures ověří minitabulku tří a čtyř týmů, rozdělení shodné skupiny a restart kritérií pro menší skupinu, chybějící vzájemný zápas v obou režimech, kontumaci, úplnou shodu a ruční auditované rozhodnutí. Algoritmus skončí i bez rozdělení skupiny.
- Použitá pravidla a formát nelze přepsat. Nová konfigurace dostane nový formát nebo ročník; historická pravidla zůstanou dohledatelná. Oprava výsledku vytvoří novou revizi a v jedné transakci aktivuje její části, snapshot účastníků a statistiky. Předchozí skóre i hodnoty zůstanou čitelné; tabulka započte jen aktivní potvrzenou revizi a zneplatní staré ruční rozhodnutí/cachi.

### Statistika bez úpravy kódu

- Admin přidá `INTEGER` „Góly“ s min 0 a SUM; basketbalu „Body“ a „Doskoky“. Formulář se vygeneruje z definic. Negativní/decimal hodnota pro celočíselnou statistiku se odmítne i přímým API.
- Přidá `DECIMAL` „Herní minuty“ s nejvýše 6 desetinnými místy a AVG, `BOOLEAN` „Základní sestava“ s COUNT_TRUE a `TEXT` „Poznámka“ s NONE. TEXT+SUM se odmítne při konfiguraci. Chybějící hodnota se v AVG nezamění za nulu.
- Přejmenuje definici novou verzí. Starý zápas zobrazí původní verzi; změna datového typu pod existující historií se odmítne. Hodnoty cizího sportu/hráče bez účasti se nezapíšou. Agregace lze filtrovat hráčem, týmem a sezónou.

### Událost, rodič a historie

- Nezletilý hráč nemá účet, jeho rodič má ověřenou vazbu. Rodič u tréninku potvrdí dostupnost, trenér u zápasu vytvoří nominaci, skutečnou docházku zapisuje po události zvlášť. Hráč s nominací a absencí se nevykáže jako přítomný.
- Stejný tok funguje pro jinou klubovou událost a basketbal, bez nového controlleru pro druh sportu.
- Při přestupu se vytvoří nové členství, minulá sezóna a výsledky zůstanou. Odebrání rodičovské vazby nebo přiřazení trenéra zruší další přístup, i když je session stále přihlášená.
- Změna času/rušení a publikování nominace vytvoří schránkové notifikace právě jednou pro správné uživatele; ne pro cizí tým.

### Příspěvky a komunikace

- Předpis 1 000 CZK, platby 400 a 600: stavy nesplaceno → částečně → zaplaceno. Storno úhrady 600 vrátí zůstatek 600 a zachová původní zápisy. Nová úhrada 600 doplatí předpis. Úhrada 700 se při zůstatku 600 odmítne; tento model nevede kredit.
- Pokus o úhradu nad zůstatek předpisu nebo snížení předpisu pod platné úhrady se odmítne. Dva souběžné požadavky zůstatek nepřečerpají; opakování stejného idempotentního požadavku nevytvoří druhou platbu.
- Před splatností a po ní obdrží notifikaci standardní účet člena/jeho oprávněný rodič a administrátor. CHILD nemá doručení ani finanční text ve schránce. Opakovaný scheduler běh nevytvoří duplicitu. Plná úhrada zastaví další upozornění, odstávka neztratí dosud neodeslané upozornění.
- Trenér, hráč a rodič vedou konverzaci oddělenou od automatických notifikací. Cizí účet ji nevidí; zánik vazby či týmu odmítne následující čtení/odeslání.

## Testovací strategie a definition of done

- **Backend unit:** bodování, skupinové tie breakers a minitabulky, typová validace a agregace statistik, zůstatky/částečné úhrady/storna, intervalová a objektová autorizace, recipient výběr a reminder deduplikace. Čisté funkce se testují bez mockování celé Spring aplikace.
- **Backend integration:** Spring security a service/repository nad čistým PostgreSQL Testcontainerem, skutečné Flyway migrace, session/CSRF/CORS/401/403, všechny negativní scénáře autorizace včetně CHILD, transakční rollback, souběh úhrad a transakční doručení. Upgrade migrace musí zachovat testovací minulou sezónu.
- **Frontend unit:** API/error mapping, CSRF klient a auth stav, typed statistické validace, formatter peněz a výpočet formulářového stavu. Testy nesmějí pouze kopírovat stejný vzorec z implementace.
- **Frontend integration:** komponenty/providery/router s realistickým HTTP mockem: login/refresh/logout, API výpadek odlišený od 401, formulář dostupnosti, nominace, statistiky a částečné platby, 403/404 a prázdné stavy, notifikace a samostatná konverzace. Testuje se chování uživatele, ne interní názvy CSS.
- **Systémová akceptace:** Compose sestava, reálný browser tok, dvě sportovní konfigurace současně, všechny klubové kontexty, dítě pod rodičem a režim jediného trenéra, mobilní a desktopové rozhraní, HTTPS/cookies/proxy a obnova zálohy. CI kontroluje backend verify, frontend testy/lint/typecheck/build; publikování release je samostatný krok.

Hotová etapa má reviewed PR, zelené relevantní unit a integrační testy obou částí, průchod konkrétní akceptací, migrační/rollback plán, dokumentované přístupové hranice a pravdivý stav příručky. Konfigurovaný HTTPS reverse proxy v repozitáři není důkaz živého nasazení; produkční URL a ověření TLS/cookies musí být zapsané až po skutečném nasazení podle [postupu](deployment.md).
