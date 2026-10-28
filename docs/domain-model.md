# Doménový model sportovního klubu

Tento dokument popisuje cílovou doménu podle `zadani_sportovni_klub_v2.odt` a upřesnění zadání. **Implementované P1–P3 dodávají členský základ E1:** identitu, setup, sporty, sezóny, týmy, offline hráče, intervalová členství, účty na ověřené osoby, schválené rodiče, omezený CHILD login a scoped soupisky/historii. Události/účast, soutěže, výsledky/statistiky, finance, notifikace a komunikace níže jsou **plánované**. Úplnou akceptaci E1 ani projekt tento dokument neuzavírá. Přesný rozsah a provedené důkazy určují [kontrakt](api-contract.md) a [ověření](verification.md).

## Architektura a hranice

Monorepo obsahuje Spring Boot backend v `backend/`, samostatný Next.js frontend v `frontend/` a PostgreSQL. Zachovává Java 17, balíček `cz.jpmad.springprojecttemplate`, vrstvy `api`, `config`, `model`, `repository`, `service`, constructor injection a record DTO ze zdrojové šablony. API vrstva převádí HTTP/DTO, service drží transakce, oprávnění a doménové invarianty, repository provádí omezené dotazy a model obsahuje perzistentní stav. Business logika i rozhodování o oprávněních zůstávají ve Springu.

Nové doménové balíčky budou postupně členěny na `member`, `team`, `event`, `competition`, `statistics`, `finance`, `communication` a `notification` uvnitř stávajících vrstev. Nezavádí se druhá autentizace, JWT, mikroservisy ani obecný pluginový framework sportů. Sport je databázový záznam; potřebná odlišnost je omezená na ověřenou konfiguraci statistik a soutěží.

## Účty a lidé

`Person` uchovává jméno, datum narození a nezbytné kontakty. P1 dovoluje dokončit a přečíst vlastní osobu; P2 přidává ADMIN vytvoření a editaci osob a hráčů. `User` má po V2 dočasně nullable UNIQUE `person_id`: staré i nově registrované účty bez osoby mají PENDING onboarding, nikoli odvozené osobní údaje z loginu. Osoba může mít nejvýše jeden účet a jeden samostatný `PlayerProfile`. Hráč má datum narození, nepotřebuje účet ani rodiče. Použitou identitu nelze přesunout na jiného člověka.

P3 umožňuje ADMIN vytvořit USER účet na ověřenou evidovanou osobu bez účtu nebo jednorázově připojit takovou osobu k dosud nepropojenému účtu. Person-link zachová UUID, heslo a časy, nepřepisuje již vyplněnou osobu a neslučuje jména. První heslo zpracuje BCrypt, aplikace je nevrací ani nepersistuje ve frontendu; správce je soukromě předá oprávněné osobě, u dítěte ověřenému rodiči. Správa účtů není pozvánkový nebo resetovací mechanismus.

Systémová role je `USER/ADMIN`, typ účtu `STANDARD/CHILD`. V2 zachovala ADMIN a staré COACH/PLAYER/PARENT převedla na USER; neveřejné `legacy_role` nezakládá oprávnění. P3 context má osm správních schopností pro dokončeného STANDARD ADMIN, ownPlayerId přes stejnou osobu, READ_CHILD pro schválené děti a READ_TEAM pro dnešní vlastní/trenérské/dětské vazby. CHILD dostává pouze vlastní hráčské týmy a žádné správní ani rodičovské schopnosti. Veřejná registrace zůstává USER/STANDARD a nepřijímá privilegovanou roli, typ účtu, osobu, tým nebo rodičovskou vazbu jako oprávnění.

`GuardianLink` propojuje osobu rodiče nebo zákonného zástupce s hráčským profilem dítěte. Správce vazbu schvaluje a odvolává s důvodem; samotná shoda příjmení ani znalost ID nestačí. Vztah k sobě samému, rodičovský cyklus a CHILD jako zástupce se odmítají. Pro přístup rodiče se propojí účet STANDARD s osobou schváleného zástupce. Rodič může mít více dětí a dítě více zástupců. Osoba rodiče může být bez účtu, ale sama neposkytuje přístup do aplikace ani nestačí pro aktivaci dítěte. Odvolaná vazba zůstává evidovaná; opětovné schválení stejné dvojice a její změny zachová audit.

