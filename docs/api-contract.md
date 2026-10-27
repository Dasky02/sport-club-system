# REST kontrakt: implementované P1 a navazující plán

**E0 + P1:** autentizace, vlastní onboarding, kontext, bezpečný setup a správa sportů níže mají implementaci. P1 je pouze část E1. Všechny týmové, rodičovské/CHILD aktivační, sportovní výsledkové, finanční a komunikační endpointy v dalších sekcích jsou **plánované**. Přítomnost endpointu ani testu nedokládá úspěšný běh; výsledky jsou v [ověření](verification.md). Cílové schéma určují [DBML](sport-club.dbml) a [databáze](database.md).

## Implementované adresování a autentizace

Všechny cesty jsou relativní k `/api`: `/auth/me` znamená `/api/auth/me`. Browser používá `NEXT_PUBLIC_API_URL=http://localhost:8080/api`; Spring controller mapping nepřidává další servlet prefix.

| Metoda a cesta | Odpověď / chování |
| --- | --- |
| `GET /auth/csrf` | 200 `{token,headerName,parameterName}`; session CSRF, hlavička X-CSRF-TOKEN |
| `POST /auth/register` | `{username,password}` → 201 UserResponse; USER/STANDARD/PENDING, bez přihlášení a dalších vazeb |
| `POST /auth/login` | `{username,password}` → 200 UserResponse, změna session ID |
| `GET /auth/me` | 200 UserResponse aktuálního povoleného STANDARD účtu; jinak 401 |
| `POST /auth/logout` | 200 bez těla; invalidace session a odstranění cookie |
| `GET /info/version` | 200 `{version}` |
| `GET /info/release-notes`, `/info/terms-of-service`, `/info/privacy-policy` | 200 `{content}` |
| `GET /actuator/health` | Minimální veřejný health |

Username má 3–50 znaků, heslo 6–72 znaků a současně nejvýše 72 UTF-8 bajtů. Request neuděluje role, typ účtu ani person ID. P1 UserResponse obsahuje explicitně nullable personId a nikdy hash, legacy_role nebo setup token:

```json
{"id":"00000000-0000-0000-0000-000000000001","username":"clen","role":"USER","accountType":"STANDARD","personId":null,"profileState":"PENDING","createdAt":"2026-10-27T10:00:00Z"}
```

`profileState` je odvozené PENDING/COMPLETE, nikoli DB role. V2 převádí staré role COACH/PLAYER/PARENT na USER a zachovává ADMIN. UUID, BCrypt a časy zůstávají. Dočasně nullable users.person_id dovolí onboarding bez vymyšlených jmen; NOT NULL přijde po pozdějším ověřeném backfillu. Registrace zatím nevytváří Person, účet ji doplní následným vlastním POSTem. P1 CHILD i deaktivovaný účet odmítá; jejich vytvoření/aktivace nemá API.

## Implementované P1: vlastní osoba, kontext, setup a sporty

| UI / metoda a cesta | Payload a výsledek |
| --- | --- |
| `/profile`: `GET /me/person` | 200 vlastní PersonResponse; 404, pokud osoba zatím není doplněná |
| `/profile`: `POST /me/person` | `{firstName,lastName,birthDate?,email?,phone?}` → 201 PersonResponse; pouze vlastní STANDARD PENDING účet, vytvoření a propojení pod zámkem |
| `GET /me/context` | 200 AccountContext; i PENDING má prázdné capabilities, ownPlayerId=null a prázdné teamContexts/children |
| `/setup`: `GET /club/setup-status` | COMPLETE STANDARD → 200 `{completed,available,clubName}`; PENDING → 403 PROFILE_INCOMPLETE |
| `/setup`: `POST /club/setup` | `{token}` → 200 nový UserResponse s ADMIN; dokončený enabled STANDARD, nakonfigurovaný správný token, nedokončený setup a žádný dosavadní ADMIN |
| `/admin/sports`: `GET /sports?page=0&size=20` | ADMIN → 200 stránka SportResponse; page >= 0, size 1–100, stabilní řazení code a id |
| `POST /sports` | ADMIN `{code,name}` → 201 SportResponse; active=true |
| `PATCH /sports/{id}` | ADMIN `{name?,active?}` → 200 SportResponse; alespoň jedna změna, kód se nemění |

