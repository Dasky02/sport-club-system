# Databáze sportovního klubu

Databáze je navržena pro PostgreSQL 16. Jedna instalace spravuje jeden klub a jeden týmový sport. Model obsahuje 31 tabulek. Schéma je popsáno v [DBML](sport-club.dbml) a funkční rozsah vychází ze [zadání v2](../zadani_sportovni_klub_v2.md).

Jde o logický návrh. V aplikaci je zatím připravený pouze technický základ; databázové migrace a klubové funkce dosud nejsou implementované.

## Přehled tabulek

| Tabulka                        | Účel                                                         |
| ------------------------------ | ------------------------------------------------------------ |
| `persons`                      | Osobní a kontaktní údaje.                                    |
| `users`                        | Přihlašovací účet a systémová role `USER` nebo `ADMIN`.      |
| `player_profiles`              | Hráčský profil osoby, i bez přihlašovacího účtu.             |
| `guardian_links`               | Schválené vazby zástupců na hráče.                           |
| `club`                         | Klub a sport dané instalace.                                 |
| `seasons`                      | Sezóny a jejich archivace.                                   |
| `teams`                        | Klubové týmy a externí soupeři.                              |
| `team_seasons`                 | Tým v konkrétní sezóně, včetně tehdejšího názvu a kategorie. |
| `player_team_memberships`      | Časově platná členství hráčů v týmech a čísla dresů.         |
| `coach_team_memberships`       | Časově platná přiřazení trenérů k týmům.                     |
| `events`                       | Tréninky, zápasy a další akce.                               |
| `event_teams`                  | Týmy přiřazené k akci.                                       |
| `event_participants`           | Účastníci akcí, dostupnost, nominace, docházka a nastoupení. |
| `competitions`                 | Soutěže.                                                     |
| `competition_seasons`          | Ročníky soutěží a jejich pravidla.                           |
| `match_formats`                | Formát zápasu a způsob vyhodnocení výsledku.                 |
| `competition_point_rules`      | Přidělování bodů do soutěžní tabulky.                        |
| `competition_ranking_criteria` | Kritéria pořadí v soutěžní tabulce.                          |
| `competition_entries`          | Týmy přihlášené do ročníku soutěže.                          |
| `matches`                      | Strany zápasu, formát a konečný výsledek.                    |
| `match_periods`                | Skóre jednotlivých částí zápasu.                             |
| `statistic_definitions`        | Definice individuálních statistik.                           |
| `player_match_statistics`      | Hodnoty statistik hráčů v zápasech.                          |
| `fee_assessments`              | Předepsané členské příspěvky a splatnosti.                   |
| `fee_payments`                 | Ručně evidované úhrady příspěvků.                            |
| `conversations`                | Konverzace navázané na sezónní tým.                          |
| `conversation_participants`    | Účastníci konverzací.                                        |
| `messages`                     | Zprávy v konverzacích.                                       |
| `notifications`                | Oznámení vytvořená při změnách nebo blížící se splatnosti.   |
| `notification_deliveries`      | Doručení a přečtení oznámení jednotlivými uživateli.         |
| `audit_log`                    | Záznam důležitých změn.                                      |

## Osoby, účty a oprávnění

Osobní údaje se ukládají do `persons`. Jedna osoba může mít nejvýše jeden účet (`users`) a jeden hráčský profil (`player_profiles`); oba používají jedinečné `person_id`. Hráčský profil nevyžaduje účet, takže lze evidovat i dítě, které se samo nepřihlašuje. Osoba s hráčským profilem musí mít datum narození. Propojení použitých účtů a profilů s jinou osobou není dovoleno.

V `users` se ukládá pouze systémová role `USER` nebo `ADMIN`. Ostatní oprávnění vyplývají z aktuálních vztahů:

- **Trenér** má platné přiřazení v `coach_team_memberships`.
- **Hráč** má vlastní hráčský profil a odpovídající členství v týmu.
- **Rodič nebo zástupce** má schválenou vazbu v `guardian_links`.

