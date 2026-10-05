# Autentizace a návrh oprávnění

**Stav:** skeleton poskytuje registraci, přihlášení, aktuální účet, odhlášení a technické informace. Klubové role jsou připravené hodnoty účtu. Níže uvedené týmové, rodičovské, finanční a komunikační kontroly jsou **návrh pro navazující implementaci**, nikoli současné klubové API. Přidání role do enumu samo o sobě žádnou doménovou funkci neimplementuje.

## Přihlašovací základ

Zachovává se `User`, `UserRepository`, `UserService` jako `UserDetailsService`, BCrypt a JSON login ze šablony. Spring udržuje session `JSESSIONID`; Next.js používá credentials a CSRF token při měnících požadavcích. Přihlášení rotuje identifikátor session a uloží security context, odhlášení invaliduje session a odstraní cookie. Produkční cookie je HttpOnly, Secure přes HTTPS a s vhodným SameSite. Nezavádí se HTTP Basic, JWT ani druhá autentizace na frontendu.

Veřejné informační endpointy a registrace nevyžadují klubovou roli. Registrace vytváří `USER` bez přístupu ke klubovým datům. Server nebere `role`, `playerId`, `teamId` ani `guardianLinks` z registračního requestu jako oprávnění. Změny klubových rolí a vztahů budou vyhrazené administrátorovi, auditované a nesmějí být v přihlášení/autoregistraci.

Chybějící/neplatná session vrací JSON 401, nedovolená operace JSON 403 ve formátu centrálního handleru. Čtení cizího nepřístupného doménového objektu vrací 404, aby neprozradilo jeho existenci. Přístupné objekty s nepovolenou změnou vracejí 403. Neplatný CSRF token vrací 403 i pro jinak přístupnou změnu. CORS pouze vymezuje povolené origins, není autorizační pravidlo.

## Klubové role

Účet má v současném modelu právě jednu roli. `ADMIN` má explicitní administrátorská oprávnění v rámci tohoto jediného klubu; nemusí mít duplicitní trenérskou roli. `USER` je technická role pro nepřiřazený účet a není pátá klubová role. Příručka pokrývá čtyři klubové role: [administrátor, trenér, hráč, rodič](user-guide.md).

| Operace finální aplikace | ADMIN | COACH | PLAYER | PARENT |
| --- | --- | --- | --- | --- |
| Správa sportů, sezón, týmů, profilů a soutěží | Ano, klub | Ne; vlastní kontaktní údaje mohou mít samostatnou operaci | Jen povolená pole vlastního profilu | Jen povolená kontaktní pole vlastního účtu, dítě dle schválené vazby |
| Přidělení role, vazby účtu/hráče, vazby rodiče, členství | Ano, s auditem | Ne | Ne | Ne, může nejvýše požádat o vazbu |
| Týmový kalendář | Ano | Přiřazené týmy/sezóny | Týmy vlastního členství | Týmy schválených dětí |
| Vytvoření a změna události | Ano | Všechny dotčené týmy musejí být přiřazené trenérovi | Ne | Ne |
| Dostupnost/omluva hráče | Ano s důvodem | Hráč v přiřazeném týmu s důvodem | Jen vlastní profil | Jen explicitně schválené dítě |
| Vytvoření a publikování nominace | Ano | Přiřazený tým a hráči tohoto týmu k datu události | Ne | Ne |
| Zápis skutečné docházky | Ano | Přiřazený tým a platný účastník | Ne | Ne |
| Zápis a potvrzení výsledku a statistik | Ano | Zápas přiřazeného týmu v otevřené sezóně | Ne | Ne |
| Soutěžní tabulky a agregované týmové statistiky | Ano | V kontextu přiřazených týmů | V kontextu vlastních týmů | V kontextu týmů dětí |
| Individuální historie hráče | Ano | Pouze oprávněný tým/sezóna, bez cizích osobních dat | Vlastní profil | Schválené dítě |
| Definice individuálních statistik, bodování a kritérií shody | Ano | Ne, jen používá platné definice | Ne | Ne |
| Čtení příspěvků a plateb | Všichni členové klubu | Jen vlastní předpisy, žádné finanční údaje svěřenců | Vlastní předpisy | Předpisy schváleného dítěte |
| Zápis předpisu, platby, alokace nebo storna | Ano s auditem | Ne | Ne | Ne |
| Čtení notifikace/označení přečtení | Pouze vlastní schránka | Pouze vlastní schránka | Pouze vlastní schránka | Pouze vlastní schránka |
| Čtení/odeslání zprávy | Jen vlastní konverzace; role nedává vstup do soukromých zpráv | Účastník a odpovídající týmový kontext | Účastník v kontextu vlastního týmu | Účastník v kontextu týmu svého dítěte |
| Řízená oprava archivované sezóny | Ano s důvodem, novou revizí a přepočtem | Ne | Ne | Ne |