PersonResponse je `{id,firstName,lastName,birthDate,email,phone}`; poslední tři pole jsou explicitně nullable. Jméno a příjmení jsou povinné, každé nejvýše 100 znaků; birthDate není v budoucnosti, email je volitelný platný text nejvýše 254 znaků a telefon nejvýše 40. P1 nemá následnou editaci osoby ani administrátorské propojování již existující osoby. Opakovaný POST po propojení vrací 409 PROFILE_ALREADY_LINKED.

AccountContext aktuálně neobsahuje žádné budoucí finance, tým nebo dítě. Pro dokončeného ADMIN:

```json
{"accountType":"STANDARD","capabilities":["MANAGE_CLUB","MANAGE_SPORTS"],"ownPlayerId":null,"teamContexts":[],"children":[]}
```

STANDARD/USER a PENDING dostávají capabilities `[]`; dokončení osoby samo klubová práva nezaloží. Server znovu čte aktuální roli, typ a enabled i při staré session. Žádné klientem zaslané capabilities nemají autorizační význam.

`CLUB_SETUP_TOKEN` patří pouze backendu. Prázdná konfigurace znamená available=false a POST 503 SETUP_UNAVAILABLE; chybný token 403 FORBIDDEN, dokončený setup 409 SETUP_ALREADY_COMPLETED. Token jde jen v těle CSRF chráněného POSTu, nikoli v URL, odpovědi, logu, auditu či NEXT_PUBLIC proměnné. V2 s existujícím ADMIN uzavře setup už při migraci; před správou sportů si i tento účet doplní osobu. Nový platný setup atomicky změní roli, dokončení klubu a audit; nesmí uspět dvakrát.

SportResponse je `{id,code,name,active}`. Kód odpovídá `[A-Z][A-Z0-9_]{0,39}`, název je neprázdný a nejvýše 100 znaků. Duplicitní kód vrací 409 DUPLICATE_RESOURCE. Sporty se pouze deaktivují, DELETE ani samostatný GET detail P1 neposkytuje. Seznam vrací všechny aktivní i deaktivované sporty; UI nevymýšlí nepodporované filtrování/sort.

```json
{"items":[],"page":0,"size":20,"totalElements":"0","totalPages":0}
```

P1 neposkytuje `/persons`, `/players`, `/admin/users`, změnu role jiného účtu, person-link, týmy, rodiče, CHILD aktivaci, finance ani jejich capabilities. Tyto cesty níže jsou plánované.

## Společná pravidla a rozšíření navazujících kontraktů

- Zachovat JSON + `JSESSIONID`, Axios `withCredentials`, HttpOnly cookie a Secure v HTTPS produkci. Nevzniká JWT, NextAuth ani druhá autorizace v Next.js.
- Před každým POST/PUT/PATCH/DELETE klient získá nový `/auth/csrf` a pošle token v `X-CSRF-TOKEN`; token necacheuje přes login/logout. Změnové požadavky se při timeoutu ani 403 automaticky neopakují.
- Backend před každým čtením/zápisem ověří účet, typ, aktuální vazby, tým, sezónu a stav. UI capabilities pomáhají navigaci, nepředstavují oprávnění poslané klientem.
- Chybějící/neplatná session → 401; zakázaná změna přístupného objektu/CSRF → 403; cizí nepřístupný objekt → obecná 404 bez potvrzení existence. Výpadek není anonymní session.
- DTO používají camelCase, UUID jako řetězce, datum `YYYY-MM-DD`, okamžik ISO 8601 s offsetem/UTC. Sezóny a lokální časy se vyhodnocují v Europe/Prague.
- JSON `bigint`/BigInteger, všechny `version` a `resultsRevision` jsou desetinné **řetězce**, například `"3"`; JavaScript je nesmí převádět přes nepřesný `number`. Java používá typ odpovídající rozsahu DB, TypeScript wire typ `string`.
- Peníze `numeric(14,2)` a decimal statistiky `numeric(20,6)` jsou řetězce bez exponentu, NaN či Infinity; například `"400.00"`, `"12.500000"`. `integerValue` pro PostgreSQL bigint je také řetězec. Skóre a pořadová čísla typu integer mohou být JSON čísla v rozsahu DB.
- Backend ověří přesnost a meze, nic tiše nezaokrouhlí. Prázdná statistika není nula. Finanční zůstatky, agregace a oficiální pořadí vypočítá server.