V P3 rodič čte Moje děti, základní profil a celou vlastní členskou historii schváleného dítěte. Týmovou soupisku čte jen tehdy, je-li jeho dítě členem právě dnes. Dítě nepotřebuje vlastní login pro rodičovské čtení. Příspěvky, dostupnost a komunikace pro rodiče se dodají až s příslušnými doménami.

Dítě má vlastní účet `CHILD` na své osobě a hráčském profilu, vždy s rolí USER. Nově vzniká zakázaný. Samostatná aktivace ověří nejméně jednoho schváleného rodiče s povoleným STANDARD účtem. P3 umožňuje pouze vlastní osobu ke čtení, vlastní základní hráčský profil a historii a aktuální vlastní týmové soupisky. Dostupnost, nominace, statistiky a komunikace jsou budoucí rozšíření, nikoli současné obrazovky. Dítě nedědí rodičovskou roli, session ani heslo. **Nemá finance včetně vlastních částek, detailů, součtů, exportů a finančních notifikací či jejich počtů.** Allowlist odmítá takové přímé cesty již nyní; funkční finance a schránka přijdou později. CHILD nemůže být ADMIN, trenérem ani zástupcem.

Odebrání jedné z více kvalifikovaných rodičovských vazeb ponechá dítě aktivní. Ztráta poslední nebo zákaz posledního aktivního rodiče nastaví CHILD `enabled=false` a zvýší neveřejný `auth_revision`. Session před změnou zůstane neplatná i po reaktivaci, včetně cookie nepoužité během zákazu. Regrant ani opětovné povolení rodiče dítě automaticky neaktivují; ADMIN znovu ověří podmínky a dítě výslovně aktivuje. Sportovní profil, osoba a členství zůstávají.

Změny role, typu, povolení a person-link jsou odůvodněné správní operace. Posledního povoleného dokončeného STANDARD ADMIN nelze demotovat, zakázat nebo změnit na CHILD. Převod STANDARD na CHILD odmítne ADMIN, zachované trenérské členství i neodvolané rodičovské vazby a vyžaduje vlastního hráče; výsledek zůstává zakázaný. Převod zpět na STANDARD také ponechá účet zakázaný do samostatného povolení. Dítě tato pole samo nemění. Důvod má nejvýše 500 znaků a nesmí obsahovat tajné nebo osobní údaje. Podmínky stanoví [autorizace](authorization.md).

Samostatný trenér již v P2 může být jediným uživatelem: dokončený STANDARD ADMIN si přiřadí trenérství vlastního sezónního týmu a vede offline hráče bez jejich účtů a rodičů. Rodičovská vazba je povinná až pro aktivaci dětského přihlášení. Běžnému trenérovi samotné přiřazení nedává správu rolí/rodičů ani budoucí finance nebo cizí soukromé zprávy.
## Sporty, sezóny a členství

`Sport` obsahuje stabilní kód, název a aktivní stav. P1 umí vytvořit a upravit sport, přičemž jeho kód je neměnný. Při navazující akceptaci se založí databázové konfigurace `FOOTBALL` / fotbal a `BASKETBALL` / basketbal. Přidání sportu a jeho statistik či pravidel nevyžaduje změnu Java/TypeScript kódu. Jedna instalace eviduje oba sporty současně; druhý sport nevyžaduje další aplikaci. Každý tým má právě jeden povinný sport. Soutěže, formáty zápasů a definice statistik odkazují na odpovídající sport. Historicky použitý sport se deaktivuje, nemaže.

`Season` má název, začátek, konec a příznak archivace. `Team` patří jednomu sportu. `TeamSeason` zařazuje tým do sezóny. `PlayerTeamMembership` a `CoachTeamMembership` zachovávají interval členství a případný konec. Přestup vytváří nové členství a ukončuje původní; nesmí přepsat staré záznamy ani statistiky. Členství je platné v intervalu `[valid_from, valid_to)`, neuvedené `valid_to` znamená konec příslušné sezóny, nikoli trvalé oprávnění do dalších sezón. Zobrazení historie respektuje období, v němž měl uživatel odpovídající oprávnění; aktuální přiřazení trenéra nedává právo k historii jiných týmů.

## Události: tři různé informace o účasti — plán P5

