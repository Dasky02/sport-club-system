# Doménový model sportovního klubu

Tento dokument je návrhem finální aplikace podle `zadani_sportovni_klub_v2.odt` a upřesnění zadání. V počátečním skeletonu jsou implementovány účty, autentizace a technické informační rozhraní. Níže uvedené klubové entity, operace, výpočty a obrazovky jsou **plánované**, dokud je příslušná etapa v [roadmapě](roadmap.md) nedokončí a neověří. Jejich přítomnost v dokumentaci neznamená existující API ani migraci.

## Architektura a hranice

Monorepo obsahuje Spring Boot backend v `backend/`, samostatný Next.js frontend v `frontend/` a PostgreSQL. Zachovává Java 17, balíček `cz.jpmad.springprojecttemplate`, vrstvy `api`, `config`, `model`, `repository`, `service`, constructor injection a record DTO ze zdrojové šablony. API vrstva převádí HTTP/DTO, service drží transakce, oprávnění a doménové invarianty, repository provádí omezené dotazy a model obsahuje perzistentní stav. Business logika i rozhodování o oprávněních zůstávají ve Springu.

Nové doménové balíčky budou postupně členěny na `member`, `team`, `event`, `competition`, `statistics`, `finance`, `communication` a `notification` uvnitř stávajících vrstev. Nezavádí se druhá autentizace, JWT, mikroservisy ani obecný pluginový framework sportů. Sport je databázový záznam; potřebná odlišnost je omezená na ověřenou konfiguraci statistik a soutěží.

## Účty a lidé

`User` je přihlašovací účet s UUID, jedinečným username, BCrypt hashem a právě jednou rolí `ADMIN`, `USER`, `COACH`, `PLAYER` nebo `PARENT`. Veřejná registrace vždy vytváří `USER`. Roli ani oprávnění nelze získat parametrem registrace. `USER` dovoluje pouze správu vlastního přihlášení; administrátor v další etapě přiřadí klubovou roli a příslušné vazby. `ADMIN` má klubový rozsah, ostatní klubové role mají navíc omezení týmem, vlastním profilem nebo dítětem.

`PlayerProfile` je sportovec, i když nemá přihlašovací účet (například nezletilý). Obsahuje jméno, datum narození, kontaktní údaje v nezbytném rozsahu a volitelnou jedinečnou vazbu na účet. Smazání účtu nesmí smazat hráčovy výsledky. Trenér má vlastní profil s volitelným účtem a historickým přiřazením k týmům. Základní údaje profilu nesmějí být nahrazovány loginem.

`GuardianLink` explicitně propojí účet rodiče nebo zákonného zástupce s profilem hráče; obsahuje druh vztahu, platnost, ověření a údaj o administrátorovi, který vazbu schválil. Rodič může mít více dětí a hráč více zástupců. Samotná shoda příjmení, znalost ID dítěte ani role `PARENT` přístup nezakládá. Po skončení vazby se nové požadavky odmítnou. Zástupce může vidět dítě, jeho události, dostupnost, nominace, docházku a příspěvky; nemůže měnit výsledky ani nominovat.

## Sporty, sezóny a členství

`Sport` obsahuje stabilní kód, název a aktivní stav. Pro akceptaci existují databázové konfigurace `FOOTBALL` / fotbal a `BASKETBALL` / basketbal. Přidání sportu a jeho statistik či pravidel nevyžaduje změnu Java/TypeScript kódu. Historicky použitý sport se deaktivuje, nemaže.

`Season` má název, začátek, konec a stav `OPEN`/`ARCHIVED`. `Team` patří jednomu sportu. `TeamSeason` zařazuje tým do sezóny. `PlayerTeamMembership` a `CoachTeamMembership` zachovávají interval členství, roli/zařazení a případný konec. Přestup vytváří nové členství a ukončuje původní; nesmí přepsat staré záznamy ani statistiky. Členství je platné v intervalu `[valid_from, valid_to)`, konec může být neomezený. Zobrazení historie respektuje období, v němž měl uživatel odpovídající oprávnění; aktuální přiřazení trenéra nedává právo k historii jiných týmů.

