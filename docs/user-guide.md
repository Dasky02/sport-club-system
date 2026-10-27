# Uživatelská příručka

Příručka odděluje **dostupné E0 + P1/P2** od plánované klubové aplikace. Dostupné jsou identita/setup/sporty, sezóny, týmy, offline hráči, členství a oprávněné soupisky/historie. Rodiče a omezené dětské přihlášení až v P3; události, výsledky, finance a komunikace v dalších etapách. Čtyři úplné klubové pracovní postupy se dokončí postupně. [Požadavky](requirements.md) sledují rozsah, [ověření](verification.md) skutečné kontroly.

## Registrace, přihlášení a vlastní osobní údaje

Po spuštění podle [README](../README.md) otevřete `http://localhost:3000`; veřejnou HTTPS adresu poskytne provozovatel až po nasazení. Úvod nabízí **Vytvořit účet**, **Přihlásit se** a stav skutečného API včetně verze. Nedostupné API není potvrzené odhlášení.

1. Na `/register` vyplňte username o 3–50 znacích a dvakrát vlastní heslo. Backend požaduje 6–72 znaků a nejvýše 72 UTF-8 bajtů; diakritika může zabírat více bajtů. Registrace vytváří USER/STANDARD/PENDING a sama nepřihlašuje ani nepřiděluje ADMIN.
2. Přihlaste se na `/login`. Dashboard **Můj účet** zobrazuje účet ověřený backendem. U neúplného účtu nabídne **Doplnit osobní údaje**.
3. Otevřete `/profile` — **Vaše osobní údaje**. Vyplňte povinné **Jméno** a **Příjmení** (nejvýše 100 znaků každé), případně datum narození, e-mail a telefon. Budoucí datum narození se odmítne. Klikněte **Uložit osobní údaje**.
4. Po potvrzení **Váš profil je dokončený.** se zobrazí skutečně uložená vlastní osoba. P1 dovoluje jednorázové doplnění a následné čtení; self-service editaci ani připojení cizí osoby neposkytuje. ADMIN může v P2 editovat osobní údaje v přehledu osob, nikoli přepojovat účet. Dokončení osoby nevytváří hráče, tým ani rodičovskou vazbu.
5. Obnovte stránku pro ověření serverové session. Při vypršení se přihlaste znovu. **Odhlásit se** ukončí session po potvrzení backendem; chyba spojení se nesmí vydávat za úspěšné odhlášení.

Session cookie a CSRF klient spravují automaticky. Při výpadku použijte **Zkusit znovu**; nesdílejte hesla ani cookies. PENDING může dokončovat vlastní onboarding a načíst prázdný kontext. Nastavení klubu a sporty vyžadují dokončenou osobu; nejsou cestou k obejití onboardingu.

## První nastavení klubu v P1

Pro novou instalaci nastaví provozovatel soukromý `CLUB_SETUP_TOKEN` v prostředí **backendu** podle [README](../README.md). Prázdná hodnota setup vypíná; neexistuje výchozí token nebo účet. Token nepatří do URL, veřejné dokumentace ani NEXT_PUBLIC proměnné.

1. S dokončeným STANDARD účtem otevřete `/setup` — **Nastavení klubu**. Dashboard nabízí odkaz, pokud je profil hotový.
2. Je-li převzetí dostupné, vyplňte **Instalační token** a potvrďte **Převzít správu klubu**. Ověření proběhne na serveru; první registrant nemá automatickou přednost ani ADMIN.
3. Po úspěchu aplikace načte aktuální roli a kontext. Tentýž účet je nyní ADMIN a zobrazí se **Správa klubu je již nastavená.** Setup nelze použít podruhé ani po pozdější změně role.
4. Pokud je setup nedostupný, provozovatel ověří konfiguraci backendu nebo již dokončenou instalaci. Chybný token neopakujte automaticky. Neměňte ručně stav databáze, abyste setup znovu otevřeli.

Existující ADMIN z V1 zůstává administrátorem a V2 označí setup za dokončený. Tento správce si po přihlášení nejprve doplní vlastní osobu; další tokenové převzetí není potřeba. P1 nemá obecnou správu rolí ostatních účtů.

## Správa sportů v P1