Tyto vztahy se mohou kombinovat. Trenér tedy může být současně rodičem nebo administrátorem. Trenérské oprávnění samo o sobě neumožňuje přístup k finančním údajům hráče; k údajům vlastního dítěte je potřeba samostatná rodičovská vazba. Uživatel bez klubových vztahů nemá přístup k týmovým údajům. Účet může vidět vlastní příspěvky.

Rodičovské vazby schvaluje administrátor a lze je odvolat. Odvolání ukončí oprávnění k dítěti, pokud neexistuje jiný platný důvod přístupu.

Dosavadní technický základ aplikace používá role `USER`, `ADMIN`, `COACH`, `PLAYER` a `PARENT`. Při implementaci bude potřeba přejít na nový způsob autorizace. Současnou databázovou migraci ani přihlašování tento návrh nemění. Přístup se vždy vyhodnocuje podle aktuální role, vztahů a stavu záznamu; podrobnosti jsou v [autorizaci](authorization.md).

## Týmy a sezóny

`club` má jediný řádek s `id = 1`. Sport je pro danou instalaci pevně zvolený; další sport vyžaduje samostatnou instalaci. Klubové a externí týmy jsou v `teams`, jejich podobu v konkrétní sezóně zachovává `team_seasons`. Dvojice `(team_id, season_id)` je jedinečná.

Hráčská i trenérská členství mají interval `[valid_from, valid_to)`. Neuvedené `valid_to` znamená konec sezóny. Překrývající se intervaly stejné dvojice hráč/tým nebo trenér/tým zakáže omezení `EXCLUDE` v PostgreSQL (`btree_gist`). Členství různých týmů téhož hráče se překrývat mohou.

Sezóna používá interval `[starts_on, ends_on)` v časové zóně `Europe/Prague`. Jakmile je použita v sezónním týmu, soutěžním ročníku, akci nebo příspěvku, její hranice se už nemění. Změny členství a dalších historických vztahů nesmějí zpětně zneplatnit uskutečněné akce nebo statistiky.

## Akce a účast hráčů

`events` obsahuje společné údaje pro trénink, zápas i jinou akci. Sezónní týmy akce jsou v `event_teams`. Tabulka `event_participants` má primární klíč `(event_id, player_id)`, takže hráč je na jedné akci veden nejvýše za jeden tým. Tým účastníka musí být přiřazený k akci.

Dostupnost, nominace, docházka a nastoupení jsou čtyři samostatné skupiny sloupců v `event_participants`. Každá má vlastní stav, autora a čas změny. Databázová kontrola vyžaduje, aby byla skupina buď celá vyplněná, nebo celá prázdná. Prázdná hodnota (`NULL`) znamená, že údaj nebyl zapsán. Hodnoty `UNKNOWN`, `NOT_SELECTED` a `played = false` naopak představují výslovný záznam.

Pravidla zápisu:

- Hráč nebo jeho aktuální zástupce může potvrdit dostupnost nejpozději do uzávěrky nebo začátku akce. Odpovědi přijímá pouze publikovaná akce.
- Nominaci zapisuje trenér nebo administrátor. Hráči a rodiče ji vidí až po `nomination_published_at`.
- Docházku a nastoupení zapisuje trenér nebo administrátor po začátku publikované akce. Opravy dokončené akce vyžadují odpovídající oprávnění.
- `played` se používá jen u zápasů. Hodnota `true` vyžaduje docházku `PRESENT` nebo `LATE` a tým účastníka musí být jednou ze stran zápasu.
- Zrušené akce nepřijímají běžné sportovní zápisy. Koncepty nevidí hráči ani rodiče.

Každá změna upravuje pouze povolenou skupinu polí, nikoli celý řádek převzatý z formuláře. Čas a autor se doplní na serveru. Společná hodnota `version` chrání před přepsáním změn ze zastaralého formuláře. Při zveřejnění nominace a při její následné změně vznikne také oznámení.

