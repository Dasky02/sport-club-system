# Uživatelská příručka

Příručka odděluje **fungující technický skeleton** od plánované klubové aplikace. Klubové obrazovky níže zatím neexistují. Po dokončení etap se postupy upraví podle skutečného UI a ověří v akceptaci. Rozsah sledují [požadavky](requirements.md); cílové vztahy účtů a osob popisuje [databázový model](database.md).

## Co lze používat nyní

Po spuštění podle [README](../README.md) otevřete `http://localhost:3000`; týmovou HTTPS adresu poskytne provozovatel po nasazení. Úvod obsahuje odkazy **Vytvořit účet**, **Přihlásit se** a stav API včetně verze. Pokud je API nedostupné, ověřte backend a konfiguraci; samotné zobrazení úvodu nepotvrzuje funkční připojení.

1. Otevřete **Vytvořit účet** (`/register`). Vyplňte uživatelské jméno o 3–50 znacích, heslo a jeho potvrzení. Formulář požaduje 6–100 znaků a nejvýše 72 bajtů hesla; diakritika může zabírat více bajtů. Použijte vlastní heslo a případné chyby opravte podle formuláře.
2. Po registraci přejděte na **Přihlášení** (`/login`). Registrace sama nepřihlašuje. Nový účet má roli **USER** bez klubových oprávnění.
3. Přihlaste se. Na **Můj účet** (`/dashboard`) uvidíte uživatelské jméno, roli, datum vytvoření a UUID vrácené backendem. UUID není heslo ani právo na cizí údaje.
4. Obnovte stránku. Frontend ověří serverovou session a účet znovu zobrazí, pokud je platná. Po vypršení nabídne přihlášení.
5. Klikněte **Odhlásit se**. Po potvrzeném odhlášení dashboard účet nezobrazuje. Pokud server odhlášení nepotvrdí, UI ukáže chybu a možnost ověřit session; dokončete odhlášení po obnovení spojení.

Session cookie a CSRF klient spravují automaticky. Výpadek API se zobrazí jako neúspěšné ověření session s volbou **Zkusit znovu**. Pokud systém po delší době odmítá změny, obnovte stránku a ověřte přihlášení. Nesdílejte heslo ani session cookie.

Skeleton má stále jednu uloženou roli z enumu `USER`, `ADMIN`, `COACH`, `PLAYER`, `PARENT`. Nemá typy účtu STANDARD/CHILD, administrační obrazovky, propojení osob ani rodičovské vazby. Ani testovací účet označený COACH/PLAYER/PARENT nyní nemá klubové stránky. Následující návrh vyžaduje migraci a další implementaci.

## Účty a činnosti v cílové aplikaci

**Stav: plánované, dosud neimplementované.** Systémová role bude `USER` nebo `ADMIN`, typ účtu `STANDARD` nebo omezený `CHILD`. Trenérská, hráčská a rodičovská oprávnění se odvodí z konkrétního přiřazení k týmu, vlastního hráčského profilu a schválené vazby k dítěti. Jeden STANDARD účet může být zároveň trenérem, rodičem i administrátorem. Každá činnost se ověřuje pro konkrétní tým, dítě a období.

STANDARD/USER bez vazeb bude mít přístup k vlastnímu účtu, povoleným vlastním údajům, vlastním příspěvkům a notifikacím. Registrace nevytvoří hráčský profil ani trenérské oprávnění. Účet a hráčský profil spojuje stejná osoba; propojení ověřuje administrátor.

Hráč, včetně dítěte, může existovat bez přihlášení a bez rodičovské vazby. Rodiče lze evidovat jako osoby i bez účtu; tím jim nevzniká přístup nebo schránka. Pokud rodiče ani hráči účty nepoužívají, sportovní údaje spravuje oprávněný trenér a příspěvky administrátor. Dítě není systémová role. Omezený dětský účet má další podmínky popsané níže.

## Jeden trenér spravující vlastní tým — plánovaný postup

**Stav: E1–E6, dosud neimplementováno.** Stačí jediný STANDARD účet s ADMIN, jehož majitel je současně trenérem. Samostatný administrátorský účet, hráčské účty ani rodiče nejsou pro tento způsob použití nutné.

1. Zaregistrovat běžný účet a přihlásit se. V plánovaném prvotním nastavení převzít správu jednorázovým instalačním tokenem, který provozovatel nastaví v prostředí. Token nemá výchozí hodnotu. Po úspěchu se uloží dokončení nastavení a token už nelze použít; první registrace sama ADMIN nepřiděluje. Dnešní skeleton tento postup ještě neposkytuje.
2. Nastavit klub a sport podle [databázového návrhu](database.md), otevřít sezónu a založit vlastní tým.
3. Přiřadit vlastní účet jako trenéra týmu. Stejné přihlášení pak používá správní i trenérské činnosti.
4. Založit osoby, hráčské profily a jejich týmová členství. Hráči mohou zůstat bez účtu a bez rodiče.
5. Evidovat akce, nominace, docházku, výsledky a statistiky; správními právy také příspěvky a skutečné úhrady.
6. Další účty přidat až podle potřeby. Dětský účet aktivovat pouze se schváleným rodičem s aktivním STANDARD účtem. Bez dalších účtů nevytvářet fiktivní konverzace ani doručení.

