# Databáze sportovního klubu

Návrh pro PostgreSQL 16 obsahuje 31 tabulek. Jedna instalace spravuje jeden klub a jeden týmový sport. Schéma je v [DBML](sport-club.dbml), funkční rozsah v [zadání v2](../zadani_sportovni_klub_v2.md).

Sport klubu, formáty zápasů, bodování, kritéria pořadí a definice statistik nastavuje administrátor výhradně v administračním rozhraní. Nastavení nesmí vyžadovat změnu kódu, ruční SQL, úpravu schématu ani sportovní seed skript. Jde o ukládání konfigurace do existujících tabulek přes backend. Použitá pravidla zůstávají chráněná kvůli historii; nová pravidla administrátor vytvoří jako nový formát, ročník nebo definici.

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
| `team_seasons`                 | Tým v konkrétní sezóně s tehdejším názvem.                   |
| `player_team_memberships`      | Časově platná členství hráčů v týmech.                       |
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

`persons` obsahuje osobní údaje. Jedna osoba může mít nejvýše jeden účet (`users`) a jeden hráčský profil (`player_profiles`), propojené jedinečným `person_id`. Hráč, například dítě, nemusí mít účet. Musí však mít datum narození. Použitý účet ani profil nelze přiřadit jiné osobě.

Aplikace rozlišuje čtyři klubové role ze zadání: **administrátor, trenér, hráč a rodič nebo zákonný zástupce**. V databázi jsou vyjádřené takto:

- **Administrátor** má v `users.role` hodnotu `ADMIN`.
- **Trenér** má platné přiřazení v `coach_team_memberships`.
- **Hráč** má vlastní hráčský profil a odpovídající členství v týmu.
- **Rodič nebo zástupce** má schválenou vazbu v `guardian_links`.

Sloupec `users.role` rozlišuje systémové role `USER` a `ADMIN`. Trenérská, hráčská a rodičovská oprávnění se vyhodnocují z uvedených vazeb pro konkrétní tým nebo dítě. Administrátor role a vazby spravuje v administračním rozhraní.

Vztahy se mohou kombinovat: trenér může být také rodičem nebo administrátorem. K financím dítěte potřebuje rodičovskou vazbu; trenérské přiřazení nestačí. Uživatel bez klubových vztahů nevidí týmové údaje, ale může číst vlastní příspěvky.

Rodičovské vazby schvaluje administrátor a lze je odvolat. Odvolání ukončí oprávnění k dítěti, pokud neexistuje jiný platný důvod přístupu.

Skeleton používá role `USER`, `ADMIN`, `COACH`, `PLAYER` a `PARENT`. Přechod na oprávnění z vazeb vyžaduje novou migraci. Podmínky přístupu podle aktuální role, vztahů a stavu záznamu popisuje [autorizace](authorization.md).

## Týmy a sezóny

`club` má jediný řádek s `id = 1`. Sport je pro danou instalaci pevně zvolený; další sport vyžaduje samostatnou instalaci. Sport pojmenovává `club.sport_name`; výpočty používají formát zápasu a pravidla ročníku. Klubové a externí týmy jsou v `teams`. `team_seasons.display_name` uchovává název týmu v dané sezóně, takže pozdější přejmenování týmu nepřepíše staré výsledky. Dvojice `(team_id, season_id)` je jedinečná. Zařazení do sezóny a intervaly členství určují, které týmy a hráči do ní patří; samostatný příznak `active` u týmu a hráče se nevede.

Hráčská i trenérská členství mají interval `[valid_from, valid_to)`. Neuvedené `valid_to` znamená konec sezóny. Překrývající se intervaly stejné dvojice hráč/tým nebo trenér/tým zakáže omezení `EXCLUDE` v PostgreSQL (`btree_gist`). Členství různých týmů téhož hráče se překrývat mohou.

Sezóna používá interval `[starts_on, ends_on)` v časové zóně `Europe/Prague`. Jakmile je použita v sezónním týmu, soutěžním ročníku, akci nebo příspěvku, její hranice se už nemění. Změny členství a dalších historických vztahů nesmějí zpětně zneplatnit uskutečněné akce nebo statistiky.

## Akce a účast hráčů

`events` obsahuje společné údaje pro trénink, zápas i jinou akci. Sezónní týmy akce jsou v `event_teams`. Tabulka `event_participants` má primární klíč `(event_id, player_id)`, takže hráč je na jedné akci veden nejvýše za jeden tým. Tým účastníka musí být přiřazený k akci.

Dostupnost, nominace, docházka a nastoupení mají v `event_participants` vlastní stav, autora a čas změny. `CHECK` vyžaduje všechny tři hodnoty společně, nebo žádnou. `NULL` znamená nezapsaný údaj; `UNKNOWN`, `NOT_SELECTED` a `played = false` jsou výslovné odpovědi.

Pravidla zápisu:

- Hráč nebo jeho aktuální zástupce může potvrdit dostupnost nejpozději do uzávěrky nebo začátku akce. Odpovědi přijímá pouze publikovaná akce.
- Nominaci zapisuje trenér nebo administrátor. Hráči a rodiče ji vidí až po `nomination_published_at`.
- Docházku a nastoupení zapisuje trenér nebo administrátor po začátku publikované akce. Opravy dokončené akce vyžadují odpovídající oprávnění.
- `played` se používá jen u zápasů. Hodnota `true` vyžaduje docházku `PRESENT` nebo `LATE` a tým účastníka musí být jednou ze stran zápasu.
- Zrušené akce nepřijímají běžné sportovní zápisy. Koncepty nevidí hráči ani rodiče.

Požadavek smí měnit jen povolenou skupinu polí. Autora a čas doplní server; `version` chrání řádek před přepsáním zastaralým formulářem. Zveřejnění nominace a její pozdější změny vytvoří oznámení.

### Soupisky, přestupy a změny termínů

Při založení nebo zveřejnění akce se účastníci vytvoří ze soupisky platné k jejímu začátku. Pozdější příchod hráče do týmu je automaticky nepřidá. Hráči s více členstvími se pro akci vybere jeden tým.

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

První část nebo úplný výsledek nastaví `match_formats.locked_at` a u soutěžního zápasu také `competition_seasons.locked_at`. Formát, bodování a kritéria pořadí pak nelze změnit ani po opravě či odstranění výsledku. Jiná pravidla vyžadují nový formát nebo ročník. Přejmenování je povolené, výpočty nemění.

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

Výpočty používají uložený formát a bodovací pravidla. Název sportu na ně nemá vliv.

Mimo návrh zůstávají kontumace, bodové tresty, minitabulky vzájemných zápasů, kontrola skóre pro ukončení setu, časomíra a hráčské statistiky po částech. U výsledku bez rozpisu částí nelze ověřit stav před prodloužením.

## Statistiky

Definice individuálních statistik spravuje administrátor v `statistic_definitions`. Každá má název, typ (`INTEGER`, `DECIMAL`, `BOOLEAN`, `TEXT`), agregační funkci, případně jednotku a minimální nebo maximální hodnotu. Po prvním použití se nesmí změnit význam definice: typ, jednotka, meze ani agregace. Definici identifikuje její `id`; další kód nepotřebuje. Je možné ji přejmenovat nebo deaktivovat; nová statistika s jiným významem dostane novou definici.

`player_match_statistics` ukládá jednu hodnotu statistiky pro hráče a zápas, v jediném sloupci odpovídajícím typu definice. Backend ověřuje typ, meze a přesnost; hodnoty nesmí tiše zaokrouhlit. Nevyplněná statistika neznamená nulu.

Statistiku lze zapsat jen hráči, který v daném zápase skutečně nastoupil (`played = true`), má docházku `PRESENT` nebo `LATE`, nebyl vyřazen a patří k jedné ze stran zápasu. Zápas musí mít po skončení zapsaný výsledek. Opravy docházky, nastoupení a výsledku musí zachovat platnost již uložených statistik nebo je opravit společně.

Funkce `SUM`, `AVG`, `MIN` a `MAX` agregují numerické hodnoty, `COUNT` počítá záznamy a `COUNT_TRUE` pravdivé booleany; `NONE` se neagreguje. Týmové a sezónní souhrny se odvozují z výsledků, částí a historického týmu účastníka. Počet odehraných zápasů vychází z `played = true` v dokončených zápasech, nikoli z nominace nebo samotné přítomnosti statistiky.

## Členské příspěvky

`fee_assessments` obsahuje osobu, sezónu, částku, měnu a jednu splatnost. Administrátor eviduje skutečně přijaté úhrady v `fee_payments`. Více úhrad jednoho předpisu je možné; samostatný splátkový kalendář se nevede.

Stav příspěvku se vypočítá ze součtu nezrušených úhrad:

- `0` – nezaplaceno;
- více než `0`, ale méně než předepsaná částka – částečně zaplaceno;
- součet rovný částce – zaplaceno.

Přeplacení se odmítne. Částku předpisu nelze snížit pod součet platných úhrad. Po první úhradě se nemění osoba, sezóna ani měna, ani když je platba později stornovaná.

Chybná platba se stornuje s autorem, časem a důvodem; případně se zapíše nová. Storno nevrací peníze. Opakovaný požadavek se stejným UUID a obsahem nic nezmění, jiný obsah je konflikt. Zrušený předpis nesmí mít aktivní úhrady; historie zůstává.

Úloha pro notifikace hlídá nedoplatky a splatnosti. Upozorňuje člena, případně zástupce dítěte bez účtu, a administrátory. Plně zaplacený nebo zrušený příspěvek už další výzvu nevytváří. Platby za staré sezóny lze doplňovat i po archivaci. Součty různých měn se nesčítají; databáze kontroluje formát třípísmenného kódu měny, podporované měny aplikace.

Platební brána, bankovní integrace, vratky, slevy, odměny a kredit nejsou součástí návrhu.

## Komunikace a notifikace

