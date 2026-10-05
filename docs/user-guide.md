# Uživatelská příručka

Tato verze příručky popisuje **fungující technický skeleton** a odděleně plánované pracovní postupy všech čtyř klubových rolí. Klubové obrazovky níže zatím neexistují. Po dokončení jednotlivých etap budou jejich postupy doplněny podle skutečného UI a ověřeny v akceptaci. Úplný rozsah je v [požadavcích](requirements.md).

## Co lze používat nyní

Po spuštění podle [README](../README.md) otevřete lokálně `http://localhost:3000`; týmovou HTTPS adresu poskytne provozovatel až po nasazení. Na úvodní stránce jsou odkazy **Vytvořit účet**, **Přihlásit se** a stav skutečného API včetně verze. Pokud je API nedostupné, ověřte spuštění backendu a konfiguraci; zobrazení úvodní stránky samotné neznamená funkční připojení.

1. Otevřete **Vytvořit účet** (`/register`). Vyplňte uživatelské jméno o 3–50 znacích, heslo a jeho potvrzení. Formulář požaduje 6–100 znaků a nejvýše 72 bajtů hesla; diakritika může zabírat více bajtů. Použijte vlastní heslo, ne ukázkovou hodnotu z konfigurace. Při obsazeném jméně nebo nesprávných údajích upravte formulář podle chyby.
2. Po potvrzené registraci přejděte na **Přihlášení** (`/login`). Registrace sama nevytváří přihlášenou session. Nový účet má roli **USER — uživatel bez klubových oprávnění**.
3. Přihlaste se jménem a heslem. Na stránce **Můj účet** (`/dashboard`) uvidíte skutečné jméno, roli, datum vytvoření a UUID účtu vrácené backendem. UUID není tajné heslo ani právo na přístup k cizím datům.
4. Obnovte stránku. Frontend ověří serverovou session a účet se znovu zobrazí, pokud je session platná. Při vypršení přihlášení stránka nabídne nové přihlášení.
5. Klikněte **Odhlásit se**. Po úspěchu již dashboard nevypíše přihlášený účet. Pokud server nepotvrdí odhlášení, UI ukáže chybu a tlačítko k ověření session; dokončete odhlášení až po obnovení spojení.

Session cookie a CSRF klient spravují automaticky; do běžného formuláře se tokeny ručně nevkládají. Výpadek API je zobrazený jako selhání ověření session s možností **Zkusit znovu**, není zaměněný za jistě odhlášeného uživatele. Pokud systém odmítá změnové požadavky po delší době, obnovte stránku a ověřte přihlášení. Nesdílejte heslo ani session cookie s kolegy.

Skeleton nemá administrační obrazovku pro přiřazení role, připojení hráčského profilu ani potvrzení rodičovské vazby. Tato správa je plánovaná v E1. Ani účet již označený COACH/PLAYER/PARENT v testovacím prostředí nyní nemá klubové stránky; dashboard jen pravdivě zobrazí jeho roli. Aktuální `User` má jednu roli, ne souběžnou kombinaci rolí.

## Administrátor klubu — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** Administrátor má klubový rozsah, mění příspěvky, role a konfigurace. Citlivé změny mají audit; žádné ruční zapsání stavu „zaplaceno“ nenahrazuje evidenci skutečné platby.

| Úkol | Plánovaný postup a výsledek |
| --- | --- |
| Založení sportů a sezóny | V administraci založit fotbal a basketbal, otevřít sezónu a nastavit její hranice; není třeba upravovat kód. |
| Členové a týmy | Založit profil hráče či trenéra, tým příslušného sportu a časové členství. Hráč může zůstat bez účtu. Přestup ukončí starý interval a vytvoří nový. |
| Účty a rodiče | Vybrat registrovaný účet, přidělit právě jednu klubovou roli a potřebnou vazbu. Pro rodiče explicitně ověřit vazbu na konkrétní dítě; roli PARENT bez vazby nepovažovat za přístup k hráčům. |
| Soutěž | Založit soutěž/sezónu, vlastní týmy a soupeře. Uložit bodování, remízu/kontumaci a pořadí kritérií shody. Nová verze pravidel vyžaduje řízený přepočet. |
| Statistiky | Přidat název, sport, datový typ, jednotku, validaci a povolenou agregaci. Formulář výsledků používá tuto konfiguraci. Historickou definici přejmenovat novou verzí; nepřepsat typ starých hodnot. |
| Příspěvky | Vystavit členovi předpis s částkou, měnou a splatností. Po skutečné úhradě zaznamenat platbu a rozdělit ji na předpisy. Zůstatek i částečný stav se počítají automaticky. Opravu provést stornem s důvodem, poté správným zápisem. |
| Upozornění na splatnost | Nastavit předstih. Ve vlastní notifikační schránce vidět nezaplacené položky před i po splatnosti; stejný typ upozornění dostane i příslušný člen/jeho zástupce. |
| Historie | Vybrat minulou sezónu pro výsledky/statistiky/členství. Archivace zachová data; oprava potřebuje důvod a nový výpočet, běžné mazání historie není postup. |

Administrátor používá vlastní schránku notifikací a vlastní konverzace; administrátorská role sama neopravňuje číst soukromé rozhovory ostatních. Technické nasazení, HTTPS, zálohy a obnova jsou samostatný postup v [nasazení](deployment.md).

## Trenér — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** Trenér pracuje pouze s přiřazenými týmy a povolenými sezónami. Chybějící tým v přehledu řeší s administrátorem; znalost jeho ID přístup nepřidá.