### Seznamy a souběh

`GET` seznamy používají `page=0`, `size=20`, nejvýše `size=100`; záporná stránka či neplatná velikost vrátí 400. Filtry a sort mají whitelist; řazení doplňuje stabilní ID. `items` i celkové počty jsou autorizované již v dotazu.

```json
{"items":[],"page":0,"size":20,"totalElements":"0","totalPages":0}
```

Mutace verzovaného agregátu posílá jeho očekávanou `version`; odpověď vrátí novou. DBML má verzi u events, event_participants, matches, competition_seasons, match_formats, statistic_definitions a fee_assessments. Výsledková revize vlastní optimistic version nemá: její změny kontrolují `matches.version`. U tabulek bez sloupce version se verze nevymýšlí; použije se společný zámek klubu a kontrola stavu. Další optimistic sloupce by vyžadovaly výslovnou migraci.

### Chybová odpověď

P1 zachovává `timestamp`, `code`, `message` a volitelné `details: string` a přidává volitelné strukturované `fieldErrors`; původní klient nemusí parsovat text details. Zprávy jsou bezpečné, bez SQL, stack trace, `rejectedValue`, hesel, tokenů, cookies a cizích osobních údajů.

```json
{
  "timestamp":"2026-10-27T10:00:00Z",
  "code":"VALIDATION_ERROR",
  "message":"Zkontrolujte vyplněné údaje.",
  "details":"Některá pole nejsou platná.",
  "fieldErrors":[{"field":"birthDate","code":"INVALID_VALUE","message":"Datum narození nesmí být v budoucnosti."}]
}
```

P1 používá PROFILE_ALREADY_LINKED, DUPLICATE_RESOURCE a SETUP_ALREADY_COMPLETED; ostatní doménové 409 kódy v tabulce jsou plánované. Obecný CONFLICT zůstává pro kompatibilitu a neznamená vždy obsazené jméno. P1 dále vrací 403 PROFILE_INCOMPLETE a 503 SETUP_UNAVAILABLE pro vypnutý setup.

| HTTP 409 code | Význam / reakce UI |
| --- | --- |
| `OPTIMISTIC_LOCK_CONFLICT` | Zastaralá verze; zachovat rozepsaná data a nabídnout nové načtení |
| `DUPLICATE_RESOURCE` | Duplicitní jméno/kód či jedinečná dvojice; případné fieldErrors |
| `PROFILE_ALREADY_LINKED` | Účet/osoba/profil již propojen; žádné automatické připojení jiné identity |
| `MEMBERSHIP_OVERLAP` | Překryv stejného hráče/trenéra a sezónního týmu |
| `HISTORY_CONFLICT` | Změna by zneplatnila historickou nebo nevyřešenou budoucí účast |
| `CONFIGURATION_LOCKED` | Použitý formát, pravidla či význam statistiky nelze přepsat |
| `RESULT_BASE_CONFLICT` | Oprava nenavazuje na aktuální finální výsledkovou revizi |
| `PAYMENT_ID_CONFLICT` | Stejné UUID úhrady použité pro jiný obchodní payload |
| `PAYMENT_EXCEEDS_BALANCE` | Úhrada by překročila aktuální zůstatek |
| `SETUP_ALREADY_COMPLETED` | Jednorázové převzetí správy již proběhlo |
| `CHILD_ACTIVATION_CONFLICT`, `STATE_CONFLICT` | Chybí aktuální podmínka aktivace, případně jiný nepovolený přechod stavu |

