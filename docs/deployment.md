# Nasazení a provoz

## Lokální Compose

Postup v README sestaví DB, backend i standalone Next.js. Po `cp .env.example .env` nastavte soukromé DB heslo. Žádné skutečné env soubory nejsou verzované ani v Docker build contextu. `NEXT_PUBLIC_API_URL` musí být URL dosažitelná z prohlížeče a je vložena při build; `backend` je pouze hostname vnitřní Docker sítě.

## HTTPS produkce

Připravená konfigurace používá [Caddy automatické HTTPS](https://caddyserver.com/docs/automatic-https). Veřejné nasazení této instance zatím neproběhlo; funkční certifikát lze ověřit až s vlastní doménou a dostupným serverem.

1. Připravte Linux server s Docker/Compose v2 a klonem nového repozitáře. DNS A/AAAA pro vlastní doménu musí směřovat na server; povolte veřejné porty 80 a 443.
2. V soukromém `.env` nastavte silné vlastní POSTGRES_PASSWORD, PUBLIC_HOST bez schématu/cesty a ACME_EMAIL. Neužívejte sample password. Uchovejte soubor s omezenými oprávněními (`chmod 600 .env`).
3. Spusťte:

```sh
docker compose -f docker-compose.yml -f docker-compose.prod.yml config --quiet
docker compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d --wait
```

Override zabuduje `https://PUBLIC_HOST/api` do frontendu, nastaví přesný CORS origin a Secure cookie. Caddy předává `/api/*` beze změny do Springu (Spring už má `/api`), vše ostatní do Next.js. Backend a frontend host porty zůstávají pouze na loopback; DB nemá host port. Caddy je jediný veřejný vstup. Backend forward headers přijímá z důvěryhodné proxy v Docker síti; neotevírejte jeho port do internetu. TLS data v caddy-data volume uchovejte mezi restarty.

4. Ověřte HTTPS redirect, platnost certifikátu a `/api/actuator/health`. V prohlížeči projděte registraci/login/refresh/logout; cookie musí být HttpOnly, Secure, SameSite=Lax a Path=/api. Chybný CSRF nebo cizí origin musí selhat. Lokální integrační testy nenahrazují tento produkční smoke test.

Samotná registrace poskytuje jen USER. Dosud není implementované administrátorské přiřazování klubových rolí; veřejný skeleton nepoužívejte jako dokončený klubový provoz. Dev ani produkce nemá účet s výchozím heslem. Dokumenty podmínek a soukromí v informačním API jsou pracovní texty skeletonu, před ostrým provozem je doplní provozovatel.

## Aktualizace, záloha a obnova

Před změnou verze zazálohujte DB. Příklad z kořene (dump je soukromý provozní artefakt mimo Git):

```sh
mkdir -p .verification/backups
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > .verification/backups/sport-club.dump
```

Obnovu nejdříve procvičte na samostatné testovací DB/volume. Příklad pro cílovou DB bez provozních dat:

```sh
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists' < .verification/backups/sport-club.dump
```

Obnova s `--clean` nahrazuje tabulky v cílové DB; nikdy ji nespouštějte nad živými daty bez schváleného obnovovacího postupu. Provozní zálohy kopírujte šifrovaně mimo server a pravidelně ověřujte jejich obnovitelnost. Zahoditelné lokální `.verification` úložiště z příkladu nenahrazuje produkční zálohovací službu.

Po reviewed změně: checkout schváleného commitu/release, rebuild `up --build -d --wait`, ověření health a browser flow. Flyway migrace se aplikují při startu; existující migrace nepřepisujte. Návrat starého image nemusí umět nové DB schéma — změny navrhujte kompatibilně nebo obnovte ověřenou zálohu. Nepoužívejte `down -v` na produkci.

## Release a images

VERSION a release notes mění tým v PR. Ruční Release workflow na main spustí CI a vytvoří tag a release; volba publish_images publikuje backend/frontend právě jednou přes jediný reusable GHCR workflow. Image názvy odvozujeme z nového `github.repository`, nikoli z template/configviz. Frontend veřejnou API URL pro GHCR nastavte jako repository variable NEXT_PUBLIC_API_URL před build; nejde o secret. CI se spouští při push a PR v [novém veřejném repozitáři](https://github.com/Dasky02/sport-club-system/actions/workflows/ci.yml). Release/GHCR workflow dosud nebylo spuštěno; publikování zdrojového repozitáře neznamená nasazení webu nebo vydání images.