### Soupisky, přestupy a změny termínů

Při založení nebo zveřejnění akce se účastníci výslovně vytvoří ze soupisky platné k jejímu začátku. Nejde o živý pohled: příchod nového hráče do týmu automaticky nepřepisuje účastníky již vytvořených akcí. Pokud má hráč více platných členství, vybere se pro akci jeden tým.

Budoucího účastníka lze před začátkem akce vyřadit pomocí `withdrawn_at` a důvodu. Nesmí už mít zapsanou docházku, nastoupení ani statistiky. Odpověď a nominace zůstanou uložené kvůli historii, ale účastník se dále nepovažuje za aktivního. Pokud už byla nominace zveřejněná, změna se oznámí. Prázdný záznam budoucí účasti lze také odstranit. Vrácení vyřazeného účastníka je možné jen jako odůvodněná administrátorská oprava.

Přestup ukončí původní členství a založí nové. Neplatné budoucí účasti se musí vyřadit nebo odstranit ve stejné transakci; jinak se přestup odmítne. Historická účast zůstává přiřazená původnímu týmu. Podobně při posunu akce musí aplikace znovu zkontrolovat členství, uzávěrku a ostatní navázané údaje. Existující dostupnost a nominace se automaticky nemažou; změna termínu vyvolá oznámení a případně nové potvrzení účasti.

Celá akce se musí vejít do hranic sezóny. Konec akce může být přesně na jejím konci. Událost nelze přesunout do jiné sezóny; dosud neodehranou akci lze zrušit a vytvořit novou. `events.season_id` a `events.type` lze měnit pouze u konceptu bez týmů, účastníků, zápasu a oznámení.

Zápas má právě jeden záznam v `matches`, ostatní akce žádný. Strany zápasu, akce a případný ročník soutěže musejí patřit do stejné sezóny. Soutěžní strany musejí být přihlášené do daného ročníku; klubové strany odpovídají týmům přiřazeným akci. Zápas dvou externích týmů klubové účastníky nepotřebuje. Strany zápasu se po prvním výsledku, části, nastoupení nebo statistice běžně nemění.

Primární klíče se nepřepisují a historie se nemaže kaskádou. Oprava starých údajů vyžaduje administrátorské oprávnění, důvod a kontrolu všech navázaných záznamů.

## Zápasy a soutěžní tabulky

### Formát zápasu

`match_formats` popisuje způsob vyhodnocení zápasu nezávisle na bodování soutěže. Podporované režimy jsou:

- `SUM_SCORE`: konečné skóre je součet částí zápasu, například gólů po třetinách nebo bodů po čtvrtinách.
- `WON_PARTS`: konečné skóre vyjadřuje počet vyhraných částí, například setů ve volejbalu.

Formát určuje povolení remízy, případnou povinnost evidovat části, jejich označení a počet, počet částí potřebných k vítězství a možnost prodloužení či nájezdů. `regulation_period_count = NULL` znamená neomezený počet částí v základní době. Jeden formát může používat více soutěžních ročníků i přátelských zápasů.

Bodování a řazení tabulky patří konkrétnímu `competition_seasons`, nikoli formátu. Soutěžní zápas musí použít stejný formát jako jeho ročník. Přátelský zápas si formát určuje přímo a nepotřebuje bodovací pravidla soutěže.

Při uložení první části nebo úplného výsledku se nastaví `match_formats.locked_at` a u soutěžního zápasu také `competition_seasons.locked_at`. Použitý formát, bodování a kritéria pořadí se pak nemění ani při opravě či odstranění výsledku. Pro odlišná pravidla se vytvoří nový formát nebo nový ročník. Kosmetické přejmenování zobrazení historie neovlivní výpočty.

### Výsledek a části zápasu