Neplatný vstup/typ/rozsah → 400 `VALIDATION_ERROR` nebo `BAD_REQUEST`; nepovolená činnost → 403 `FORBIDDEN`. Kódy konfliktů ani jejich detaily nesmějí předcházet kontrole přístupu.

## Plánované rozšíření kontextu P2–P9

Po dodání skutečných vazeb se do AccountContext přidají povolené teamContexts, vlastní player a děti. Teprve s finančním API vznikne například READ_OWN_FEES; **P1 tuto schopnost nevrací**. STANDARD rodič bude mít jen schválené děti jako `{playerId,displayName,capabilities}`, trenér jen skutečně přiřazené týmy. Konkrétní DTO se dodá s backendem a frontendem příslušné etapy.

Plný CHILD kontext patří P3: jen vlastní povolené sportovní/komunikační schopnosti, žádné ADMIN/trenérství/rodičovství nebo finance. Dítě se aktivuje až s vlastním hráčským profilem a schváleným enabled STANDARD rodičem; ztráta poslední vazby zablokuje účet a invaliduje session. V P1 jsou všechny CHILD účty odmítnuté. Cílové NOT NULL pro person_id vyžaduje pozdější samostatnou migraci; nynější registrace a vlastní POST/onboarding se nemění potichu na jiný kontrakt.

## Plánované dokončení E1: P2/P3 členové, účty a týmy

Všechny následující řádky jsou **k implementaci**, nikoli záruka dostupnosti. ADMIN spravuje klub; ostatní čtou pouze povolený rozsah. Autorství, systémové časy a audit doplňuje server.

| UI | Plánované API a oprávnění |
| --- | --- |
| `/admin/people`, `/admin/players` | `/persons`, `/players`; ADMIN vytvoří Person a případně player_profile, hráč vyžaduje birthDate; bez povinného účtu či rodiče |
| `/admin/accounts` | `POST /admin/users {personId,username,password,accountType}` na ověřenou existující Person bez účtu; vzniká USER, CHILD enabled=false |
| Propojení starého neúplného účtu | ADMIN `POST /admin/users/{userId}/person-link {personId}`; pouze účet s personId=null a ověřená existující Person bez účtu, atomicky pod zámkem a s auditem; zachová UUID účtu |
| Správa účtu | `PATCH /admin/users/{userId}/role`, `/account-type`, `/enabled`; `POST /admin/users/{userId}/activate` pro kontrolovanou CHILD aktivaci |
| `/admin/seasons`, `/admin/teams` | ADMIN CRUD `/seasons`, `/teams`, `/team-seasons`; správa sportů už je vymezená v P1 výše; např. team DTO `{sportId,name,isClubTeam}`, sezónní tým `{teamId,seasonId,displayName}` |
| `/teams`, `/teams/[teamSeasonId]` | Scoped `GET /team-seasons`, `GET /team-seasons/{id}/players`; ADMIN spravuje `/team-seasons/{id}/player-memberships` a `/coach-memberships` |
| `/my-children`, `/my-children/[playerId]` | STANDARD `GET /me/children`, `GET /me/children/{playerId}`; pouze schválené děti, žádný libovolný guardianId filtr |
| Rodičovská vazba | ADMIN `PUT /players/{playerId}/guardians/{guardianPersonId}`, `POST .../revoke`; identita je složený PK, žádné vymyšlené guardianLinkId |

Self-person onboarding nepřijímá cizí personId, roli, typ účtu, hráčské členství ani rodičovskou vazbu a neslučuje osoby podle jména/emailu. Existující Person propojuje pouze ADMIN po ověření; použitou identitu nelze přesunout na jiného člověka. `person-link` nesmí přepsat nenulové personId ani obejít podmínky CHILD; zkontroluje souběžné propojení, aktuální stav účtu a zapíše audit bez kopií osobních údajů. U osob je email volitelný a není jedinečný.

Při administrátorském založení účtu předá správce heslo bezpečně mimo aplikaci oprávněné osobě; heslo není v URL, odpovědi, auditu ani logu. Neexistuje invite/reset-token tabulka, proto se neslibuje pozvánkový mechanismus nebo automatický e-mail. CHILD aktivace ověří vlastní hráčský profil a nejméně jednu neodvolanou schválenou vazbu na enabled STANDARD účet rodiče; dítě a rodič mají oddělené session.