Konverzace v `conversations` patří konkrétnímu sezónnímu týmu a má alespoň dva oprávněné účastníky včetně zakladatele. Při čtení i odesílání zprávy musí mít uživatel aktivní záznam v `conversation_participants` a platný vztah k týmu. U starší sezóny se kontroluje také příslušný historický vztah. Administrátor nemá automatický přístup do všech konverzací; musí být jejich účastníkem.

Účastník přidaný později vidí zprávy až od `joined_at`. Odchod nebo ztráta posledního oprávnění nastaví `left_at`; záznam se nemaže kvůli autorství starších zpráv. Jednou ukončená účast se znovu neotevírá. Po obnovení oprávnění se pro další komunikaci založí nová konverzace. Zánik jedné vazby přístup neukončí, pokud existuje jiná platná vazba ke stejnému týmu.

`notifications` ukládá společný obsah oznámení, zatímco `notification_deliveries` eviduje doručení a přečtení pro jednotlivé adresáty. Oznámení a doručení se zapisují ve stejné transakci jako související změna. Jedinečný deduplikační klíč brání opakovanému vytvoření stejného oznámení a při shodném klíči musí souhlasit i obsah. U platebních výzev klíč rozlišuje předpis, splatnost a druh výzvy.

Oznámení neobsahují soukromé zprávy, omluvenky ani citlivé informace o dítěti. Při otevření cíle aplikace znovu zkontroluje oprávnění; stará notifikace sama přístup neuděluje. Externí doručování není součástí návrhu.

## Integrita a souběžné operace

Kontroly při zápisu:

| Vrstva                                     | Co kontroluje                                                                                                                                  |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| PostgreSQL (`PK`, `FK`, `UNIQUE`, `CHECK`) | Existenci vazeb, jedinečnost, platnost lokálních hodnot, úplnost skupin sloupců a základní omezení částek či skóre.                            |
| PostgreSQL (`EXCLUDE`)                     | Nepřekrývání intervalů členství stejné dvojice hráč/tým a trenér/tým. Omezení je třeba doplnit do SQL migrace.                                 |
| Backend                                    | Shodu sezón, členství účastníka, termíny zápisů, sportovní pravidla, finanční součty, návaznost historie a ostatní podmínky přes více tabulek. |
| Autorizace                                 | Aktuální role a vztahy, oprávnění pro konkrétní operaci, povolená pole a přístup k soukromým údajům.                                           |

Pro souběh změn se používá společný zámek řádku `club.id = 1`. Transakce čtoucí klubová data získá `FOR SHARE`, každá doménová změna a plánovaná úloha `FOR UPDATE`. Po získání zámku služba znovu načte aktuální oprávnění a závislá data v režimu `READ COMMITTED`, zkontroluje výsledný stav a zapíše změnu, audit a případná oznámení. Zámek drží až do potvrzení transakce; během transakce se nečeká na uživatele ani na síťové služby.

Zámek řadí všechny zápisy za sebe, což omezuje propustnost. Pro malý klub tím chrání souběžné úhrady, odvolání oprávnění i změny výsledků a pravidel. Po potvrzení odvolání pracují další operace s novým stavem. Postup platí také pro administrátorské opravy a plánované úlohy. Přímé SQL mimo aplikaci mezitabulkové kontroly nezajistí.

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

Stav implementace a akceptační podmínky sledují [požadavky](requirements.md).

## Audit a provozní logy

`audit_log` zachycuje změny rolí a vztahů, příspěvků, úhrad a historické opravy. Obsahuje autora, čas, typ změny, identifikaci dotčeného záznamu a případný důvod. Zápis auditu probíhá ve stejné transakci jako změna. Audit neukládá hesla, obsah soukromých zpráv ani kopie osobních údajů; přístup k němu má administrátor.

Cíl určuje název tabulky v `entity_type` a JSONB objekt se všemi sloupci primárního klíče v `entity_key`. Například `{"id":"<uuid>"}` u osoby nebo `{"guardian_user_id":"<uuid>","player_id":"<uuid>"}` u rodičovské vazby. Databáze odmítne prázdný objekt; backend ověří typy a úplnost klíče. Cizí klíč se nepoužívá, aby audit zůstal i po odstranění cíle. Oprava více objektů vytvoří záznam pro každý z nich.

Provozní logy slouží k řešení chyb a sledování běhu aplikace. Nenahrazují audit změn. Jejich konkrétní obsah a dobu uchování určí implementace.

## Zálohování a obnova

Pro PostgreSQL je navržen **pgBackRest**. Zálohy se ukládají mimo datový adresář databáze, ideálně na jiný disk.

- Fyzická záloha každých 12 hodin: jednou týdně plná, ostatní diferenciální.
- Průběžná archivace WAL pro obnovu k vybranému okamžiku.
- Uchování tří týdenních plných záloh, souvisejících diferenciálních záloh a potřebných WAL souborů.
- Pravidelná zkušební obnova.

Pro obnovu k určitému okamžiku je potřeba fyzická záloha a souvislá řada WAL; na logický dump nelze WAL přehrát. Lokální zálohy nechrání před ztrátou celého serveru. Vzdálená kopie ani detailní provozní postup nejsou součástí tohoto návrhu.