Jediný účet může mít všechny potřebné pravomoci, ale stále dodržuje validaci sportovních údajů, částek a historie. Ostatním uživatelům tím žádná práva nevznikají.

## Administrátor klubu — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** ADMIN spravuje klub, příspěvky, účty a vztahy. Citlivé změny mají audit; ruční příznak „zaplaceno“ nenahrazuje skutečnou úhradu.

| Úkol | Plánovaný postup a výsledek |
| --- | --- |
| Klub a sezóna | V administraci založit fotbal a basketbal v téže instalaci, otevřít sezónu a nastavit hranice. Další sporty a jejich konfigurace nevyžadují změnu kódu ani ruční SQL. |
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

**Stav: E1–E6, dosud neimplementováno.** Trenérská oprávnění vyplývají z platného přiřazení STANDARD účtu k týmu. Samotné přiřazení dovoluje pouze příslušné týmy a sezóny. Chybějící přiřazení řeší administrátor; trenér s ADMIN jej může spravovat stejným účtem.

1. Vybrat tým a sezónu a prohlédnout svěřence bez nepotřebných osobních nebo finančních údajů. Profily nemusejí mít účty.
2. Vytvořit trénink, zápas či jinou akci s místem, časem a uzávěrkou dostupnosti. U zápasu určit soupeře a případný ročník soutěže. Publikování vytvoří systémová oznámení oprávněným adresátům.
3. Prohlédnout dostupnost, pokud ji hráči či rodiče zadali; nezapsaný údaj ponechat jako nezjištěný. Vybrat nominované a náhradníky a nominaci publikovat. Nominace ani dostupnost nepotvrzuje docházku.
4. Po začátku publikované akce zapsat skutečnou docházku. U zápasu zvlášť evidovat, kdo skutečně nastoupil. Tyto zápisy nevyžadují účty hráčů či rodičů.
5. Po skončení zápasu připravit výsledkovou revizi a případné části podle formátu. Statistické hodnoty zadat pouze skutečně nastoupivším hráčům podle platných definic. Potvrdit revizi a dokončit zápas až s platnými údaji; tabulka a agregace použijí pouze aktuální potvrzené výsledky dokončených zápasů. Oprava vytváří novou revizi a původní nemaže.
6. V **Konverzacích** komunikovat s existujícími oprávněnými účty hráčů či rodičů. V **Notifikacích** číst automatické zprávy. Historické přehledy používat v povoleném týmovém a sezónním rozsahu.

Samotné trenérské přiřazení nedovoluje přidělovat ADMIN, schvalovat rodiče, nastavovat definice statistik/bodování ani zapisovat platby. Má-li účet také ADMIN, tyto činnosti provádí správními právy. Finance dítěte zpřístupní rodičovská vazba nebo ADMIN, nikdy jen trenérské přiřazení. Společná akce několika týmů vyžaduje práva ke všem dotčeným týmům nebo správní oprávnění.

## Hráč s vlastním účtem — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** Hráčské přihlášení je volitelné. Administrátor propojí účet s vlastním profilem přes stejnou osobu a nastaví členství; samotný USER hráčem není. Profil bez účtu spravují oprávněný trenér a administrátor.

1. Vybrat vlastní tým a kalendář. U publikované akce do uzávěrky zadat **Mohu přijít**, **Nemohu přijít** nebo **Nevím**, případně omluvu. Odpověď se týká vlastního profilu.
2. Po publikování nominace ověřit výběr nebo náhradnictví. Potvrzená dostupnost sama nezaručuje nominaci.
3. Prohlédnout vlastní docházku, nastoupení, výsledky, statistiky a historii. Tyto sportovní údaje hráč neopravuje; nepřesnost sdělí trenérovi.
4. Hráč se STANDARD účtem může v **Příspěvcích** vidět vlastní předpisy, úhrady a zůstatky. Zaplatí mimo systém a ADMIN úhradu zaznamená. **Hráč s CHILD účtem finance vůbec nevidí; řeší je jeho rodič nebo ADMIN.**
5. V **Notifikacích** číst povolená oznámení a označovat je přečtená; CHILD nemá finanční typy ani jejich počty. V **Konverzacích** komunikovat jako aktivní účastník v oprávněném týmu.

Hráčské oprávnění nedovoluje měnit dostupnost spoluhráče ani číst cizí finance. Při přestupu zůstává vlastní historie dostupná, nové interní informace bývalého týmu nikoli. STANDARD účet může mít další oprávnění, která se posoudí samostatně.

### Dítě s omezeným účtem

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
