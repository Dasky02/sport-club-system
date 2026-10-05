# Informační systém pro správu sportovního klubu

Samostatný týmový ročníkový projekt `sport-club-system`. **Etapa 1 je funkční technický skeleton, nikoli dokončená klubová aplikace.** Cílový rozsah odpovídá `zadani_sportovni_klub_v2.odt`; finální akceptace zahrnuje fotbal i basketbal bez změny kódu.

Implementovaný základ: Spring REST API, UUID účty a BCrypt hesla, veřejná registrace pouze jako `USER`, JSON přihlášení přes `JSESSIONID`, CSRF, obnovení session a logout, informační API s verzí z JAR, Flyway migrace `users`, Next.js úvod/registrace/přihlášení/dashboard, responzivní rozhraní, unit a integrační testy, Docker a CI. V této etapě neexistují obrazovky ani API pro týmy, hráčské profily, události, výsledky, statistiky, příspěvky, komunikaci nebo notifikace. Tyto funkce jsou konkrétně navržené v dokumentaci a čekají na další etapy.

## Požadavky

- Java **17** a Maven Wrapper (v repozitáři; Maven není nutné instalovat).
- Node **24.14.0** a npm; `.nvmrc` a `.node-version` obsahují stejnou verzi jako Docker a CI.
- Docker Desktop / Docker Engine s Compose v2, běžící daemon pro PostgreSQL a Testcontainers.
- Python 3 pro týmové pomocné skripty.
- Volné porty 5432 (lokální DB), 8080 (API), 3000 (frontend).

Backend používá Spring Boot 4.0.3 a springdoc 3.0.3 podle [oficiální kompatibility](https://springdoc.org/#what-is-the-compatibility-matrix-of-springdoc-openapi-with-spring-boot). Přesné verze frontendových závislostí jsou v `frontend/package.json` a `package-lock.json`. Běžné kontroly nevyžadují žádný token ani produkční secrets.

## Od čistého klonu: lokální vývoj

Po zveřejnění klonujte **nový** repozitář svého týmu a přejděte do jeho kořene. Zdrojový privátní template se pro vývoj tohoto projektu neklonuje.

```sh
cp .env.example .env
cp frontend/.env.example frontend/.env.local
```

V `.env` nahraďte vzor `POSTGRES_PASSWORD` vlastním lokálním heslem. Tento postup načítá env soubor i shellem: pro heslo použijte například náhodnou hex hodnotu nebo jej uzavřete do jednoduchých uvozovek. Ostatní výchozí hodnoty jsou připravené pro localhost. Soubor frontend `.env.local` obsahuje `NEXT_PUBLIC_API_URL=http://localhost:8080/api`; nikdy sem nepatří databázové heslo nebo hostname `backend`.

```sh
docker compose -f docker-compose.dev.yml up -d --wait
```

Backend v prvním terminálu (z kořene; `.env` se exportuje pouze pro tento shell):

```sh
set -a
. ./.env
set +a
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

Java musí být verze 17 (`java -version`; při více instalacích nastavte `JAVA_HOME`). Na macOS např. `export JAVA_HOME=$(/usr/libexec/java_home -v 17)`. Dev profil nepřidává žádné výchozí účty. Zaregistrujte se přes UI; přidělování klubových rolí bude administrátorská funkce v další etapě.

Frontend ve druhém terminálu:

```sh
cd frontend
nvm use                 # pokud používáte nvm
npm ci
npm run dev
```

Otevřete [frontend](http://localhost:3000). [Verze API](http://localhost:8080/api/info/version), [health](http://localhost:8080/api/actuator/health) a [OpenAPI](http://localhost:8080/api/v3/api-docs) ověřují skutečný běžící backend. API prefix `/api` se přidává právě jednou. Databázové změny provádí Flyway; Hibernate pouze validuje schéma.

## Celá sestava v Dockeru

Lokální běh má HTTP a cookie `Secure=false`; HTTPS produkce používá samostatný override.

```sh
docker compose up --build -d --wait
docker compose ps
docker compose logs backend
docker compose down
```

Před plnou sestavou zastavte lokální backend/frontend na stejných portech. Vývojový Compose a plná sestava mají oddělená pojmenovaná DB volumes. Plná sestava nevystavuje port DB; frontend a backend se vážou na loopback hostitele. V kontejnerech backend používá `db:5432`; v lokálním backendu `localhost:5432`. Prohlížeč vždy používá veřejné `http://localhost:8080/api`. `NEXT_PUBLIC_API_URL` je build argument; při změně URL frontend znovu sestavte.

`docker compose down` zachová data. `down -v` je smaže; používejte jej jen pro vlastní zahoditelnou vývojovou databázi. Nasazení s Caddy, HTTPS, zálohou a obnovou je v [docs/deployment.md](docs/deployment.md).

## Kontroly

```sh
cd backend
./mvnw -B -ntp verify
cd ../frontend
npm ci
npm run lint
npm run typecheck
npm test
npm run build
cd ..
python3 scripts/check_public_content.py
docker compose --env-file .env.example config --quiet
```

Na macOS může Testcontainers potřebovat `export DOCKER_HOST=unix://$HOME/.docker/run/docker.sock`; v Linux CI používá běžný Docker socket. Integrační testy vytvářejí vlastní čistý PostgreSQL 16 container, zapínají Flyway a Hibernate validate. Nezávisí na vašem vývojovém volume. Browserové E2E instrukce a skutečné výsledky kontrol jsou v [docs/verification.md](docs/verification.md). Neprovedené kontroly jsou označeny jako neprovedené.

## Dokumentace a týmová práce

- [Architektura a bezpečnost skeletonu](docs/architecture.md), [výchozí problémy šablony](docs/baseline.md).
- [Požadavky a akceptace](docs/requirements.md), [doménový model](docs/domain-model.md), [návrh databáze](docs/database-design.md).
- [Oprávnění](docs/authorization.md), [etapy implementace](docs/roadmap.md), [uživatelská příručka](docs/user-guide.md).
- [Nasazení](docs/deployment.md), [výsledky ověření](docs/verification.md), [CONTRIBUTING](CONTRIBUTING.md).

Doporučený postup: krátké větve, PR, alespoň jedno schválení kolegou a povinné úspěšné CI před merge do `main`. Nastavení těchto GitHub pravidel je samostatný týmový krok. Release je ruční workflow nad `main`, po testech a s verzí z `VERSION`; běžné PR kontroly nic nepublikují. Aktualizujte verzi přes `python3 scripts/bump_version.py X.Y.Z` a release notes v backend resources.

## Původ a licence

Backend a API klient vycházejí z `petrsafrata/Spring-project-template`, commit `32dded5e33b83f038655199eb81044fa3d4c66a8`. Zachovány jsou vrstvy a Java package šablony, User/UserRepository/UserService, DTO records, handler chyb, InfoController/InfoService/OpenApiConfig, Maven Wrapper, PostgreSQL a Testcontainers. Přehled cílených úprav je v [NOTICE](NOTICE) a dokumentaci. [LICENSE](LICENSE) včetně původního oznámení Petr Šafrata je zachována.

Nový repozitář vzniká bez původní Git historie a bez privátních `.env` souborů. Původní privátní repozitář nebyl upraven. Publikování nového repozitáře a jeho veřejná viditelnost jsou odděleným závěrečným krokem po kontrole obsahu.