`Event` je obecný: `TRAINING`, `MATCH`, `OTHER`. Má název, popis, začátek/konec s časovou zónou, místo, stav, sezónu a jeden či více přiřazených týmů. Zápas rozšiřuje základní událost o soutěž a obě strany utkání. Trénink ani jiná událost nepotřebují sportově specifická pole.

| Evidence | Co znamená | Kdo ji mění | Pravidlo |
| --- | --- | --- | --- |
| `Availability` | Hráč může/nemůže přijít, případně neví | Hráč za sebe, rodič za schválené dítě; odůvodněná oprava administrátorem | Vlastní záznam na událost a hráče; obsahuje autora, stav, komentář a čas změny |
| `Nomination` | Trenér hráče vybral, ponechal náhradníkem nebo vyřadil | Trenér příslušného týmu, admin | Publikovaná nominace vyvolá notifikaci; nedostupného hráče lze nominovat pouze s potvrzeným důvodem |
| `Attendance` | Hráč byl skutečně přítomen, nepřítomen, omluven nebo přišel pozdě | Trenér příslušného týmu, admin | Zapisuje se po začátku události; nominace ani dostupnost ji automaticky nevyplní |

Týmová příslušnost hráče se ověřuje k času události, trenérovo oprávnění také k okamžiku zápisu. Dostupnost má uzávěrku; výjimečnou opravu může provést administrátor s odůvodněním a auditem. Zrušení události zachová historii a informuje adresáty. Posun času se provede verzovaně a umožní znovu potvrdit dostupnost. Změny po archivaci sezóny provádí jen admin s odůvodněním a auditem.

## Soutěže, výsledky a pořadí — plán P4/P6

`Competition` patří sportu, `CompetitionSeason` propojuje soutěž, sezónu a verzi pravidel. `CompetitionEntry` přihlašuje sezónní tým do ročníku stejné sezóny a sportu. Externí soupeř je také `Team`, odlišený od klubového týmu; nemá klubovou soupisku ani účet. `TeamSeason.display_name` uchovává historický název. Obě strany utkání musejí patřit stejnému sportu; soutěžní zápas odkazuje na dva různé účastníky téže soutěže/sezóny.

Výsledek má stavy návrh, potvrzený, anulovaný. Do tabulky a oficiálních agregací vstupují jen aktivní potvrzené revize výsledků. Revize se nemažou: oprava zaznamená novou revizi, autora a důvod, původní zůstane dohledatelná. Součástí výsledku jsou oba skórovací součty, rozhodnutí `REGULAR/FORFEIT_HOME/FORFEIT_AWAY` a samostatná fáze ukončení `REGULATION/OVERTIME/SHOOTOUT` u běžného výsledku a čas potvrzení. Sport, pravidla a validace rozhodují, zda je remíza povolená.

Admin spravuje **data pravidel**, nikoli spustitelný kód. Verze pravidel obsahuje povolené výsledkové varianty, nezáporné body za každou variantu, možnost remízy, způsob kontumace a seřazený seznam kritérií. Povolená kritéria jsou body, celkový rozdíl skóre, skóre vstřelené, počet výher, poměry skóre a obdobná kritéria vzájemných zápasů (minitabulky); úplnou shodu může uzavřít odůvodněné administrátorské rozhodnutí. Číselník fáze zápasu (základní doba/prodloužení/nájezdy) je oddělený od rozhodnutí o kontumaci domácích nebo hostů. Pravidla kontumace ukládají obě skóre a body pro obě strany; běžná a kontumační prohra se stejným skóre proto nejsou totožný výsledek. Nevyhodnocují se JavaScript/SQL ani libovolné výrazy z formuláře.

| Demonstrační konfigurace | Bodování | Kritéria shody v určeném pořadí |
| --- | --- | --- |
| Fotbal | Výhra 3, remíza 1, prohra 0; kontumace má explicitní vítěze a skóre | Body → celkový rozdíl skóre → vstřelené góly → počet výher → administrátorské rozhodnutí |
| Basketbal | Výhra 2, prohra 1, kontumační prohra 0; remíza se při potvrzení odmítá | Body → body vzájemných zápasů → rozdíl skóre vzájemných zápasů → celkový rozdíl skóre → vstřelené body → administrátorské rozhodnutí |

