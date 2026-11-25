# Lokální ukázka na novém zařízení

Použijte kopii repozitáře se změnami frontendu z větve `feat/frontend-redesign` a Docker s Compose v2. Postup funguje i pro Codex. Provádějte ho nad novou lokální ukázkovou databází a používejte smyšlené osoby.

## Spuštění

1. V kořeni repozitáře zkopírujte `.env.example` do `.env.demo`. V PowerShellu použijte `Copy-Item .env.example .env.demo`, v Bash `cp .env.example .env.demo`.
2. V `.env.demo` nastavte dvě různé náhodné hodnoty pro `POSTGRES_PASSWORD` a `CLUB_SETUP_TOKEN`. Uložte je lokálně. Soubor je v pravidlech `.gitignore`. Pro oddělené lokální porty nastavte následující hodnoty.

   ```dotenv
   FRONTEND_HOST_PORT=13010
   BACKEND_HOST_PORT=18090
   NEXT_PUBLIC_API_URL=http://localhost:18090/api
   CORS_ALLOWED_ORIGINS=http://localhost:13010
   SESSION_COOKIE_SECURE=false
   ```

3. Spusťte vlastní Compose projekt s názvem `sport-club-demo`. Jeho databázový svazek je samostatný. Po změně adresy API frontend znovu sestavte.

   ```sh
   docker compose --env-file .env.demo -p sport-club-demo up --build -d --wait
   docker compose --env-file .env.demo -p sport-club-demo ps
   ```

4. Otevřete [portál](http://localhost:13010/) a ověřte [stav backendu](http://localhost:18090/api/actuator/health). Pro přihlášení používejte adresy s `localhost` na obou portech.
5. Pro zastavení spusťte `docker compose --env-file .env.demo -p sport-club-demo down`. Data zůstanou ve svazku tohoto projektu a po dalším spuštění budou k dispozici.

## Účty

Zvolte jedinečné lokální heslo pro každý účet a uložte ho soukromě. Při opakovaném spuštění použijte už vytvořené účty. Dokončené převzetí správy je jednorázové.

| Uživatelské jméno | Úloha | Jak účet připravit |
| --- | --- | --- |
| `demo-spravce` | Správce | Veřejná registrace, přihlášení, doplnění osobních údajů. V **Nastavení klubu** vložte místní `CLUB_SETUP_TOKEN` a převezměte správu. |
| `demo-trener` | Trenér | Veřejná registrace, přihlášení, doplnění osobních údajů. Správce ho přiřadí jako trenéra ke klubovému týmu v sezóně. |
| `demo-rodic` | Rodič | Veřejná registrace, přihlášení, doplnění osobních údajů. Správce vytvoří ověřenou rodičovskou vazbu ke smyšlenému hráči. |
| `demo-hrac` | Dětský hráč | V **Hráči a osoby** vytvořte hráče s datem narození. Přidejte rodiče přes **Rodiče a zástupci**. V **Přístupové účty** vytvořte dětský účet na osobě hráče a samostatně ho aktivujte. |

Správce může zůstat jediným účtem pro rychlou ukázku. Přidejte trenéra, rodiče a dítě, když potřebujete ověřit jejich pohledy. Při přepínání účtů použijte oddělené profily prohlížeče nebo se odhlaste. Důvody pro správní změny mohou být například „Příprava místní ukázky“.

## Ukázková data a postup

1. V **Administrace → Sporty** přidejte `FOOTBALL` jako **Fotbal** a `BASKETBALL` jako **Basketbal**.
2. V **Administrace → Sezóny** založte **Ukázková sezóna**. Nastavte začátek před dneškem a konec alespoň za měsíc. Den konce už do sezóny nepatří.
3. V **Týmy a členství** založte klubové týmy **Fotbal A** a **Basketbal A**. Volitelně přidejte **Fotbal B** pro zápas. Pokud reprezentuje jiný klub, vypněte volbu **Klubový tým**. Každý tým samostatně zařaďte do ukázkové sezóny.
4. Vytvořte alespoň dva smyšlené hráče, například Alex Ukázkový a Sam Ukázkový. U každého zvolte **Přiřadit do týmu**, vyberte sezónní tým a uložte členství. Pro budoucí akce musí být členství platné v den konání. Trenéra přidejte v detailu stejného sezónního týmu.
5. V **Kalendáři** vytvořte jeden budoucí trénink pro každý klubový tým. Použijte například zítřek a pozítří. Uložte koncept a zveřejněte ho. Pro zápas založte v **Formáty zápasu** fotbalový formát se součtem skóre a dvěma částmi. Jako soupeře zvolte další fotbalový tým v téže sezóně. Přátelský zápas můžete naplánovat bez soutěžního ročníku.

## Kontrola pro člověka i Codex

Podrobné [testovací scénáře](demo-test-scenarios.md) spojují jednotlivé průchody se zdrojovými soubory, databázovými tabulkami a dotazy pro kontrolu.

- Správce vidí tréninky v kalendáři a hráče na soupiskách týmů. U tréninku má hráč dostupnost a docházku. U zápasu je dostupná nominace.
- Trenér bez role ADMIN má kalendář svého týmu a může spravovat jeho akce podle přiřazení. Rodič vidí schválené dítě a může odpovědět za něj. Dítě vidí vlastní akce a sportovní oznámení.
- Pokud už portál běží, ověřte jeho URL, databázi a přihlašovací stav před jakýmkoli zápisem. Použijte stávající testovací záznamy, pokud odpovídají postupu. Prázdný výběr u akce prověřte podle otevřené sezóny, sezónního týmu, jeho typu a u zápasu podle druhého týmu a formátu.
- Při automatizaci přes REST dodržte [API kontrakt](api-contract.md). Přihlášení používá cookie `JSESSIONID`, před každým zápisem získejte aktuální CSRF token. ID přebírejte z odpovědí API. Testovací účty a data vytvářejte běžným UI nebo REST endpointy.
