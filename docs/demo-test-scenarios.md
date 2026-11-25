# Testovací scénáře klubového portálu

Použijte izolovanou sestavu z [návodu k lokální ukázce](demo-setup.md). Pro scénáře s prázdnou sezónou použijte novou databázi. Stav zápisu ověřujte přes UI nebo REST. SQL příklady slouží k doplňkové kontrole pouze pro čtení.

## 1. Přihlášení a převzetí správy

- **Postup.** Zaregistrujte `demo-spravce`, přihlaste se a ověřte, že přehled nabízí doplnění profilu. Uložte osobní údaje a v **Nastavení klubu** proveďte jednorázové převzetí správy. Odhlaste se a znovu se přihlaste.
- **Očekávaný výsledek.** Účet nejprve nabídne jen onboarding. Po převzetí má dostupnou administraci. Opakované převzetí stejného klubu neprojde.
- **Soubory.** [AuthForm.tsx](../frontend/src/components/AuthForm.tsx), [ClubSetup.tsx](../frontend/src/components/ClubSetup.tsx), [ClubService.java](../backend/src/main/java/cz/jpmad/springprojecttemplate/service/club/ClubService.java), [auth.spec.ts](../frontend/e2e/auth.spec.ts), [club-setup.spec.ts](../frontend/e2e/club-setup.spec.ts).
- **Databáze.** `users.person_id` odkazuje na `persons.id`. Správce má `users.role = ADMIN`. Stav převzetí je v `club`, audit v `audit_log`. Přihlášení používá serverovou session.

## 2. Od sportu k tréninku

- **Postup.** Na prázdné databázi otevřete **Kalendář → Vytvořit akci**. Založte sezónu, přidejte sport a přes odkaz po uložení vytvořte klubový tým. Zařaďte ho do sezóny a použijte **Naplánovat akci pro tým**. Nejprve zadejte konec shodný se začátkem. Po opravě uložte a zveřejněte trénink.
- **Očekávaný výsledek.** Formulář postupně vysvětlí chybějící sezónu nebo tým. Po přechodu ze správy týmu je tým předvybraný. Neplatný termín se neuloží. Zveřejněný trénink je v kalendáři a přehledu.
- **Soubory.** [SportsManager.tsx](../frontend/src/components/SportsManager.tsx), [TeamsManager.tsx](../frontend/src/components/club/TeamsManager.tsx), [EventForm.tsx](../frontend/src/components/events/EventForm.tsx), [EventService.java](../backend/src/main/java/cz/jpmad/springprojecttemplate/service/event/EventService.java), [calendar.spec.ts](../frontend/e2e/calendar.spec.ts).
- **Databáze.** `teams.sport_id` odkazuje na `sports.id`. `team_seasons` propojuje tým a sezónu. `events` ukládá termín a stav `DRAFT` nebo `PUBLISHED`. `event_teams` spojuje akci se sezónními týmy.

## 3. Přiřazení hráče a historie soupisky

- **Postup.** U hráče zvolte **Přiřadit do týmu**, vyberte klubový tým v otevřené sezóně a otevřete **Nastavit členství**. Ověřte předvybraného hráče, uložte interval a otevřete soupisku. Zkuste stejnému hráči ve stejném týmu uložit překrývající se interval.
- **Očekávaný výsledek.** Po uložení se zobrazí potvrzení. Soupiska hráče zahrne pro datum uvnitř intervalu. Překryv vrátí chybu a nevznikne další členství. Externí soupeř je bez hráčských členství.
- **Soubory.** [PlayersManager.tsx](../frontend/src/components/club/PlayersManager.tsx), [MembershipsManager.tsx](../frontend/src/components/club/MembershipsManager.tsx), [TeamDomainService.java](../backend/src/main/java/cz/jpmad/springprojecttemplate/service/team/TeamDomainService.java), [roster.spec.ts](../frontend/e2e/roster.spec.ts), [TeamsAndMembershipsTests.java](../backend/src/test/java/cz/jpmad/springprojecttemplate/TeamsAndMembershipsTests.java).
- **Databáze.** `player_profiles.person_id` odkazuje na osobu. `player_team_memberships` propojuje hráče se záznamem `team_seasons`. `valid_from` do intervalu patří, `valid_to` už ne. Trenérské přiřazení je v `coach_team_memberships`.

