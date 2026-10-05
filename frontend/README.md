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
- `/register`: registrace účtu; payload obsahuje pouze jméno a heslo. Nový účet má `USER`. Registrace nepředstírá aktivní session.
- `/login`: JSON přihlášení pomocí serverové session.
- `/dashboard`: skutečný aktuální uživatel z `/auth/me`, role, datum vytvoření, odhlášení.

Týmy, události, statistiky, výsledky, příspěvky, komunikace a notifikace jsou **plánované funkce**; nemají fiktivní API ani ovládací prvky předstírající hotovou implementaci. Rozsah dalších etap popisuje [roadmapa](../docs/roadmap.md).

## API a session

Zachovali jsme klienta `src/api/api.ts`, jeho DTO, překlad chyb a `AuthContext` ze šablony. Axios používá `withCredentials: true`. Základní URL již obsahuje `/api`, metody používají `/auth/...` a `/info/...`. Před každým POST login/register/logout klient načte nový token z `/auth/csrf` a odešle jej v `X-CSRF-TOKEN`. Token se necacheuje, změnové požadavky se automaticky neopakují.

`AuthProvider` je Client Component. Po obnovení stránky načte `/auth/me`: **401** znamená anonymní session, zatímco síťová chyba, 403 či 5xx znamená neověřenou session a zobrazí retry. Dashboard nezobrazí chráněný obsah při neověřené session. Selhání odhlášení není prezentováno jako úspěšná invalidace session. Frontendová brána nenahrazuje autorizaci ve Springu. JSESSIONID zůstává HttpOnly; hesla ani session tokeny neukládáme do localStorage.

Heslo má nejméně 6 znaků a nejvýše 72 UTF-8 bajtů kvůli BCrypt; limit se ověřuje i na backendu. Diakritika může spotřebovat více než jeden bajt na znak.

## Testy

`npm test` spouští Vitest s Testing Library, jsdom a Axios mock adaptérem. Testuje klienta i celé vazby komponent, provideru a klienta: CSRF před mutacemi a rotaci tokenu, chyby/retry, registraci, login/logout, reload session, zamezení přepsání stavu opožděným `/me` a viditelnost dashboardu.

Testy s mock adaptérem ověřují frontendovou integraci; samotné cookies, CORS a zabezpečení serveru se ověřují také backendovými HTTP integračními testy a Playwrightem nad skutečnou běžící sestavou. Pro Playwright podle [kořenového README](../README.md) nejprve spusťte frontend/backend:

```sh
npx playwright install chromium
npm run test:e2e
```

Přesné verze jsou v `package.json` a `package-lock.json`. Next.js **16.3.8** byl vybrán z podporované [Active LTS řady](https://nextjs.org/support-policy) podle [oficiálního přehledu bezpečnostních vydání](https://nextjs.org/blog); React a React DOM **19.3.0** odpovídají peer dependencies Next.js. Před další etapou znovu ověřte bezpečnostní aktualizace a `npm audit`.

### Audit závislostí při přípravě základu

`npm audit --omit=dev` vrací **0 známých zranitelností**. Úplný audit po aktualizaci tranzitivních závislostí hlásí **5 high** položek ve vývojovém řetězci `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces`. Jde o stejnou [neopravenou chybu braces při hluboce vnořeném globu](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) a její závislé balíčky; aktuální `braces 3.0.3` v době kontroly nemá opravené vydání. Tento řetězec není součástí produkčního standalone runtime. Nedowngradujeme Next.js kvůli automatickému návrhu `npm audit fix --force` na nepodporovanou starší konfiguraci. ESLint 9.39.5 zůstává kvůli peer kompatibilitě aktuální oficiální Next konfigurace; přechod na podporovaný ESLint 10 proveďte společně s kompatibilním lint stackem. Při aktualizacích znovu ověřte audit a lint.