Jde o demonstrační pravidla projektu, nikoli tvrzení o pravidlech všech sportovních svazů. Admin může uložit odlišné platné bodování a pořadí kritérií pro konkrétní soutěž v UI.

Výpočet tabulky:

1. Načti potvrzené výsledky zvolené soutěže/sezóny a explicitní verzi pravidel ve stejné konzistentní databázové revizi.
2. U každého účastníka spočti odehrané zápasy, výhry/remízy/prohry, skóre pro/proti a soutěžní body. Účastník bez zápasu se zobrazuje s nulami.
3. Použij seznam kritérií postupně uvnitř aktuální skupiny shodných týmů. Minitabulka používá pouze vzájemné potvrzené zápasy členů této skupiny.
4. Jestliže minitabulka skupinu rozdělí a konfigurace `restart_head_to_head_on_subgroup` je zapnutá, pro menší zbylou skupinu začni znovu první vzájemné kritérium. Opakování skončí zmenšením skupiny; když nerozdělí žádný tým, pokračuj dalším kritériem. Podmínka chybějících vzájemných zápasů je v pravidlech `REQUIRE_COMPLETE` (celý vzájemný blok se přeskočí) nebo `PLAYED_ONLY`.
5. Zcela shodná skupina má společné pořadí do administrátorského rozhodnutí. UUID slouží jen pro stabilní pořadí vykreslení, není sportovním kritériem. Ruční rozhodnutí obsahuje důvod a audit.

Tabulka není ručně editovaný počet bodů. Případná cache je pouze odvozená a označená verzí výsledků a pravidel; není samostatným zdrojem pravdy. Oprava/anulování výsledku zneplatní cache, přepočítá tabulku i statistiky. Použitý formát a pravidla ročníku jsou po prvním použití neměnné. Jiná pravidla vyžadují nový formát nebo ročník, původní výpočet zůstane reprodukovatelný z uložených pravidel a revizí. Archivovaná sezóna je běžně pouze pro čtení.

## Administrátorsky definované statistiky — plán P6

`StatisticDefinition` je stabilní identita statistiky. `StatisticDefinitionVersion` uchovává název, datový typ, jednotku, meze hodnot, způsob agregace, čas vytvoření a autora. Sport patří stabilní identitě definice. Admin definuje například fotbalové góly/asistence nebo basketbalové body/doskoky v UI; frontend renderuje formulář podle definice. Žádná z těchto statistik není pevný sloupec `PlayerProfile`.

| Typ hodnoty | Validace | Povolené agregace |
| --- | --- | --- |
| `INTEGER` | Celé číslo, min/max, volitelně nezáporné | `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `NONE` |
| `DECIMAL` | Konečné desetinné číslo reprezentovatelné v numeric(20,6), min/max, nejvýše 6 desetinných míst bez tichého zaokrouhlení | `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `NONE` |
| `BOOLEAN` | Jen true/false | `COUNT_TRUE`, `COUNT`, `NONE` |
| `TEXT` | Nejvýše 1 000 znaků, bez HTML | `COUNT`, `NONE` |

UI i server validují; rozhodující je server. Chybějící hodnota není nula. `AVG` pracuje jen se zadanými platnými hodnotami; prázdná množina vrátí null a počet vzorků 0. `SUM` prázdné množiny je 0 spolu s počtem vzorků 0. `COUNT` počítá zadané záznamy, `COUNT_TRUE` pravdivé hodnoty. `NONE` vrací chronologickou historii bez aritmetiky. Zaokrouhlení pro zobrazení je oddělené od ukládání přesné decimal hodnoty. Agregace se filtrují sportem, sezónou, týmem a hráčem; týmové skóre a odehrané zápasy jsou odvozené z výsledků/docházky, nikoli ručně přepisované součty.

Statistika zápasu patří hráči, konkrétní verzi definice a revizi výsledku. Hráč musí být skutečně účastníkem daného zápasu; zápis před uzavřením docházky je návrh. Potvrzením výsledku se potvrzují kompatibilní statistiky. Změna výsledku musí nové statistiky explicitně převzít či opravit. Neslučitelné typy, jednotky nebo agregace vyžadují novou definici; původní definice se deaktivuje. Přejmenování vytváří novou verzi, ale zachová identitu. Historické hodnoty se nepřeinterpretují podle současné konfigurace; kombinování verzí je povolené jen při shodném typu, jednotce a agregaci.