Matice není seznam implementovaných endpointů. Rozhodující je kombinace **role + vztah k objektu + čas + stav**, ne pouhá kontrola role.

## Kontrola objektu na serveru

Každá service operace nejdříve získá účet z `SecurityContext`, potom načte objekt dotazem omezeným povoleným rozsahem a ověří invariants před změnou v téže transakci. Clientem zaslané ID určuje cíl, nikdy identitu aktéra. Autor záznamu, účet rodiče a trenérova příslušnost se odvozují na serveru. DTO nepřijímá pole jako `recordedBy`, která by změnila vlastnictví.

1. **Hráč:** najdi `player_profiles.user_id = currentUser.id`; ověř jeho členství v týmu k datu události a případnou uzávěrku. Cizí `playerId` odmítni i když hráči patří stejnému týmu. Po přestupu má hráč vlastní historii, ale žádné nové soukromé informace původního týmu.
2. **Rodič:** ověř roli `PARENT`, ověřený `guardian_link` platný dnes a profil dítěte. Potom ověř členství dítěte k datu cílové události. Zaniklá či neověřená vazba nedává přístup ani k historii. Pro historické dítě musí vazba opravňovat k aktuálnímu čtení a členství dítěte být platné v dotazovaném období.
3. **Trenér:** spoj účet s `coach_profile` a ověř aktuální přiřazení k relevantnímu týmu. Pro změnu události s více týmy musí mít oprávnění ke všem dotčeným týmům; pokud je nemá, operaci provede admin. Čtení archivované sezóny vyžaduje zároveň přiřazení k týmu v dotazované sezóně; nově přijatý trenér nezíská automaticky osobní historii minulých sezón. Ukončené přiřazení neposkytuje další přístup.
4. **Admin:** prověř roli i stav operace. Bypass týmového rozsahu není bypass validace, CSRF, historie, finančních limitů ani pravidla soukromých konverzací. Změny role, vazby rodiče, platby a archivované opravy mají povinný audit.
5. **Komunikace:** při každém list/read/send ověř aktivní účastnictví v konverzaci a aktuální oprávnění k týmovému kontextu. Znalost conversation/message UUID ani historický zápis do participants nestačí po zániku vztahu. Přidat cizího rodiče do konverzace bez dítěte v týmu není možné.
6. **Notifikace:** dotaz vždy obsahuje `recipient_id = currentUser.id`. Otevření cílového objektu se autorizuje znovu; původní notifikace nedává trvalý přístup ke zrušené vazbě. Po zániku vazby nevracej citlivý text doručení vztahující se k cizímu dítěti/týmu.

Listy, hledání, exporty, počty výsledků i stránky detailu používají stejné filtrování. Nefiltruje se teprve po načtení všech klubových záznamů do frontendu. DTO vrací jen povolená pole: týmový kalendář nepotřebuje datum narození či telefon všech hráčů. Finanční stav se nevrací ve všeobecném hráčském seznamu.