Dokončený ADMIN otevře `/admin/sports` — **Správa sportů**. Běžný USER správu nemá; backend odmítne i přímý nepovolený požadavek.

1. Vyplňte **Kód sportu** a **Název sportu**, poté **Přidat sport**. Kód má 1–40 znaků, začíná písmenem A–Z a dále obsahuje jen velká písmena, číslice a podtržítko. UI jej převádí na velká písmena. Název má nejvýše 100 znaků.
2. Pro demonstrační základ založte například `FOOTBALL` / Fotbal a `BASKETBALL` / Basketbal ve stejné instalaci. Nejsou vložené skrytým produkčním seedem; jde o skutečné záznamy vytvořené adminem.
3. Seznam má stránkování a zobrazuje i deaktivované sporty. Pomocí **Upravit** změňte název; **Deaktivovat** a **Aktivovat** mění použitelnost záznamu. Kód se po vytvoření nemění a mazání sportu není dostupné.

P2 kontext přidává správu sezón, týmů, hráčů a členství; týmové čtení vzniká jen z platného přiřazení. Založení sportu samo není hotový soutěžní nebo statistický scénář; ty dodají P4–P6.

## Sezóny, týmy a hráči v P2 — dostupné

1. Jako ADMIN otevřete **Administrace** → **Sezóny** (`/admin/seasons`). Vyplňte název, začátek a konec. Začátek patří do sezóny, konec už ne: 1. 7. 2026 až 1. 7. 2027 zahrnuje 30. 6. 2027. Použité datumové hranice se již nemění.
2. V **Týmy a členství** (`/admin/teams`) založte základní tým: název, jeden aktivní sport a **Klubový tým**. Nezaškrtnutý typ znamená externího soupeře, kterému nelze přidat interní členství.
3. Ve formuláři **Zařadit tým do sezóny** vyberte tým a otevřenou sezónu a napište sezónní název. Tento název zůstane zachovaný i při přejmenování základního týmu. Jednu dvojici nelze přidat dvakrát; po použití nelze přepnout sport nebo typ týmu.
4. V **Hráči a osoby** (`/admin/players`) zvolte **Nová osoba a hráč společně**. Jméno, příjmení a datum narození jsou povinné; kontakty volitelné. Vznikne osoba a hráč atomicky, žádný účet ani rodič. Nebo vyberte **Již evidovaná osoba** s datem narození a bez hráčského profilu. Podobné jméno osobu automaticky nepropojí.
5. V přehledu **Osoby** lze načíst a upravit osobní údaje. Hráči nejde datum narození vymazat. Editace nepřepojuje účet ani hráče na jiného člověka.
6. Na kartě sezónního týmu otevřete **Spravovat členství**. Zvolte hráče a interval, potvrďte **Přidat hráče do týmu**. V trenérském formuláři lze vybrat vlastní ADMIN účet; další uživatel není nutný. Nabídka obsahuje jen enabled STANDARD účty s dokončenou osobou.

Členství má zahrnutý začátek a vyloučený konec. Prázdný konec znamená konec sezóny. Stejný hráč/trenér nemůže mít dva překrývající se intervaly ve stejném sezónním týmu; sousední intervaly a členství v jiném týmu jsou přípustné. **Upravit interval** vždy uloží oba datumové údaje. Při přestupu ukončete starý interval a založte nový, historické řádky nemažte. Při konfliktu zůstávají rozepsané údaje pro opravu.

**Archivovat sezónu** vyžaduje potvrzení. Historie zůstane čitelná, běžné změny sezóny, jejích sezónních týmů a členství se zablokují; vrácení archivace tato etapa neposkytuje. Základní tým a osobní údaje jsou samostatné záznamy, nejsou historickými snímky všech osobních údajů.

## Soupisky a vlastní historie v P2 — dostupné

V **Týmy** (`/teams`) ADMIN vidí všechny sezónní týmy. Ostatní dokončené STANDARD účty vidí pouze týmy, kde mají právě dnes trenérské nebo vlastní hráčské členství. Dřívější ani budoucí interval přístup nezaloží. Členství lze přidat pouze k účtům/osobám explicitně vybraným administrátorem; registrace sama není hráč.