## Členské příspěvky — plán P7

`FeeAssessment` předepisuje příspěvek konkrétní osobě a sezóně, včetně částky, měny a splatnosti. Není závislý na existenci přihlašovacího účtu. `FeePayment` je administrátorem ručně zaznamenaná skutečná úhrada jednoho předpisu. Více záznamů umožní částečné úhrady; platební brána není součástí projektu.

Stav se odvozuje ze součtu nestornovaných úhrad: nesplaceno, částečně zaplaceno, zaplaceno. Prodlení závisí také na splatnosti a kladném zůstatku. Přeplacení nebo snížení částky pod zaplacený součet se odmítne. Oprava platbu nemaže: zaznamená storno s autorem, časem a důvodem a případně novou správnou úhradu. Všechny změny probíhají pod zámkem a s idempotencí; souběh nesmí předpis přečerpat. Kredit a rozdělování jedné platby na více předpisů nejsou součástí tohoto modelu.

Standardní účet člena čte vlastní příspěvky; rodič se schválenou vazbou čte příspěvky dítěte. Dětský účet je nečte. Pouhé trenérské přiřazení neumožňuje přístup k financím hráčů. Samostatný trenér se správou instalace eviduje příspěvky jako administrátor.

## Notifikace a vnitrosystémová komunikace — plán P5/P7/P8

Notifikace jsou automatické systémové zprávy: nová událost, změna/zrušení, zveřejnění/změna nominace a blížící se/překročená splatnost. Příspěvky oznamují příslušnému standardnímu účtu člena a oprávněným zástupcům **i administrátorům**. Dětský účet finanční doručení nikdy nedostává; za dítě je přijímá ověřený rodič se standardním účtem. Pokud oprávněný člen ani jeho zástupce nemá účet, admin vidí nedoručitelnou výzvu; systém nesmí označit upozornění členovi za doručené. V režimu jediného trenéra je evidence bez účtů platná, vznik dětského přihlášení ale vyžaduje rodiče. V počátečním návrhu jde o schránku v aplikaci; email lze doplnit později a není náhradou povinné schránky.

Změna domény, neměnné `Notification` a jednotlivá `NotificationDelivery` vznikají v jedné DB transakci pro explicitní oprávněné adresáty; opakování je idempotentní a uživatel může označit notifikaci jako přečtenou. Před vytvořením i načtením doručení se kontroluje platná vazba na tým/dítě. Denní úloha vyhodnotí neuhrazené předpisy a konfiguraci předstihu; stejné upozornění stejného období se neopakuje při každém běhu. Pozdní doběh po odstávce dopočítá dosud neodeslaná upozornění. Úhrada zastaví budoucí výzvy; oprava splatnosti vytvoří jiný deduplikační klíč pro nový termín.

Komunikace je **samostatná funkce**: `Conversation`, `ConversationParticipant`, `Message`. Trenéři, hráči a zástupci mohou v rámci povoleného týmového kontextu vést přímou či týmovou konverzaci. Přidání účastníka vyžaduje příslušnost k týmu nebo platnou vazbu na dítě v týmu. Jen účastník čte zprávy; admin nemá automatický přístup do soukromé konverzace. Zprávy mají autora, čas a text; v základní verzi jsou neměnné, případné skrytí má audit metadat bez kopírování obsahu do obecného admin auditu. Nejsou vytvářeny místo nominací nebo finančních záznamů. Zánik oprávnění zabrání novému přístupu, ale historii nesmaže. Rozhraní přehledně oddělí konverzace od automatických notifikací.

## Historie a změny

Sezóny, členství, výsledkové revize, verze statistik, předpisy a úhrady se fyzicky nemažou prostřednictvím běžných operací. Každý citlivý zápis zaznamená aktéra, čas, typ změny a důvod. Časové údaje používají UTC `timestamptz`; uživatelské zobrazení respektuje časovou zónu klubu. Archivace zastaví běžné zápisy, zachová přehledy a umožní řízené admin opravy s novou revizí a přepočtem. Žádná auditní tabulka neukládá hesla, session tokeny nebo CSRF tokeny.

Konkrétní tabulky, indexy a hranice DB/server validace popisuje [databázový návrh](database-design.md); přístupová pravidla a negativní scénáře [autorizace](authorization.md).