## Události: tři různé informace o účasti

`Event` je obecný: `TRAINING`, `MATCH`, `OTHER`. Má název, popis, začátek/konec s časovou zónou, místo, stav, sezónu a jeden či více přiřazených týmů. Zápas rozšiřuje základní událost o soutěž a obě strany utkání. Trénink ani jiná událost nepotřebují sportově specifická pole.

| Evidence | Co znamená | Kdo ji mění | Pravidlo |
| --- | --- | --- | --- |
| `Availability` | Hráč může/nemůže přijít, případně neví | Hráč za sebe, rodič za schválené dítě, trenér s odůvodněním | Vlastní záznam na událost a hráče; obsahuje autora, stav, komentář a čas změny |
| `Nomination` | Trenér hráče vybral, ponechal náhradníkem nebo vyřadil | Trenér příslušného týmu, admin | Publikovaná nominace vyvolá notifikaci; nedostupného hráče lze nominovat pouze s potvrzeným důvodem |
| `Attendance` | Hráč byl skutečně přítomen, nepřítomen, omluven nebo přišel pozdě | Trenér příslušného týmu, admin | Zapisuje se po začátku události; nominace ani dostupnost ji automaticky nevyplní |

Týmová příslušnost hráče se ověřuje k času události, trenérovo oprávnění také k okamžiku zápisu. Dostupnost má uzávěrku; výjimku trenér zdůvodní. Zrušení události zachová historii a informuje adresáty. Posun času se provede verzovaně a umožní znovu potvrdit dostupnost. Změny po archivaci sezóny provádí jen admin s odůvodněním a auditem.

## Soutěže, výsledky a pořadí

`Competition` patří sportu, `CompetitionSeason` propojuje soutěž, sezónu a verzi pravidel. `CompetitionEntry` obsahuje vlastní tým nebo externího soupeře a historický název účastníka. `Opponent` eviduje název a sport bez přihlašovacího účtu. Obě strany utkání musejí patřit stejnému sportu; soutěžní zápas odkazuje na dva různé účastníky téže soutěže/sezóny.

Výsledek má stavy návrh, potvrzený, anulovaný. Do tabulky a oficiálních agregací vstupují jen aktivní potvrzené revize výsledků. Revize se nemažou: oprava zaznamená novou revizi, autora a důvod, původní zůstane dohledatelná. Součástí výsledku jsou oba skórovací součty, druh rozhodnutí (řádná hrací doba/prodloužení/kontumace) a čas potvrzení. Sport, pravidla a validace rozhodují, zda je remíza povolená.

Admin spravuje **data pravidel**, nikoli spustitelný kód. Verze pravidel obsahuje povolené výsledkové varianty, nezáporné body za každou variantu, možnost remízy, způsob kontumace a seřazený seznam kritérií. Povolená kritéria jsou body, celkový rozdíl skóre, skóre vstřelené, počet výher a obdobná kritéria vzájemných zápasů (minitabulky), případně administrátorem zaznamenané rozhodnutí. Nevyhodnocují se JavaScript/SQL ani libovolné výrazy z formuláře.

| Demonstrační konfigurace | Bodování | Kritéria shody v určeném pořadí |
| --- | --- | --- |
| Fotbal | Výhra 3, remíza 1, prohra 0; kontumace má explicitní vítěze a skóre | Body → celkový rozdíl skóre → vstřelené góly → počet výher → administrátorské rozhodnutí |
| Basketbal | Výhra 2, prohra 1, kontumační prohra 0; remíza se při potvrzení odmítá | Body → body vzájemných zápasů → rozdíl skóre vzájemných zápasů → celkový rozdíl skóre → vstřelené body → administrátorské rozhodnutí |

Jde o demonstrační pravidla projektu, nikoli tvrzení o pravidlech všech sportovních svazů. Admin může uložit odlišné platné bodování a pořadí kritérií pro konkrétní soutěž v UI.

Výpočet tabulky:

1. Načti potvrzené výsledky zvolené soutěže/sezóny a explicitní verzi pravidel ve stejné konzistentní databázové revizi.
2. U každého účastníka spočti odehrané zápasy, výhry/remízy/prohry, skóre pro/proti a soutěžní body. Účastník bez zápasu se zobrazuje s nulami.
3. Použij seznam kritérií postupně uvnitř aktuální skupiny shodných týmů. Minitabulka používá pouze vzájemné potvrzené zápasy členů této skupiny.
4. Jestliže minitabulka skupinu rozdělí a konfigurace `restart_head_to_head_on_subgroup` je zapnutá, pro menší zbylou skupinu začni znovu první vzájemné kritérium. Opakování skončí zmenšením skupiny; když nerozdělí žádný tým, pokračuj dalším kritériem. Podmínka chybějících vzájemných zápasů je v pravidlech `REQUIRE_COMPLETE` (kritérium se přeskočí) nebo `PLAYED_ONLY`.
5. Zcela shodná skupina má společné pořadí do administrátorského rozhodnutí. UUID slouží jen pro stabilní pořadí vykreslení, není sportovním kritériem. Ruční rozhodnutí obsahuje důvod a audit.

Tabulka není ručně editovaný počet bodů. Cache je odvozená a označená verzí výsledků a pravidel. Oprava/anulování výsledku zneplatní cache, přepočítá tabulku i statistiky. Změna použitých pravidel vyžaduje novou neměnnou verzi a explicitní přepočet celé soutěže, včetně historie původního výpočtu. Archivovaná sezóna je běžně pouze pro čtení.

## Administrátorsky definované statistiky

`StatisticDefinition` je stabilní identita statistiky. `StatisticDefinitionVersion` uchovává název, sport, datový typ, jednotku, povolenou hodnotu, způsob agregace, časovou platnost a autora. Admin definuje například fotbalové góly/asistence nebo basketbalové body/doskoky v UI; frontend renderuje formulář podle definice. Žádná z těchto statistik není pevný sloupec `PlayerProfile`.