`matches` ukládá výsledek přímo: obě skóre, způsob ukončení, autora a čas zápisu. Všech pět údajů musí být vyplněno společně, jinak zůstanou všechny prázdné. Výsledek se zapisuje po konci publikované akce nebo jako oprava dokončené akce. Akci lze dokončit až po jejím konci a zápas vyžaduje úplný platný výsledek. Do oficiálních statistik a tabulek se započítávají pouze dokončené nezrušené zápasy.

Jednotlivé části ukládá `match_periods` s pořadovým číslem a fází `REGULATION`, `OVERTIME` nebo `SHOOTOUT`. Při dokončení musí být číslování souvislé od jedničky a fáze musejí být ve správném pořadí.

V režimu `SUM_SCORE` se sčítají základní části a prodloužení. Nájezdy se do běžného součtu nezahrnují. Pokud formát části nevyžaduje a žádné nejsou zapsané, lze zadat přímo finální skóre. Jakmile se části používají, musí popisovat celý zápas; pevně stanovený počet základních částí se musí dodržet.

Režim `WON_PARTS` vyžaduje části bez remíz. Zápas končí ve chvíli, kdy jeden tým dosáhne `wins_required`; po rozhodující části už nesmí následovat další. Prodloužení ani nájezdy se v tomto režimu nepoužívají.

Prodloužení lze použít jen při nerozhodném stavu po základní době a jen pokud ho formát dovoluje. Další prodloužení může následovat pouze při trvající remíze. Nájezdy smějí tvořit nejvýše jednu závěrečnou část, nesmějí skončit remízou a musejí následovat po nerozhodném skóre. `shootout_winner_home` výslovně určuje vítěze nájezdů i tehdy, když se kvůli nulovému bonusu finální skóre nezmění. Pokud je bonus nenulový, přičte se pouze vítězi.

Jsou-li uložené části, konečné skóre vypočítá backend v téže transakci; klient neposílá nezávislý součet. Změna části přepočítá výsledek, nebo se odmítne, pokud by dokončený zápas přestal být platný. Rozpracované části bez finálního výsledku jsou povolené.

### Bodování a pořadí

`competition_point_rules` přiřazuje body podle výsledku (`WIN`, `DRAW`, `LOSS`), způsobu ukončení a případně rozsahu vlastního a soupeřova konečného skóre. Chybějící hranice znamená neomezený rozsah. Pravidla pro stejný výsledek a ukončení se nesmějí překrývat. Při dokončení zápasu musí pro každou stranu existovat právě jedno platné bodovací pravidlo; jinak se zápis odmítne. U formátu bez remíz nelze použít pravidlo `DRAW`.

`competition_ranking_criteria` stanoví pořadí metrik a směr jejich řazení. K dispozici jsou `POINTS`, `WINS`, `SCORE_DIFFERENCE`, `SCORE_FOR`, `SCORE_RATIO`, `PART_SCORE_DIFFERENCE` a `PART_SCORE_RATIO`. První skupina pracuje s finálním skóre, metriky `PART_SCORE` se součtem započítávaných částí. Tyto metriky lze použít jen tehdy, pokud formát části povinně eviduje.

Poměry se při řazení nezaokrouhlují. Kladná hodnota dělená nulou se považuje za nekonečno, `0/0` za nulu. Při shodě všech kritérií mají týmy stejné pořadí; identifikátor slouží pouze ke stabilnímu zobrazení. V tabulce jsou i přihlášené týmy bez odehraného zápasu, s nulovými součty.

Příklady konfigurace:

| Sport     | Formát                                                         | Bodování a pořadí                                                          |
| --------- | -------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Fotbal    | `SUM_SCORE`, možnost remízy, případně dva poločasy.            | Výhra/remíza/prohra 3/1/0; body, rozdíl skóre, vstřelené góly.             |
| Basketbal | `SUM_SCORE`, bez remíz, případně čtyři čtvrtiny a prodloužení. | Výhra/prohra 2/1; body, rozdíl skóre, dosažené skóre.                      |
| Hokej     | `SUM_SCORE`, tři třetiny, prodloužení a nájezdy.               | V základní době 3/0, po prodloužení či nájezdech 2/1.                      |
| Volejbal  | `WON_PARTS`, vítězství po třech vyhraných setech.              | Výhra 3:0 nebo 3:1 za 3 body, 3:2 za 2; prohra 2:3 za 1 bod, ostatní za 0. |

Volejbalové bodování rozlišuje výsledky podle počtu setů soupeře. Výpočet se neřídí názvem sportu, ale uloženým formátem a bodovacími pravidly.

Model neřeší kontumace, bodové tresty, minitabulky vzájemných zápasů, kontrolu přesného skóre potřebného k ukončení setu, časomíru ani hráčské statistiky za jednotlivé části. Tyto funkce zadání nevyžaduje. U výsledku bez rozpisu částí nelze zpětně ověřit stav před prodloužením.

## Statistiky

Definice individuálních statistik spravuje administrátor v `statistic_definitions`. Každá má název, typ (`INTEGER`, `DECIMAL`, `BOOLEAN`, `TEXT`), agregační funkci, případně jednotku a minimální nebo maximální hodnotu. Po prvním použití se nesmí změnit význam definice: kód, typ, jednotka, meze ani agregace. Je možné ji přejmenovat nebo deaktivovat; nová statistika s jiným významem dostane novou definici.

`player_match_statistics` ukládá jednu hodnotu definice pro jednoho hráče v jednom zápase. Použije se právě jeden hodnotový sloupec odpovídající typu definice. Backend kontroluje typ, meze a přesnost hodnot, takže nedochází k tichému zaokrouhlování. Nevyplněná statistika neznamená nulu.

Statistiku lze zapsat jen hráči, který v daném zápase skutečně nastoupil (`played = true`), má docházku `PRESENT` nebo `LATE`, nebyl vyřazen a patří k jedné ze stran zápasu. Zápas musí mít po skončení zapsaný výsledek. Opravy docházky, nastoupení a výsledku musí zachovat platnost již uložených statistik nebo je opravit společně.

Funkce `SUM`, `AVG`, `MIN` a `MAX` agregují numerické hodnoty, `COUNT` počítá záznamy a `COUNT_TRUE` pravdivé booleany; `NONE` se neagreguje. Týmové a sezónní souhrny se odvozují z výsledků, částí a historického týmu účastníka. Počet odehraných zápasů vychází z `played = true` v dokončených zápasech, nikoli z nominace nebo samotné přítomnosti statistiky.

## Členské příspěvky

`fee_assessments` obsahuje osobu, sezónu, částku, měnu a jednu splatnost. Administrátor eviduje skutečně přijaté úhrady v `fee_payments`. Více úhrad jednoho předpisu je možné; samostatný splátkový kalendář se nevede.

Stav příspěvku se vypočítá ze součtu nezrušených úhrad:

- `0` – nezaplaceno;
- více než `0`, ale méně než předepsaná částka – částečně zaplaceno;
- součet rovný částce – zaplaceno.

Přeplacení se odmítne. Částku předpisu nelze snížit pod součet platných úhrad. Po první úhradě se nemění osoba, sezóna ani měna, ani když je platba později stornovaná.

Chybný zápis platby se opravuje stornováním s uvedením autora, času a důvodu a případným zadáním nové platby. Storno evidenčního záznamu není vrácení peněz. Opakovaný požadavek se stejným UUID a obsahem se může bezpečně zopakovat, odlišný obsah je konflikt. Zrušený předpis nesmí mít aktivní úhrady, ale historie zůstává.

Úloha pro notifikace hlídá nedoplatky a splatnosti. Upozorňuje člena, případně zástupce dítěte bez účtu, a administrátory. Plně zaplacený nebo zrušený příspěvek už další výzvu nevytváří. Platby za staré sezóny lze doplňovat i po archivaci. Součty různých měn se nesčítají; databáze kontroluje formát třípísmenného kódu měny, podporované měny aplikace.