**Zobrazit soupisku** otevře jména a intervaly členství, bez kontaktů, data narození nebo financí. ADMIN může vybrat **Soupiska ke dni** pro historický stav, ostatní mají dnešní soupisku. **Profil a členství** otevře minimální profil a povolenou historii: vlastní hráč celou svou, trenér jen aktuálně svěřené sezónní týmy. Ukončení posledního přiřazení odstraní další týmový přístup i při stále přihlášené session. Archivace sama nevytváří oprávnění. Historické výsledkové pohledy přijdou s P5/P6.

## Přechod starších účtů a dosavadní omezení

V2 zachovává UUID účtu, BCrypt heslo a časy. Staré ADMIN se zachová, COACH/PLAYER/PARENT se převedou na USER bez automaticky domyšleného týmu nebo dítěte. `legacy_role` je neveřejná migrační evidence. Chybějící osobní údaje se nevyrábějí z loginu: účet má dočasně nullable person a projde vlastním onboardingem.

P2 poskytuje ADMIN osoby a týmový základ výše; správa jiných účtů/rolí, person-link, rodičovské vztahy, finance, kalendář a zprávy ještě nejsou dostupné. Typ CHILD je v modelu a guardian_links v DB, ale vytvoření a aktivace CHILD i rodičovská oprávnění jsou až P3; CHILD zůstává blokovaný. Další části příručky jsou cílové postupy pro pozdější balíčky.

## Účty a činnosti v cílové aplikaci

**Stav: týmové čtení a administrace P2 dostupné výše; zbytek následujících úplných postupů je plán P3–P9.** USER/ADMIN a STANDARD/CHILD již existují; rodičovské vazby a funkční CHILD ještě nefungují. Trenérská, hráčská a rodičovská oprávnění se odvodí z konkrétního přiřazení k týmu, vlastního hráčského profilu a schválené vazby k dítěti. Jeden STANDARD účet může být zároveň trenérem, rodičem i administrátorem. Každá činnost se ověřuje pro konkrétní tým, dítě a období.

STANDARD/USER bez vazeb bude mít přístup k vlastnímu účtu, povoleným vlastním údajům, vlastním příspěvkům a notifikacím. Registrace nevytvoří hráčský profil ani trenérské oprávnění. Účet a hráčský profil spojuje stejná osoba; propojení ověřuje administrátor.

Hráč, včetně dítěte, může existovat bez přihlášení a bez rodičovské vazby. Rodiče lze evidovat jako osoby i bez účtu; tím jim nevzniká přístup nebo schránka. Pokud rodiče ani hráči účty nepoužívají, sportovní údaje spravuje oprávněný trenér a příspěvky administrátor. Dítě není systémová role. Omezený dětský účet má další podmínky popsané níže.

## Jeden trenér spravující vlastní tým — dostupný základ a plán

**Stav:** kroky 1–4 jsou dostupné v P1/P2, kroky 5–6 plánované. Stačí jediný STANDARD účet s ADMIN, jehož majitel bude současně trenérem. Samostatný administrátorský účet, hráčské účty ani rodiče nejsou pro tento způsob použití nutné.

1. Zaregistrovat běžný účet a přihlásit se. V dostupném prvotním nastavení P1 převzít správu jednorázovým instalačním tokenem, který provozovatel nastaví v prostředí. Token nemá výchozí hodnotu. Po úspěchu se uloží dokončení nastavení a token už nelze použít; první registrace sama ADMIN nepřiděluje. P1 tento setup poskytuje.
2. V P1/P2 založit sporty, otevřít sezónu a založit vlastní tým podle [databázového návrhu](database.md).
3. Přiřadit vlastní účet jako trenéra týmu. Stejné přihlášení pak používá správní i trenérské činnosti.
4. Založit osoby, hráčské profily a jejich týmová členství. Hráči mohou zůstat bez účtu a bez rodiče.
5. Evidovat akce, nominace, docházku, výsledky a statistiky; správními právy také příspěvky a skutečné úhrady.
6. Další účty přidat až podle potřeby. Dětský účet aktivovat pouze se schváleným rodičem s aktivním STANDARD účtem. Bez dalších účtů nevytvářet fiktivní konverzace ani doručení.