Session obsahuje nejméně identitu, ale role a citlivé vazby se ověřují čerstvě. Administrátorské odebrání role musí invalidovat všechny session dotčeného účtu nebo ověřit aktuální roli z DB při každém privilegovaném requestu; samotné staré `GrantedAuthority` v session nestačí. Změna rodičovské vazby a členství musí platit okamžitě při dalším requestu. Kontrola verze zabraňuje přepsání souběžné nominace či dostupnosti.

## Negativní akceptační scénáře navazujících etap

Tyto scénáře musejí vzniknout jako backend integrační testy nad Testcontainers a jako odpovídající frontend testy chybových stavů. Před dokončením dané etapy jsou to **plánované testy**, nikoli výsledky skeletonu.

| ID | Pokus | Očekávaný výsledek |
| --- | --- | --- |
| A01 | Registrovat `role: ADMIN` nebo zadat vlastní vazbu na hráče | Účet pouze USER, bez klubových vazeb; žádná eskalace |
| A02 | USER zkusí libovolný klubový seznam | 403, žádná klubová data |
| A03 | Hráč A změní dostupnost hráče B změnou UUID | 404 nebo 403 dle viditelnosti objektu; nulová změna a žádný outbox |
| A04 | PARENT bez vazby / s neověřenou či ukončenou vazbou otevře dítě | 404, nezveřejnit profil, příspěvky, historii ani počty |
| A05 | Rodič dítěte A získá fee/payment UUID dítěte B | 404, žádné finanční údaje |
| A06 | Trenér týmu A publikuje nominaci týmu B | 404/403, nulový zápis; role COACH sama nestačí |
| A07 | Trenér A změní společnou událost týmů A+B bez přiřazení k B | 403, transakce neprovede částečnou změnu |
| A08 | Ukončený trenér použije stále platnou session | Nový přístup odmítnut; aktuální přiřazení se ověřuje na serveru |
| A09 | Hráč nebo rodič zapíše platbu, výsledek, docházku či nominaci | 403, finanční/doménový stav beze změny |
| A10 | Trenér načte příspěvky svěřence | 404, trenér vidí jen své vlastní předpisy |
| A11 | Účastník A čte cizí konverzaci nebo přidá neoprávněného rodiče | 404/403; admin také nečte soukromou konverzaci bez účasti |
| A12 | Uživatel označí cizí notifikaci jako přečtenou | 404, cizí `read_at` beze změny |
| A13 | Rodiči zanikne vazba po vydání notifikace a zkusí cílový detail | 404; historické doručení neobchází autorizační kontrolu |
| A14 | Dva admin požadavky současně alokují tutéž platbu | Jedna uspěje, druhá 409/validace; čistá suma nepřekročí platbu/předpis |
| A15 | Trenér mění archivovanou sezónu nebo změněnou verzi nominace | 403, respektive 409; historie se nepřepisuje |
| A16 | Admin odebere COACH roli, uživatel použije starou session | Další privilegovaný request je odmítnut, i při původní session autoritě |
| A17 | Chybí CSRF, žádná session, nepovolený origin | 403 pro CSRF, 401 pro autentizaci, origin nedostane povolený credentialed CORS; žádný zápis |
| A18 | Zápis statistiky cizího sportu nebo hráče bez skutečné účasti | 400/409 podle validace; žádná statistika a žádný přepočet |

Pozitivní protějšky musejí ověřit rodiče se dvěma dětmi v různých týmech, hráče bez účtu spravovaného rodičem, trenéra přiřazeného více týmům a admina, který může oprávněně provést klubovou správu. Při akceptaci je třeba také ověřit mobilní rozhraní, že po 401 přechází na přihlášení, po 403/404 ukazuje srozumitelnou chybu a při výpadku API neoznačuje účet za běžně odhlášený.