Členství posílá `{playerId|coachUserId,validFrom,validTo}`; interval je `[validFrom,validTo)`, null konec znamená konec sezóny. Jeden ADMIN si může přiřadit sebe jako trenéra. Přestup zachová historii a transakčně vyřeší neplatné budoucí účasti.

## E2 — události, účast a notifikace

| UI | Plánované API |
| --- | --- |
| `/calendar`, `/events/[eventId]` | Scoped `GET /events?teamSeasonId&from&to&type`, `GET /events/{id}`; typ TRAINING/MATCH/OTHER, stav DRAFT/PUBLISHED/CANCELLED/COMPLETED |
| Vytvoření/editace akce | ADMIN nebo trenér všech dotčených týmů: POST/PATCH `/events`, POST `/events/{id}/publish`, `/cancel`; skutečná pole title,description,startsAt,endsAt,location,availabilityDeadline,seasonId,type a teamSeasonIds |
| Dostupnost na detailu | Vlastní hráč nebo STANDARD rodič: `PUT /events/{id}/participants/{playerId}/availability {version,availability,availabilityComment}`; UNKNOWN/AVAILABLE/UNAVAILABLE |
| Nominace | ADMIN/trenér: `PUT /events/{id}/nomination` s verzovanými účastníky, `POST .../nomination/publish` s verzí akce; NOT_SELECTED/SELECTED/RESERVE |
| Docházka | ADMIN/trenér: `PUT /events/{id}/participants/{playerId}/attendance {version,attendance,attendanceComment,played}`; PRESENT/ABSENT/EXCUSED/LATE, played jen MATCH |
| `/notifications` | `GET /notifications`, `/notifications/unread-count`, `GET /notifications/{notificationId}`, `POST /notifications/{notificationId}/read` → 204 |

Účast má PK `(event_id,player_id)`; každá změna řádku kontroluje jeho version a smí měnit jen příslušná pole. Nezapsaná hodnota je null, nikoli UNKNOWN/NOT_SELECTED/false. Docházka se neodvozuje z dostupnosti ani nominace; played=true vyžaduje PRESENT/LATE. Koncepty a nepublikovanou nominaci hráč/rodič nevidí.

`notification_deliveries` má PK `(notification_id,recipient_id)`, nemá deliveryId. Recipient přečtení se bere výhradně ze session; klient jej neposílá. Opakované read je bezpečně 204 a zachová první readAt. CHILD nedostane FEE_DUE_SOON/FEE_OVERDUE ani jejich počty; otevření cíle starého oznámení nepřeskakuje aktuální autorizaci.

## E3 — soutěže, výsledkové revize a dynamické statistiky

| UI | Plánované API |
| --- | --- |
| `/admin/match-formats`, `/admin/competitions` | ADMIN `/match-formats`, `/competitions`, `/competition-seasons`, jejich `/point-rules`, `/forfeit-rules`, `/ranking-criteria`; H2H politika v DTO ročníku |
| `/competitions/[competitionSeasonId]` | Scoped `/competition-seasons/{id}/matches`, `/standings`; rows, resultsRevision a vysvětlení použitých kritérií vrací backend |
| `/matches/[eventId]/result`, `/history` | `/matches/{eventId}/result-revisions`, `/.../{revisionId}/confirm`, `/annul`; očekávaná matchVersion, supersedesRevisionId a correctionReason při opravě |
| `/admin/statistic-definitions` | ADMIN `/statistic-definitions`, `/.../{id}/versions`; name,valueType,aggregation,unit,minValue,maxValue podle DBML |
| Hráčské/týmové statistiky | Scoped `/players/{id}/statistics`, `/team-seasons/{id}/statistics`, filtry sezóny; hodnoty jsou součástí návrhu výsledkové revize |

