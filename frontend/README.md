# Frontend Sport Club System

Samostatný Next.js App Router frontend v TypeScriptu. Kompletní postup pro databázi, backend, Compose a HTTPS je v [kořenovém README](../README.md) a [dokumentaci nasazení](../docs/deployment.md).

## Lokální spuštění

Požadavky: Node.js **24.14.0** (stejný v `.nvmrc`, CI a Dockeru) a npm. Z kořene repozitáře:

```sh
nvm use
cd frontend
cp .env.example .env.local
npm ci
npm run dev
```

Frontend je na `http://localhost:3000`. Backend musí běžet samostatně. Veřejná proměnná `NEXT_PUBLIC_API_URL=http://localhost:8080/api` je URL používaná prohlížečem, proto nepoužívejte hostname `backend`. Proměnná se vkládá při sestavení: po změně produkční URL je nutný nový build.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm start
```

`next.config.ts` vytváří `standalone` výstup pro vícefázový [Dockerfile](Dockerfile). Backend není potřeba k sestavení frontendu. Používáme lokální systémové fonty, build nestahuje fonty z externích služeb.

## Implementovaný rozsah

- `/`: skutečné volání `/info/version`, dostupnost API, retry po výpadku.
- `/register`: registrace účtu; payload obsahuje pouze uživatelské jméno a heslo. Nový účet má `USER`/`STANDARD`, `personId: null` a `profileState: PENDING`. Registrace nepředstírá aktivní session.
- `/login`: JSON přihlášení pomocí serverové session.
- `/dashboard`: skutečný aktuální uživatel z `/auth/me`, typ účtu, stav profilu a navazující krok podle skutečného `/me/context`; odhlášení.
- `/profile`: přihlášený STANDARD účet doplní vlastní jméno a příjmení; datum narození, e-mail a telefon jsou nepovinné. Po uložení se znovu načte účet, kontext a skutečná osoba z `/me/person`. Dokončené údaje jsou v P1 pouze ke čtení; pokud osoba již existuje, propojení musí ověřit správce, UI osoby neslučuje.
- `/setup`: STANDARD účet s dokončeným profilem ověří stav nastavení a může jednou převzít správu neveřejným instalačním tokenem. PENDING, dokončené nastavení a nenakonfigurovaný token mají zakázané odeslání. CHILD tuto činnost nemá. Token patří pouze do POST těla; pole se při odeslání vymaže, nic se nezapisuje do URL, storage ani veřejné proměnné. Po úspěchu se obnoví role a skutečné schopnosti účtu.
- `/admin/sports`: dokončený STANDARD ADMIN se schopností `MANAGE_SPORTS` načte stránkovaný seznam, přidává, přejmenovává, deaktivuje a znovu aktivuje sporty. Kód je stabilní, normalizuje se na velká písmena a používá `[A-Z][A-Z0-9_]{0,39}`; například FOOTBALL/BASKETBALL jsou hodnoty v DB, nikoli pevný sportovní enum. Žádný DELETE; deaktivace zachová záznam.

Týmy, hráčské profily, rodičovské vazby, aktivace CHILD, události, statistiky, výsledky, příspěvky, komunikace a notifikace jsou **plánované funkce**; nemají fiktivní API ani ovládací prvky předstírající hotovou implementaci. P1 kontext vrací pouze implementované správní schopnosti, prázdné týmové/dětské seznamy a žádný vlastní hráčský profil. Rozsah dalších etap popisuje [pracovní plán](../docs/implementation-plan.md) a [roadmapa](../docs/roadmap.md).

## API a session

Zachovali jsme klienta `src/api/api.ts`, jeho DTO, překlad chyb a `AuthContext` ze šablony. Axios používá `withCredentials: true`. Základní URL již obsahuje `/api`; metody připojují `/auth/...`, `/info/...`, `/me/...`, `/club/...` a `/sports`. Typovaný `mutateWithCsrf` před každým POST/PUT/PATCH/DELETE načte nový token z `/auth/csrf` a odešle jej v `X-CSRF-TOKEN`. Token se necacheuje, změnové požadavky se automaticky neopakují. Operace P1 jsou v `src/api/club.ts`, společné DTO v `src/api/types.ts`.

`AuthProvider` je Client Component. Po obnovení stránky načte `/auth/me` a `/me/context`: **401** znamená anonymní session, zatímco síťová chyba, 403 či 5xx znamená neověřenou session a zobrazí retry. Opožděný účet/kontext nesmí přepsat novější refresh nebo obnovit odhlášenou session. Kontext se obnovuje po doplnění osoby a převzetí správy; PENDING nevyvolává chráněné volání `/me/person`, `/club/setup-status` ani `/sports`.

`AccessGate` nezobrazí chráněný obsah před ověřením; PENDING směřuje k osobním údajům a správa sportů navíc ověří typ, roli i schopnost. Server každou činnost ověřuje znovu a frontendová brána jej nenahrazuje. Selhání odhlášení není prezentováno jako úspěšná invalidace session. JSESSIONID zůstává HttpOnly; hesla ani session tokeny neukládáme do localStorage.

Chyby 409 mají kontextové zprávy, nikoli univerzální text o uživatelském jménu. `fieldErrors` se přiřazují pouze známým polím formuláře; `details`, `rejectedValue` a technický text serveru se nevykreslují. Vstupy při validaci zůstávají vyplněné. Seznam sportů má stránkování od nuly po 20 záznamech a `totalElements` jako přesný řetězec. API stav, empty/error/403 a explicitní opakování GET mají vlastní UI.

Heslo má nejméně 6 znaků a nejvýše 72 UTF-8 bajtů kvůli BCrypt; limit se ověřuje i na backendu. Diakritika může spotřebovat více než jeden bajt na znak.

## Testy

`npm test` spouští Vitest s Testing Library, jsdom a Axios mock adaptérem. Zachovává CSRF/auth regresi a přidává P1 kontrakty, doplnění osoby, obecné/field chyby, chránění PENDING a ADMIN, token bez persistence, obnovu role/kontextu, pozdní auth odpovědi, empty/error/403/retry, stránkování a vytvoření/přejmenování/deaktivaci sportu bez DELETE. Testy jsou v `src/api/*.test.ts`, `src/context/AuthContext.test.tsx` a `src/components/*.test.tsx`.

Testy s mock adaptérem ověřují frontendovou integraci; samotné cookies, CORS a zabezpečení serveru se ověřují také backendovými HTTP integračními testy a Playwrightem nad skutečnou běžící sestavou. Pro Playwright podle [kořenového README](../README.md) nejprve spusťte frontend/backend:

```sh
npx playwright install chromium
npm run test:e2e
```

`e2e/auth.spec.ts` zachovává registraci/login/reload/logout a výpadek API na desktopu i mobilu. `e2e/club-setup.spec.ts` potřebuje samostatnou čistou testovací DB, nakonfigurovaný soukromý setup token a `E2E_SETUP_TOKEN` v testovacím procesu; protože setup je jednorázový, scénář se mezi desktopem a mobilem spouští nad odděleně obnovenou DB. Přesný postup a skutečné výsledky eviduje [ověření](../docs/verification.md). Testovací token nevkládejte do frontend `.env.local` ani `NEXT_PUBLIC_*`.

Přesné verze jsou v `package.json` a `package-lock.json`. Next.js **16.3.8** byl vybrán z podporované [Active LTS řady](https://nextjs.org/support-policy) podle [oficiálního přehledu bezpečnostních vydání](https://nextjs.org/blog); React a React DOM **19.3.0** odpovídají peer dependencies Next.js. Před další etapou znovu ověřte bezpečnostní aktualizace a `npm audit`.

### Historický audit závislostí z 5. 10. 2026

Při přípravě E0 **5. 10. 2026** vrátil `npm audit --omit=dev` **0 známých zranitelností**. Úplný audit po tehdejší aktualizaci tranzitivních závislostí hlásil **5 high** položek ve vývojovém řetězci `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. Šlo o stejnou [chybu braces při hluboce vnořeném globu](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) a její závislé balíčky; `braces 3.0.3` v době kontroly neměl opravené vydání. Tento řetězec není součástí produkčního standalone runtime. V P1 se audit znovu nespouštěl; jde o historický baseline, nikoli dnešní bezpečnostní výsledek. Next.js se kvůli automatickému návrhu `npm audit fix --force` nedowngradoval na starší konfiguraci. ESLint 9.39.5 zůstal kvůli peer kompatibilitě Next konfigurace; přechod na ESLint 10 vyžaduje kompatibilní lint stack a nové ověření. Při aktualizacích znovu ověřte audit a lint.