Jediný účet může mít všechny potřebné pravomoci, ale stále dodržuje validaci sportovních údajů, částek a historie. Ostatním uživatelům tím žádná práva nevznikají.

## Administrátor klubu — plánované pracovní postupy

**Stav:** ADMIN má P1/P2 včetně osob/hráčů/sezón/týmů/členství. Tabulka popisuje celý cílový rozsah; účty/rodiče, soutěže, události, finance a komunikace jsou ještě plán P3–P9. ADMIN bude spravovat i příspěvky, účty a vztahy. Citlivé změny mají audit; ruční příznak „zaplaceno“ nenahrazuje skutečnou úhradu.

| Úkol | Plánovaný postup a výsledek |
| --- | --- |
| Klub a sezóna | P1/P2 umožňují fotbal a basketbal v téže instalaci, sezóny a jejich hranice. Další sporty a jejich konfigurace nevyžadují změnu kódu ani ruční SQL. |
| Členové a týmy | Založit osobu, hráčský profil, tým a časové členství. Trenérské přiřazení se váže přímo na účet a tým. Hráč může zůstat bez přihlášení i zástupce. Přestup ukončí starý interval a založí nový. |
| Účty a vztahy | Přidělovat USER/ADMIN pouze účtům odpovídajícího typu; trenérská práva nastavit přiřazením. Ověřit propojení účtu a hráčského profilu přes osobu. Rodičovskou vazbu schválit mezi osobou rodiče a konkrétním hráčem; samotné zadání ID uživatelem nestačí. |
| Dětský účet | Nový CHILD je neaktivní. Aktivovat jej pouze s vlastním hráčským profilem a alespoň jednou platnou vazbou na rodiče s aktivním STANDARD účtem. CHILD nesmí být ADMIN, trenérem, zástupcem ani převzít prvotní správu. Po odebrání poslední potřebné vazby nebo deaktivaci posledního odpovídajícího rodičovského účtu se přihlášení dítěte zablokuje; profil i historie zůstávají. |
| Soutěž | Založit soutěž a ročník, přihlásit vlastní týmy i soupeře a nastavit formát, bodování a pořadí kritérií. Použitou konfiguraci chránit podle databázových pravidel. |
| Statistiky | Přidat sport, název, typ, jednotku, meze a kompatibilní agregaci. Formulář výsledků použije tuto konfiguraci. Přejmenování založí novou verzi; historicky použitý význam se nepřepisuje a jiný typ či význam vyžaduje novou definici. |
| Příspěvky | Vystavit osobě předpis s částkou, měnou a splatností. Každou skutečně přijatou úplnou nebo částečnou úhradu zaznamenat k předpisu. Zůstatek se vypočítá; přeplacení se odmítne. Chybnou úhradu stornovat s důvodem a případně zapsat správnou. |
| Splatnosti | Přijímat oznámení nedoplatků před i po splatnosti. Příslušné oznámení dostává také člen se STANDARD účtem nebo oprávněný rodič; CHILD nedostává žádné finanční oznámení. Chybějící účet se nepovažuje za doručení. |
| Historie | Vybrat minulou sezónu pro výsledky, statistiky a členství. Oprava potvrzeného výsledku či statistiky vytvoří novou výsledkovou revizi s důvodem a přepočtem; původní hodnoty zůstanou. Archivované údaje opravuje jen ADMIN. |

Administrátor používá vlastní schránku a vlastní oprávněné konverzace; role sama neumožňuje číst soukromé rozhovory ostatních. Může být zároveň trenérem vlastních týmů. Nasazení, HTTPS, zálohy a obnova mají samostatný [postup](deployment.md).

## Trenér — plánované pracovní postupy

**Stav:** první krok (aktuální soupisky) je dostupný P2; ostatní kroky a úplné historické výsledky jsou plánované. Trenérská oprávnění vyplývají z platného přiřazení STANDARD účtu k týmu. Samotné přiřazení dovoluje pouze příslušné týmy a sezóny. Chybějící přiřazení řeší administrátor; trenér s ADMIN jej může spravovat stejným účtem.

