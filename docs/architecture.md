# Architektura technického základu a P1

## Implementovaný rozsah E0 + P1

Monorepo: `backend/` je Spring Boot 4/Java 17 s původním package `cz.jpmad.springprojecttemplate`; `frontend/` je samostatný Next.js App Router/TypeScript. PostgreSQL 16 má po V2 účty, osoby, klub, audit a sporty. P1 pokrývá vlastní onboarding, jednorázový setup a správu sportů, nikoli celou E1 nebo klubovou aplikaci. Kořen uchovává VERSION, LICENSE, Compose a týmové materiály. Business logika a autorizace zůstávají ve Springu. Žádný NextAuth, JWT, OAuth, Redis nebo mikroservisy nejsou potřeba.

```mermaid
flowchart LR
  Browser[Prohlížeč / Next UI] -->|JSON + session cookie + CSRF| API[Spring REST /api]
  API --> Services[service / UserDetailsService / InfoService]
  Services --> Repositories[repository / JPA]
  Repositories --> DB[(PostgreSQL 16)]
  Flyway[Flyway V1 + V2] --> DB
  Version[Kořenový VERSION] -->|Maven resources| JAR[Backend JAR / classpath VERSION]
```

Zachované vrstvy `api`, `config`, `model`, `repository`, `service` používají constructor injection a DTO records. `User` má UUID, BCrypt passwordHash, USER/ADMIN, typ STANDARD/CHILD, enabled, dočasně volitelný person a auditní časy. Veřejná registrace stále přijímá jen username/password a vytváří USER/STANDARD s PENDING osobou. GET/POST `/me/person` umožní vlastní údaje doplnit; nepřipojuje existující cizí osobu. Obecná správa účtů, rolí a person-link dosud nemá API.

P1 načítá aktuální účet i při použití existující session. Neúplný účet nemá klubový rozsah; deaktivovaný účet a CHILD jsou blokované. Podmínky aktivace CHILD a odvozená týmová/rodičovská oprávnění přijdou v P2/P3. `/me/context` vrací bez klubových vazeb prázdné schopnosti a dokončenému ADMIN pouze MANAGE_CLUB/MANAGE_SPORTS. Frontend poskytuje `/profile`, `/setup` a `/admin/sports` nad skutečným API. Capabilities nejsou vstupem, kterým si klient může přidělit oprávnění.

Setup vyžaduje dokončenou vlastní osobu a soukromý `CLUB_SETUP_TOKEN`; prázdný jej vypíná. Pod zámkem klubu proběhne jediné převzetí a audit. Po setupu má tentýž účet ADMIN, ale zatím žádné trenérské přiřazení. Správa sportů zahrnuje stránkovaný seznam, vytvoření a změnu názvu/aktivního stavu, stabilní kód a žádné mazání.

## Session a chyby

API klient používá `withCredentials`. Před každou mutací načte `GET /api/auth/csrf` a jeho token předá v `X-CSRF-TOKEN`. Token je uložen v HTTP session a klient dostává maskovanou hodnotu pro standardní XOR ochranu Spring Security. Přihlášení volá session authentication strategy (změna session ID a zrušení starého CSRF tokenu) a explicitně ukládá security context. Token se proto získává znovu i po přihlášení/odhlášení. Mutace se při chybě neopakují automaticky.

`POST /api/auth/logout` obsluhuje jediný Spring Security logout filter: invaliduje session, smaže kontext i cookie JSESSIONID na cestě /api. Paralelní logout controller, HTTP Basic a remember-me jsou odstraněné; není zaveden limit souběžných sessions. Odpovědi controllerů i security filtrů používají tvar `timestamp`, `code`, `message`, volitelně `details`. 401 znamená nepřihlášeného nebo neplatné údaje; 403 odmítnutou akci nebo CSRF. Frontend rozlišuje anonymní stav a nedostupnost serveru, při selhání logoutu netvrdí úspěšné odhlášení.

Cookie je HttpOnly a SameSite=Lax. Výchozí backend konfigurace je Secure=true, dev profil a lokální Compose Secure=false; HTTPS override nastavuje true. Produkční nasazení má UI a API pod jednou doménou. CORS čte explicitní seznam origins z prostředí, žádná wildcard s credentials; servlet context-path /api není součást controller mappingu ani security matcheru. Veřejné jsou CSRF/login/register, info, dokumentace API a minimální actuator health. `me` vyžaduje session, ostatní Actuator endpointy ADMIN.

## Databáze a verze

V1 zůstává beze změny. V2 přidává `persons`, `club`, `audit_log` a `sports`, rozšiřuje users a převádí staré role při zachování UUID, hashů a časů. Původní role se uchová v neveřejném `legacy_role`; COACH/PLAYER/PARENT se převedou na USER bez domyšlených vazeb. Existující ADMIN zůstává a migrace uzavře bootstrap. `person_id` je přechodně NULL; žádná falešná jména se nevytvářejí. NOT NULL vyžaduje pozdější samostatný ověřený backfill. Dalších 33 doménových tabulek DBML není implementovaných.

Flyway je aktivní ve vývoji, testech i produkci; baseline-on-migrate není zapnutý a Hibernate ddl-auto=validate. Dev profil nezakládá žádný default účet. Jediným zdrojem app verze je kořenový VERSION, přibalený do JAR pomocí Maven resources; ruční kopie v backend resources neexistuje. InfoService zachovává renderování Markdownu a `info.cacheTtlMs`. Provedené běhy patří do [ověření](verification.md), tento popis nezaručuje jejich výsledek.

## Navazující architektura — návrh, dosud neimplementováno

Jednotlivé domény rozšiřují stejné vrstvy. Autorizační pravidla běží v transakčních službách a omezují také dotazy podle týmu a vztahu rodič–hráč. Schránkové notifikace a doručení se zapisují transakčně s doménovou změnou, splatnosti hlídá idempotentní scheduler; komunikace má vlastní konverzace a zprávy. Výsledky a agregace používají verzovaná pravidla soutěže, statistiky mají administrátorské datové definice. Jedna instalace podporuje více sportů, každý tým má právě jeden sport. Účty hráčů a rodičů jsou volitelné; samostatný trenér může být jediným uživatelem se správou instalace. Dětské přihlášení vyžaduje schváleného rodiče a typ CHILD s výslovným zákazem financí. Podrobnosti v [doménovém modelu](domain-model.md), [databázovém modelu](database.md) a [autorizaci](authorization.md).

Frontendová ochrana dashboardu je navigační pomoc; skutečné oprávnění ověřuje server. Doménový ERD není již nasazené schéma a roadmapa není seznam hotových funkcí.