1. Vybrat přiřazený tým a sezónu, prohlédnout svěřence bez nepotřebných osobních/finančních údajů.
2. V kalendáři vytvořit trénink, zápas nebo jinou událost s místem, časem a uzávěrkou dostupnosti. U zápasu určit soupeře a soutěž, pokud jde o soutěžní zápas. Publikovat a rozeslat systémovou notifikaci.
3. Prohlédnout dostupnost zadanou hráči či rodiči. Vybrat nominované a náhradníky a nominaci publikovat. Dostupnost není nominace; nominace nezakládá skutečnou účast.
4. Po začátku akce zapsat skutečnou docházku včetně nepřítomnosti/omluvy a případných minut. Nedostupnost či nominace nesmějí automaticky vyplnit docházku.
5. Po zápasu zadat skóre a individuální hodnoty podle administrátorských definic. Chyba typu/rozsahu se zobrazí u hodnoty a potvrdí se až platný výsledek. Tabulka a agregace se spočítají ze skutečně potvrzených výsledků.
6. V samostatných **Konverzacích** komunikovat s hráči a oprávněnými rodiči. V **Notifikacích** číst automatické informace. Pro archivované sezóny používat povolené historické přehledy.

Trenér nespravuje role, rodičovské vazby ani konfigurace statistik/bodování a nezapisuje platby členů. U společné události několika týmů je změna povolená jen při oprávnění ke všem dotčeným týmům; jinak ji provede admin.

## Hráč — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** Administrátor spojí PLAYER účet s jedním hráčským profilem. Role sama členství v týmu nevytvoří.

1. Vybrat vlastní tým a kalendář. U události do uzávěrky označit **Mohu přijít**, **Nemohu přijít** nebo **Nevím**, případně přidat omluvu. Změna se týká pouze vlastního profilu.
2. Po publikování nominace ověřit, zda je hráč nominovaný nebo náhradník. Potvrzená dostupnost sama nezaručuje nominaci.
3. Zobrazit vlastní skutečnou docházku, výsledky, statistiky a minulou sezónu. Výsledky ani vlastní statistiky hráč ručně neopravuje; nepřesnost sdělí trenérovi v konverzaci.
4. V **Příspěvcích** prohlédnout vlastní předpisy, splatnosti, zaúčtované úhrady a zbývající částku. Platbu provést mimo systém podle pokynů klubu; administrátor ji po ověření zaznamená. Aplikace nemá online platební bránu.
5. V **Notifikacích** číst změny událostí/nominace/splatnosti a označovat je přečtené. V **Konverzacích** psát trenérovi či dalším oprávněným účastníkům vlastního týmového kontextu.

Účet nesmí měnit dostupnost spoluhráče ani číst jeho finanční údaje. Při přestupu zůstane vlastní minulá sezóna dohledatelná, další interní obsah bývalého týmu se nezpřístupňuje.

## Rodič / zákonný zástupce — plánované pracovní postupy

**Stav: E1–E6, dosud neimplementováno.** PARENT účet získá přístup až po explicitním ověření vztahu administrátorem. Jedna osoba může zastupovat více dětí; nezletilé dítě nepotřebuje vlastní přihlašovací účet.

1. V přehledu **Moje děti** vybrat dítě se schválenou vazbou. Pokud dítě chybí, požádat administrátora o ověření vazby; registrace dítě automaticky nedohledává podle jména.
2. Otevřít jeho týmový kalendář a potvrdit dostupnost/omluvu jménem dítěte. UI vždy jasně ukazuje, za které dítě rodič jedná. U nominace prohlédnout trenérův výběr, nevytvářet jej.
3. Prohlédnout jeho skutečnou docházku, individuální statistiky a historii sezón. Rodič výsledky ani docházku nepřepisuje.
4. V **Příspěvcích dítěte** zobrazit částku/splatnost, částečné úhrady a zůstatek. Platbu uskutečnit mimo aplikaci, příslušné zaúčtování provede admin. Při upozornění na nedoplatek se případná nezaznamenaná platba řeší s adminem.
5. Číst své notifikace a komunikovat s trenérem ve vlastní oprávněné konverzaci. Při více dětech v různých týmech se kontexty nepletou a cizí rodičovská vazba nezakládá přístup.

Po ukončení nebo odebrání vazby další přístup k dítěti skončí, i když je účet stále přihlášený. Předchozí notifikace ani uložený odkaz nesmějí toto omezení obejít.

## Chyby a pomoc

| Situace | Postup nyní / v budoucí doméně |
| --- | --- |
| Nepřihlášený nebo vypršená session | Přihlásit se znovu; změnu s neověřeným výsledkem neopakovat automaticky. |
| API je nedostupné | Ověřit backend/DB podle README, použít Zkusit znovu; nepovažovat chybu za důkaz odhlášení. |
| Zamítnutý přístup | V plánované doméně ověřit roli, tým a vztah k dítěti s adminem; úprava URL ani opakovaná registrace nepomůže. |
| Souběžná změna | Obnovit aktuální nominaci/předpis, porovnat změnu a znovu ji vědomě potvrdit. |
| Nesprávná statistika/docházka | V plánované doméně kontaktovat příslušného trenéra; historie se opravuje novou revizí. |
| Platba není zaznamenaná | V plánované doméně kontaktovat administrátora s referencí skutečné platby, nesdílet bankovní přihlašovací údaje. |

Technické problémy v týmovém skeletonu zapisujte do issue nového repozitáře s postupem reprodukce, verzí API a chybou. Nezveřejňujte hesla, `.env`, cookies, osobní údaje dětí nebo provozní databázové dumpy. Příručka bude po E6 doplněna o skutečné kontakty provozovatele, produkční URL a ověřené snímky obrazovek.