1. Vybrat tým a sezónu a prohlédnout svěřence bez nepotřebných osobních nebo finančních údajů. Profily nemusejí mít účty.
2. Vytvořit trénink, zápas či jinou akci s místem, časem a uzávěrkou dostupnosti. U zápasu určit soupeře a případný ročník soutěže. Publikování vytvoří systémová oznámení oprávněným adresátům.
3. Prohlédnout dostupnost, pokud ji hráči či rodiče zadali; nezapsaný údaj ponechat jako nezjištěný. Vybrat nominované a náhradníky a nominaci publikovat. Nominace ani dostupnost nepotvrzuje docházku.
4. Po začátku publikované akce zapsat skutečnou docházku. U zápasu zvlášť evidovat, kdo skutečně nastoupil. Tyto zápisy nevyžadují účty hráčů či rodičů.
5. Po skončení zápasu připravit výsledkovou revizi a případné části podle formátu. Statistické hodnoty zadat pouze skutečně nastoupivším hráčům podle platných definic. Potvrdit revizi a dokončit zápas až s platnými údaji; tabulka a agregace použijí pouze aktuální potvrzené výsledky dokončených zápasů. Oprava vytváří novou revizi a původní nemaže.
6. V **Konverzacích** komunikovat s existujícími oprávněnými účty hráčů či rodičů. V **Notifikacích** číst automatické zprávy. Historické přehledy používat v povoleném týmovém a sezónním rozsahu.

Samotné trenérské přiřazení nedovoluje přidělovat ADMIN, schvalovat rodiče, nastavovat definice statistik/bodování ani zapisovat platby. Má-li účet také ADMIN, tyto činnosti provádí správními právy. Finance dítěte zpřístupní rodičovská vazba nebo ADMIN, nikdy jen trenérské přiřazení. Společná akce několika týmů vyžaduje práva ke všem dotčeným týmům nebo správní oprávnění.

## Hráč s vlastním účtem — plánované pracovní postupy

**Stav:** STANDARD hráč může v P2 číst aktuální tým a vlastní členskou historii; ostatní kroky a CHILD jsou plánované. Hráčské přihlášení je volitelné. Administrátor propojí účet s vlastním profilem přes stejnou osobu a nastaví členství; samotný USER hráčem není. Profil bez účtu spravují oprávněný trenér a administrátor.

1. Vybrat vlastní tým a kalendář. U publikované akce do uzávěrky zadat **Mohu přijít**, **Nemohu přijít** nebo **Nevím**, případně omluvu. Odpověď se týká vlastního profilu.
2. Po publikování nominace ověřit výběr nebo náhradnictví. Potvrzená dostupnost sama nezaručuje nominaci.
3. Prohlédnout vlastní docházku, nastoupení, výsledky, statistiky a historii. Tyto sportovní údaje hráč neopravuje; nepřesnost sdělí trenérovi.
4. Hráč se STANDARD účtem může v **Příspěvcích** vidět vlastní předpisy, úhrady a zůstatky. Zaplatí mimo systém a ADMIN úhradu zaznamená. **Hráč s CHILD účtem finance vůbec nevidí; řeší je jeho rodič nebo ADMIN.**
5. V **Notifikacích** číst povolená oznámení a označovat je přečtená; CHILD nemá finanční typy ani jejich počty. V **Konverzacích** komunikovat jako aktivní účastník v oprávněném týmu.

Hráčské oprávnění nedovoluje měnit dostupnost spoluhráče ani číst cizí finance. Při přestupu zůstává vlastní historie dostupná, nové interní informace bývalého týmu nikoli. STANDARD účet může mít další oprávnění, která se posoudí samostatně.

### Dítě s omezeným účtem — plán P3

CHILD má vlastní přihlášení pro vlastní sportovní údaje, dostupnost a povolenou komunikaci. Účet je navázaný na konkrétní hráčský profil a alespoň jednoho schváleného rodiče s aktivním STANDARD účtem. Rodič může zastupovat několik dětí a dítě může mít několik schválených zástupců.

Dítě nemění typ účtu, datum narození, osobu, systémovou roli ani rodičovské vazby. Nevidí předpisy, platby, částky, zůstatky, finanční exporty, součty ani finanční oznámení, včetně vlastních. Omezení platí i při přímém zadání URL/API a není jen skrytím položky menu. Tyto informace vidí oprávněný rodič a ADMIN.