Platební brána, bankovní integrace, vratky, slevy, odměny a kredit nejsou součástí návrhu.

## Komunikace a notifikace

Konverzace v `conversations` patří konkrétnímu sezónnímu týmu a má alespoň dva oprávněné účastníky včetně zakladatele. Při čtení i odesílání zprávy musí mít uživatel aktivní záznam v `conversation_participants` a platný vztah k týmu. U starší sezóny se kontroluje také příslušný historický vztah. Administrátor nemá automatický přístup do všech konverzací; musí být jejich účastníkem.

Účastník přidaný později vidí zprávy až od `joined_at`. Odchod nebo ztráta posledního oprávnění nastaví `left_at`; záznam se nemaže kvůli autorství starších zpráv. Jednou ukončená účast se znovu neotevírá. Po obnovení oprávnění se pro další komunikaci založí nová konverzace. Zánik jedné vazby přístup neukončí, pokud existuje jiná platná vazba ke stejnému týmu.

`notifications` ukládá společný obsah oznámení, zatímco `notification_deliveries` eviduje doručení a přečtení pro jednotlivé adresáty. Oznámení a doručení se zapisují ve stejné transakci jako související změna. Jedinečný deduplikační klíč brání opakovanému vytvoření stejného oznámení a při shodném klíči musí souhlasit i obsah. U platebních výzev klíč rozlišuje předpis, splatnost a druh výzvy.

Oznámení neobsahují soukromé zprávy, omluvenky ani citlivé informace o dítěti. Při otevření cíle aplikace znovu zkontroluje oprávnění; stará notifikace sama přístup neuděluje. Externí doručování není součástí návrhu.

## Integrita a souběžné operace

Omezení jsou rozdělena mezi databázi a transakční služby:

| Vrstva                                     | Co kontroluje                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (`PK`, `FK`, `UNIQUE`, `CHECK`) | Existenci vazeb, jedinečnost, platnost lokálních hodnot, úplnost skupin sloupců a základní omezení částek či skóre.                            |
| PostgreSQL (`EXCLUDE`)                     | Nepřekrývání intervalů členství stejné dvojice hráč/tým a trenér/tým. Omezení je třeba doplnit do SQL migrace.                                 |
| Backend                                    | Shodu sezón, členství účastníka, termíny zápisů, sportovní pravidla, finanční součty, návaznost historie a ostatní podmínky přes více tabulek. |
| Autorizace                                 | Aktuální role a vztahy, oprávnění pro konkrétní operaci, povolená pole a přístup k soukromým údajům.                                           |

Pro souběh změn se používá společný zámek řádku `club.id = 1`. Transakce čtoucí klubová data získá `FOR SHARE`, každá doménová změna a plánovaná úloha `FOR UPDATE`. Po získání zámku služba znovu načte aktuální oprávnění a závislá data v režimu `READ COMMITTED`, zkontroluje výsledný stav a zapíše změnu, audit a případná oznámení. Zámek drží až do potvrzení transakce; během transakce se nečeká na uživatele ani na síťové služby.

Tímto postupem se pro jeden klub postupně provedou všechny zápisy. Je to jednoduché řešení pro očekávaný malý provoz, nikoli návrh pro vysokou souběžnost. Chrání například současné úhrady, změnu nominace při odebrání oprávnění nebo úpravu výsledku při změně pravidel. Po potvrzení odebrání oprávnění už další operace musí pracovat s novým stavem. Stejný postup musí dodržet i administrátorské opravy a plánované úlohy; přímé SQL mimo aplikaci tyto mezitabulkové kontroly nezajistí.

Sloupce `version` chrání uživatele před přepsáním dat zastaralým formulářem. Změna části zápasu zvyšuje verzi zápasu, změna bodování nebo řazení verzi soutěžního ročníku. Verzování nenahrazuje databázový zámek.