Zápas má PK `matches.event_id`, nikoli nové matchId. DRAFT revize je upravitelná; CONFIRMED/ANNULLED a jejich historická data se nepřepisují. Při částech backend odvodí skóre; nebere druhý nezávislý součet. Potvrzení ověří sport, formát, stav akce, snímek účasti a pravidla, atomicky přepne aktivní revizi a resultsRevision. Archivované opravy smí jen ADMIN s důvodem.

Statistika obsahuje `{playerId,statisticDefinitionId,statisticDefinitionVersionId}` a právě jednu hodnotu integerValue/decimalValue/booleanValue/textValue. Platí INTEGER/DECIMAL + SUM/AVG/MIN/MAX/COUNT/NONE, BOOLEAN + COUNT_TRUE/COUNT/NONE, TEXT + COUNT/NONE. Hodnota patří skutečně nastoupivšímu hráči dané revize. Použitý význam definice/pravidel je zamčený; nový název vzniká novou verzí, nový význam novou identitou. Fotbal i basketbal používají stejné kontrakty a konfiguraci v DB.

## E4 — příspěvky, platby a přesná idempotence

STANDARD `/fees` používá `GET /me/fees`, detail `/fees/{id}`; rodič `/my-children/[playerId]/fees` používá `/me/children/{playerId}/fees`. ADMIN `/admin/fees` spravuje `/fees` a skutečné platby. CHILD má backendový zákaz seznamů, detailů, exportů, částek, zůstatků i oznámení, včetně vlastních.

`POST /fees/{feeAssessmentId}/payments` přijme `{id,amount,paidOn,reference,assessmentVersion}`. Klient vygeneruje UUID `id` jednou pro zamýšlený zápis; je přímo `fee_payments.id`, nikoli klíč nové idempotency tabulky. Osoba i měna vyplývají z předpisu, recordedBy/recordedAt doplní server.

Pod zámkem a až po autorizaci: nové UUID + platný zůstatek/verze → 201; již existující UUID + shodný obchodní payload `(feeAssessmentId, normalizovaná amount, paidOn, reference)` → 200 se stávající platbou, bez druhého zápisu. Jiný payload → 409 PAYMENT_ID_CONFLICT. Opakování se vyhodnotí před odmítnutím staré assessmentVersion, která není součást obchodního payloadu; nepřepíše ani již stornovanou platbu.

Timeout neznamená neprovedenou platbu: UI ověří `GET /payments/{id}` nebo nabídne vědomé opakování se stejným UUID/payloadem, nikdy automatické nové UUID. `POST /payments/{id}/cancel {cancellationReason,assessmentVersion}` zaznamená cancelledAt/cancelledBy/cancellationReason na existující platbě. Storno nemaže historii a nevrací peníze; nejde o bránu. Součet platných úhrad nepřekročí předpis ani v souběhu.

## E5–E6 — samostatná komunikace a ověření

`/messages` a `/messages/[conversationId]` používají `/conversations`, `/conversations/{id}/messages` a `/participants`. Konverzace má teamSeasonId, title a nejméně dva oprávněné účastníky. Zpráva přijímá pouze `{body}` (1–5000 neprázdných znaků); authorId/sentAt jsou serverové. Aktivní účast i vztah k týmu se ověřují při každém požadavku; ADMIN není automatický čtenář. Čte se až od joinedAt, ukončená účast se znovu neotevírá.

**DBML nemá chat read receipts, message readAt ani lastReadMessageId.** Kontrakt proto nemá `/conversations/.../read`, počty nepřečtených chatových zpráv ani stav „přečteno“. Taková funkce vyžaduje výslovné rozšíření doménového návrhu a novou migraci; readAt existuje pouze u notifikačních doručení.

Akceptace každé etapy ověří skutečné DTO/OpenAPI, CSRF, scoped seznamy/počty, 401/403/404/409, chybové/prázdné/loading stavy a mobilní UI. Povinné jsou solo ADMIN/trenér bez rodičů, STANDARD rodič více dětí, CHILD bez úniku financí a oba sporty bez změny kódu. E3 navíc ověří potvrzení/opravu/anulování a historii; E4 souběh i opakování plateb se stejným UUID. Tento dokument sám žádnou kontrolu neoznačuje za provedenou.