Po zániku poslední potřebné rodičovské vazby nebo deaktivaci posledního odpovídajícího rodičovského účtu se účet dítěte zablokuje a session ukončí. Obnovení vyžaduje platnou schválenou vazbu na aktivní STANDARD účet rodiče a aktivaci administrátorem; sportovní profil a historie se nemažou. U profilu bez přihlášení se rodič nevyžaduje, takže tento stav nebrání trenérovi evidovat tým samostatně.

## Rodič / zákonný zástupce — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** Rodič může být pouze evidovanou osobou nebo se přihlásit STANDARD účtem. Přihlášená rodičovská práva vzniknou až administrátorským schválením vazby jeho osoby na konkrétní dítě; systémová role PARENT se neuděluje. Dítě vlastní účet mít nemusí, ale CHILD účet musí zůstat pod platným rodičovským vztahem.

1. V **Moje děti** vybrat dítě se schválenou vazbou. Seznam i počty obsahují pouze vlastní oprávněné děti. Pokud dítě chybí, požádat administrátora o ověření; jméno ani dosazení cizího ID vazbu nevytvoří.
2. V kalendáři dítěte do uzávěrky zadat dostupnost nebo omluvu. Odpověď druhého dítěte se tím nezmění.
3. Po zveřejnění ověřit nominaci, později skutečnou docházku, nastoupení, výsledky a statistiky. Tyto sportovní zápisy rodič nepřepisuje.
4. Prohlédnout příspěvky dítěte, splatnosti, zaznamenané částečné úhrady a zůstatky. Platbu provést mimo systém a chybný záznam řešit s ADMIN. Finance dítěte jsou dostupné rodiči, nikoli jeho CHILD účtu.
5. Číst vlastní oznámení včetně finančních výzev pro oprávněné dítě. V konverzacích komunikovat jen jako aktivní účastník v kontextu týmu dítěte.

Rodičovská vazba nedovoluje číst jiné děti, tvořit nominace ani zapisovat platby, výsledky či statistiky. Rodič může být zároveň trenérem; každá činnost se ověřuje zvlášť. Odebrání jedné vazby neruší jiné platné vztahy. Ztráta poslední vazby k danému dítěti ukončí rodičův další přístup; stará notifikace jej neobnoví. Pokud tím CHILD přijde o posledního aktivního oprávněného rodiče, jeho účet se dočasně zablokuje také.

## Řešení obvyklých situací

| Situace | Postup |
| --- | --- |
| Vypršela session | Přihlásit se znovu. Změnu s neověřeným výsledkem neopakovat automaticky. |
| API je nedostupné | Ověřit spojení a službu, poté zkusit znovu. Výpadek neznamená potvrzené odhlášení. |
| Zamítnutý přístup | Ověřit typ účtu, roli, týmové přiřazení a případnou vazbu k dítěti. UUID ani nová registrace práva nepřidají. |
| CHILD nemá finanční přehled | Jde o záměrné omezení. Finance zkontroluje oprávněný rodič nebo ADMIN. |
| CHILD byl zablokován po změně rodičovské vazby | S ADMIN ověřit alespoň jednu platnou vazbu na aktivní STANDARD rodičovský účet; nepoužívat cizí přihlášení. |
| Přiřazení či vazba byly odebrány | Příslušná práva se znovu kontrolují i se starou session. Další platná oprávnění platí pouze ve svém rozsahu. |
| Zastaralý formulář | Načíst aktuální stav a změnu znovu posoudit; nepřepsat novější data. |
| Hráč nemá účet ani rodiče | Evidenci dále spravuje oprávněný trenér a ADMIN. Nevytvářet fiktivní adresáty oznámení. |
| Trenér pracuje sám | V cílové aplikaci používá jediný STANDARD/ADMIN účet s vlastním trenérským přiřazením. |

Technické problémy zapisujte do issue nového repozitáře s reprodukcí, verzí API a chybou. Nevkládejte hesla, `.env`, cookies, osobní údaje dětí ani databázové dumpy. Po implementaci a akceptaci se doplní skutečné obrazovky, provozní kontakty a produkční URL.
