# Návrh databáze

**Stav E0 + P1–P3:** V1–V3 se nemění; V3 přidala sedm tabulek sezón/týmů/hráčů/členství a rodičovských vazeb, V4 přidává neveřejnou autorizační revizi a ochranné triggery. Počet zůstává 12 z cílových 38 tabulek; dalších 26 je návrh. P3 již poskytuje account/person-link, schválené rodiče, Moje děti a omezené CHILD sportovní čtení. Úplná akceptace E1 ani celý projekt nejsou uzavřené. DBML/diagram nejsou důkaz provedené migrace nebo testu; výsledky jsou v [ověření](verification.md).

Úplný a jediný aktuální návrh tabulek a invariantů je v [databázovém modelu](database.md), jeho strojově čitelná podoba v [sport-club.dbml](sport-club.dbml) a přehled vztahů v [ER diagramu](ERD%20diagram.svg). Tento rozcestník nahrazuje dřívější paralelní návrh, aby implementace nevycházela ze dvou různých schémat.

## Závazné vlastnosti

- Jedna aplikace spravuje jeden klub a více sportů současně. Sporty jsou záznamy `sports`; každý tým má právě jeden povinný `sport_id`. Fotbalové i basketbalové týmy mohou být ve stejné instalaci i sezóně.
- Osoba, účet a hráčský profil jsou oddělené. Účty hráčů a rodičů jsou volitelné. Jediný standardní účet může současně spravovat instalaci a trénovat vlastní týmy.
- Dětský účet je omezený účet `CHILD`, propojený s vlastním hráčským profilem a schváleným rodičem se standardním účtem. Nemá přístup k financím ani finančním notifikacím a nedědí oprávnění rodiče. Hráčský profil bez přihlášení rodiče nepotřebuje.
- Dostupnost, nominace, skutečná docházka a nastoupení jsou samostatné skupiny údajů. Zápas rozšiřuje obecnou událost.
- Bodování, kontumace a pořadí včetně vzájemných zápasů jsou uloženou konfigurací. Tabulky používají aktivní potvrzené revize výsledků; rozpracované ani anulované výsledky se nezapočítávají.
- Opravy potvrzených výsledků, částí a statistik vytvoří novou revizi a zachovají původní hodnoty. Čítač `version` slouží k optimistic locking a nenahrazuje historii.
- Individuální statistiky mají administrátorské definice, typovou validaci a kompatibilní agregace. Historické hodnoty odkazují na neměnnou verzi definice.
- Příspěvek patří osobě; administrátor eviduje několik částečných úhrad a odůvodněná storna. Online platební brána není součástí projektu. Notifikace a konverzace jsou dvě oddělené funkce.

## Hranice databáze a služeb

PostgreSQL 16 používá UUID, přesné `numeric` pro peníze a desetinné statistiky, `date` pro splatnosti a `timestamptz` pro okamžiky. PK/FK, jedinečnost a lokální `CHECK` tvoří základ integrity. V3 má EXCLUDE s btree_gist pro obě členství a guard triggery hranic/archivu, V4 guardian/user guardy a automatické zakázání dítěte bez rodiče; ostatní popsané invarianty se doplní s dalšími doménami. Bezpečnostní a doménové podmínky ověřuje transakční Spring service také u přímého API požadavku; frontend je nenahrazuje.

Doménové operace dodržují společný zamykací postup z [modelu](database.md#integrita-a-souběžné-operace), znovu ověří aktuální oprávnění a ve stejné transakci zapíší audit. Doručení notifikací se přidá s plánovanou schránkou. Historie se nemaže kaskádou. Označení enumů v DBML je logický číselník; konkrétní Flyway migrace musí zachovat kompatibilitu dosavadních dat.

## Implementační a migrační postup

Nové Flyway soubory vznikají v `backend/src/main/resources/db/migration/` spolu s implementací služby, autorizačními a integračními testy. V1 ani již nasazené migrace se nepřepisují. V2 převádí původní pětici rolí na `USER/ADMIN`, zachovává UUID/hashe/časy a ukládá neveřejné legacy_role. Neúplné účty mají přechodně nullable person_id a vlastní onboarding bez vymyšlených osobních údajů. Existující ADMIN uzavírá setup. P2 přidává odvozené týmové vztahy; P3 přidává ověřený person-link, správu účtů/rodičů a samostatnou CHILD aktivaci. V4 při upgradu nejprve zakáže starší CHILD účty; nevytváří jim fiktivní osoby ani vazby. Neveřejný auth_revision odvolá starou session i po reaktivaci, není verzí pro optimistic locking ani polem API. Nové schválení nebo povolení rodiče dítě samo nezapne. Navržená migrace soutěžní konfigurace se posouvá na V5 a další čísla se potvrzují při implementaci. NOT NULL pro person_id přijde až po ověřeném backfillu v samostatné migraci.

Každá etapa ověří prázdnou databázi i upgrade starší verze nad PostgreSQL Testcontainers. Hibernate zůstává `ddl-auto=validate`, bez automatického baseline. Vývojová demonstrační data ani známá hesla nepatří do produkční migrace. Zálohování a zkušební obnovu popisují [model](database.md#zálohování-a-obnova) a [nasazení](deployment.md).

Akceptační scénáře jsou v [roadmapě](roadmap.md), aktuální implementační stav v [požadavcích](requirements.md) a přístupové podmínky v [autorizaci](authorization.md).

## Ověření DBML a obnovení diagramu

Diagram vzniká lokálně z DBML pomocí oficiálního parseru a Graphviz ve WebAssembly. Neposílá návrh na externí službu. Nástroje jsou oddělené od runtime závislostí aplikace; následující příkazy použijte z kořene repozitáře s Node z `.nvmrc`:

```sh
SCHEMA_TOOLS_DIR="$(mktemp -d)"
npm install --prefix "$SCHEMA_TOOLS_DIR" --no-save --ignore-scripts --no-audit --no-fund @dbml/core@10.3.1 @dbml/cli@10.3.1 @viz-js/viz@3.31.0
"$SCHEMA_TOOLS_DIR/node_modules/.bin/dbml2sql" docs/sport-club.dbml --postgres -o "$SCHEMA_TOOLS_DIR/model.sql"
node scripts/generate_erd.mjs "$SCHEMA_TOOLS_DIR/node_modules"
```

Export SQL pouze ověřuje a převádí logický návrh; nespouští migraci. Neobsahuje implementaci service pravidel ani všechna budoucí intervalová omezení. Výsledek patří do dočasné složky, nikoli do Flyway. Při každé změně DBML obnovte i sledovaný SVG a vizuálně ho zkontrolujte. Běžné backendové a frontendové testy nenahrazují akceptaci navrhované domény.