| Typ hodnoty | Validace | Povolené agregace |
| --- | --- | --- |
| `INTEGER` | Celé číslo, min/max, volitelně nezáporné | `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `NONE` |
| `DECIMAL` | Konečné desetinné číslo, min/max, nejvýše konfigurovaná škála | `SUM`, `AVG`, `MIN`, `MAX`, `COUNT`, `NONE` |
| `BOOLEAN` | Jen true/false | `COUNT_TRUE`, `COUNT`, `NONE` |
| `TEXT` | Maximální délka, bez HTML, volitelně položka číselníku | `COUNT`, `NONE` |

UI i server validují; rozhodující je server. Chybějící hodnota není nula. `AVG` pracuje jen se zadanými platnými hodnotami; prázdná množina vrátí null a počet vzorků 0. `SUM` prázdné množiny je 0 spolu s počtem vzorků 0. `COUNT` počítá zadané záznamy, `COUNT_TRUE` pravdivé hodnoty. `NONE` vrací chronologickou historii bez aritmetiky. Zaokrouhlení pro zobrazení je oddělené od ukládání přesné decimal hodnoty. Agregace se filtrují sportem, sezónou, týmem a hráčem; týmové skóre a odehrané zápasy jsou odvozené z výsledků/docházky, nikoli ručně přepisované součty.

Statistika zápasu patří hráči, konkrétní verzi definice a revizi výsledku. Hráč musí být skutečně účastníkem daného zápasu; zápis před uzavřením docházky je návrh. Potvrzením výsledku se potvrzují kompatibilní statistiky. Změna výsledku musí nové statistiky explicitně převzít či opravit. Neslučitelné typy, jednotky nebo agregace vyžadují novou definici; původní definice se deaktivuje. Přejmenování vytváří novou verzi, ale zachová identitu. Historické hodnoty se nepřeinterpretují podle současné konfigurace; kombinování verzí je povolené jen při shodném typu, jednotce a agregaci.

## Členské příspěvky

`FeeAccount` určuje člena: buď profil hráče, nebo uživatelský účet jiného člena klubu. Účet propojený s hráčem používá jeho hráčský finanční účet, nezakládá druhý účet přes user ID. `FeeAssessment` obsahuje sezónu, popis, měnu, předepsanou částku, splatnost a datum případného zrušení. Admin může evidovat jednorázové i pravidelně předepsané položky. Platba je adminem zaznamenaná skutečně provedená transakce, ne online platba.

`Payment` uchovává částku, datum, způsob a referenci. `PaymentAllocation` rozdělí platbu mezi předpisy téhož člena a měny. Podporuje několik částečných úhrad jednoho předpisu i jednu platbu pro několik předpisů. Nelze přidělit více než dostupná platba ani více než zůstatek předpisu. Nealokovaný přeplatek se eviduje jako kredit, nesmí znehodnotit kontrolu částečných úhrad. Stav je odvozený: nesplaceno, částečně zaplaceno, zaplaceno. Prodlení je samostatný příznak podle data splatnosti a kladného zůstatku.

Oprava platby nesmaže historii: admin provede storno či opačný alokační záznam s důvodem a následně nový správný zápis. Transakce zamyká platbu i dotčené předpisy proti souběžnému přečerpání. Částky jsou `numeric`, měna je explicitní. Online platební brána je mimo rozsah.

## Notifikace a vnitrosystémová komunikace

Notifikace jsou automatické systémové zprávy: nová událost, změna/zrušení, zveřejnění/změna nominace a blížící se/překročená splatnost. Příspěvky oznamují příslušnému členu (hráčovu účtu a oprávněným zástupcům, případně účtu člena) **i administrátorům**. Pokud dítě nemá účet, upozornění přijímá jeho ověřený zástupce. Chybějící účet i zástupce je nedokončený onboarding: admin vidí nedoručitelnou výzvu a musí vztah doplnit, systém nesmí označit upozornění členovi za doručené. V počátečním návrhu jde o schránku v aplikaci; email lze doplnit později a není náhradou povinné schránky.

Změna domény a záznam do outboxu jsou v jedné DB transakci. Worker vytvoří doručení pro explicitní adresáty, opakované zpracování je idempotentní a uživatel může označit notifikaci jako přečtenou. Před vytvořením i načtením doručení se kontroluje platná vazba na tým/dítě. Denní úloha vyhodnotí neuhrazené předpisy a konfiguraci předstihu; stejné upozornění stejného období se neopakuje při každém běhu. Pozdní doběh po odstávce dopočítá dosud neodeslaná upozornění. Úhrada zastaví budoucí výzvy; oprava splatnosti založí novou verzi plánu.

Komunikace je **samostatná funkce**: `Conversation`, `ConversationParticipant`, `Message`. Trenéři, hráči a zástupci mohou v rámci povoleného týmového kontextu vést přímou či týmovou konverzaci. Přidání účastníka vyžaduje příslušnost k týmu nebo platnou vazbu na dítě v týmu. Jen účastník čte zprávy; admin nemá automatický přístup do soukromé konverzace. Zprávy mají autora, čas a text; v základní verzi jsou neměnné, případné skrytí má audit metadat bez kopírování obsahu do obecného admin auditu. Nejsou vytvářeny místo nominací nebo finančních záznamů. Zánik oprávnění zabrání novému přístupu, ale historii nesmaže. Rozhraní přehledně oddělí konverzace od automatických notifikací.

## Historie a změny

Sezóny, členství, výsledkové revize, verze statistik, platby a alokace se fyzicky nemažou prostřednictvím běžných operací. Každý citlivý zápis zaznamená aktéra, čas, typ změny a důvod. Časové údaje používají UTC `timestamptz`; uživatelské zobrazení respektuje časovou zónu klubu. Archivace zastaví běžné zápisy, zachová přehledy a umožní řízené admin opravy s novou revizí a přepočtem. Žádná auditní tabulka neukládá hesla, session tokeny nebo CSRF tokeny.

Konkrétní tabulky, indexy a hranice DB/server validace popisuje [databázový návrh](database-design.md); přístupová pravidla a negativní scénáře [autorizace](authorization.md).