Archivace uchovává soupisky, výsledky a statistiky. Oprava archivovaných sportovních údajů vyžaduje administrátora, důvod a společnou kontrolu navázaných dat; použitá pravidla ani definice statistik se tím neodemknou.

## Pokrytí zadání

| Požadavek                                          | Model                                                                                      |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Hráči, trenéři, rodiče, administrátor              | `persons`, `users`, `player_profiles`, `guardian_links`, `coach_team_memberships`          |
| Týmy a soupisky                                    | `teams`, `team_seasons`, `player_team_memberships`, `seasons`                              |
| Tréninky, zápasy, další akce                       | `events`, `event_teams`, `event_participants`, `matches`                                   |
| Dostupnost, nominace a docházka                    | Samostatné skupiny polí v `event_participants`                                             |
| Členské příspěvky a částečné úhrady                | `fee_assessments`, `fee_payments`                                                          |
| Notifikace                                         | `notifications`, `notification_deliveries`                                                 |
| Interní komunikace                                 | `conversations`, `conversation_participants`, `messages`                                   |
| Soutěže a sezóny                                   | `competitions`, `competition_seasons`, `competition_entries`, `seasons`                    |
| Výsledky a tabulky                                 | `matches`, `match_periods`, `match_formats`, bodovací a řadicí pravidla                    |
| Individuální statistiky spravované administrátorem | `statistic_definitions`, `player_match_statistics`                                         |
| Týmové statistiky a historie                       | Agregace výsledků a statistik podle historických týmů a sezón                              |
| Minimálně dva sporty bez změny kódu                | Konfigurovatelné formáty a bodování; například fotbal a basketbal v oddělených instalacích |

Jde o pokrytí na úrovni datového návrhu, nikoli o seznam hotových funkcí. Zápisy, výpočty tabulek, uživatelské rozhraní a notifikace je teprve potřeba implementovat a otestovat.

## Audit a provozní logy

`audit_log` zachycuje změny rolí a vztahů, příspěvků, úhrad a historické opravy. Obsahuje autora, čas, typ změny, identifikaci dotčeného záznamu a případný důvod. Zápis auditu probíhá ve stejné transakci jako změna. Audit neukládá hesla, obsah soukromých zpráv ani kopie osobních údajů; přístup k němu má administrátor.

Cíl auditu určuje dvojice `entity_type` a `entity_key`. `entity_key` je JSONB objekt se všemi sloupci primárního klíče, například `{"id":"<uuid>"}` u osoby nebo `{"guardian_user_id":"<uuid>","player_id":"<uuid>"}` u rodičovské vazby. Databáze kontroluje, že nejde o prázdný objekt; backend ověřuje odpovídající typy a úplnost klíče. Nejde o univerzální cizí klíč: audit musí zůstat čitelný i po odstranění původního záznamu. Při opravě více objektů vznikne záznam pro každý z nich.

Provozní logy slouží k řešení chyb a sledování běhu aplikace. Nenahrazují audit změn. Jejich konkrétní obsah a dobu uchování určí implementace.

## Zálohování a obnova

Pro PostgreSQL je navržen **pgBackRest**. Zálohy se ukládají mimo datový adresář databáze, ideálně na jiný disk.

- Fyzická záloha každých 12 hodin: jednou týdně plná, ostatní diferenciální.
- Průběžná archivace WAL pro obnovu k vybranému okamžiku.
- Uchování tří týdenních plných záloh, souvisejících diferenciálních záloh a potřebných WAL souborů.
- Pravidelná zkušební obnova.

Pro obnovu k určitému okamžiku je potřeba fyzická záloha a souvislá řada WAL; na logický dump nelze WAL přehrát. Lokální zálohy nechrání před ztrátou celého serveru. Vzdálená kopie ani detailní provozní postup nejsou součástí tohoto návrhu.