## 4. Trénink, zápas a nominace

- **Postup.** Publikujte trénink týmu s platným členstvím. Otevřete účastníky a ověřte dostupnost a docházku. Pro zápas použijte dva týmy stejného sportu ve stejné sezóně a formát zápasu. Zveřejněte zápas, uložte návrh nominace a potom ho samostatně zveřejněte.
- **Očekávaný výsledek.** Běžný trénink nemá ovládání nominace. Zápas ji má. Hráč při uložení návrhu stále vidí poslední publikovanou hodnotu a novou hodnotu dostane až po zveřejnění. Nevyplněná docházka zůstane bez záznamu.
- **Soubory.** [EventDetail.tsx](../frontend/src/components/events/EventDetail.tsx), [EventController.java](../backend/src/main/java/cz/jpmad/springprojecttemplate/api/event/EventController.java), [EventRepository.java](../backend/src/main/java/cz/jpmad/springprojecttemplate/repository/EventRepository.java), [EventsTests.java](../backend/src/test/java/cz/jpmad/springprojecttemplate/EventsTests.java).
- **Databáze.** `matches.event_id` odkazuje na `events.id` a ukládá strany, formát i případný soutěžní ročník. `event_participants` má samostatné sloupce `availability`, `nomination`, `published_nomination` a `attendance`. Historicky zadaná nominace u tréninku se v UI dál zobrazí.

## 5. Rodič, dětský účet a oznámení

- **Postup.** Podle [lokální ukázky](demo-setup.md#účty) připravte rodiče a aktivovaný účet dítěte. Přihlaste se jako rodič a potvrďte dostupnost za dítě. Přihlaste se jako dítě, otevřete vlastní akci a jedno oznámení označte jako přečtené. Ověřte, že jiný běžný účet s cizím týmem toto oznámení nevidí.
- **Očekávaný výsledek.** Rodič vidí schválené dítě. Dítě vidí vlastní sportovní záznamy. Počet nepřečtených se sníží jen pro účet, který označení provedl.
- **Soubory.** [GuardiansManager.tsx](../frontend/src/components/club/GuardiansManager.tsx), [Notifications.tsx](../frontend/src/components/events/Notifications.tsx), [AccountDomainService.java](../backend/src/main/java/cz/jpmad/springprojecttemplate/service/account/AccountDomainService.java), [guardians.spec.ts](../frontend/e2e/guardians.spec.ts), [calendar.spec.ts](../frontend/e2e/calendar.spec.ts).
- **Databáze.** `guardian_links` spojuje osobu rodiče s hráčem. `users.account_type` určuje typ účtu. `notifications` je zpráva spojená s akcí. `notification_deliveries` ukládá příjemce a jeho vlastní `read_at`.

## Kontrola uložených dat

Po spuštění samostatné ukázky otevřete `psql` v jejím databázovém kontejneru. Příkaz používá jméno databáze a uživatele z `.env.example`.

```sh
docker compose --env-file .env.demo -p sport-club-demo exec db psql -U sport_club -d sport_club
```

```sql
BEGIN READ ONLY;

SELECT s.code, t.name, ts.display_name, se.name AS season,
       COUNT(pm.id) AS membership_count
FROM team_seasons ts
JOIN teams t ON t.id = ts.team_id
JOIN sports s ON s.id = t.sport_id
JOIN seasons se ON se.id = ts.season_id
LEFT JOIN player_team_memberships pm ON pm.team_season_id = ts.id
GROUP BY s.code, t.name, ts.display_name, se.name
ORDER BY s.code, ts.display_name;

SELECT e.title, e.type, e.status, e.starts_at,
       p.availability, p.nomination, p.published_nomination, p.attendance
FROM events e
LEFT JOIN event_participants p ON p.event_id = e.id
ORDER BY e.starts_at, e.title;

SELECT n.type, n.title, d.delivered_at, d.read_at
FROM notifications n
JOIN notification_deliveries d ON d.notification_id = n.id
ORDER BY d.delivered_at DESC;

ROLLBACK;
```

Schéma popisují [databáze](database.md), [DBML](sport-club.dbml) a [migrace V1–V8](../backend/src/main/resources/db/migration). Přesná oprávnění a HTTP operace uvádí [API kontrakt](api-contract.md). Provedené automatické běhy jsou v [ověření](verification.md).
