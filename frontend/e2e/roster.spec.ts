import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8080/api";

// This opt-in scenario claims one isolated club. Run each project on a fresh DB;
// do not combine it with the separate one-time club-setup spec on that same DB.
test("jediný správce, dva sporty, offline hráči a zachovaná historie členství", async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const token = process.env.E2E_SETUP_TOKEN;
  test.skip(!token, "Vyžaduje soukromý E2E_SETUP_TOKEN a novou izolovanou databázi.");
  test.skip(testInfo.project.name !== (process.env.E2E_SETUP_PROJECT ?? "desktop"),
    "Jeden setup projekt na jednu čistou databázi.");
  const suffix = randomUUID().slice(0, 8);
  const username = "roster-e2e-" + suffix;
  const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());
  const day = (offset: number) => new Date(Date.parse(today + "T12:00:00Z") + offset * 86_400_000).toISOString().slice(0, 10);
  const startsOn = day(-30);
  const endsOn = day(365);
  const seasonName = "Sezóna " + suffix;
  const names = ["Fotbal " + suffix, "Basketbal " + suffix];
  const teamNames = ["Fotbal U15 " + suffix, "Basketbal U15 " + suffix];
  const displayNames = ["Fotbal sezónní " + suffix, "Basketbal sezónní " + suffix];

  await page.goto("/register");
  await page.getByLabel("Uživatelské jméno").fill(username);
  await page.getByLabel("Heslo", { exact: true }).fill("E2e-test-password-2026");
  await page.getByLabel("Heslo znovu").fill("E2e-test-password-2026");
  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await expect(page.getByRole("heading", { name: "Účet je připravený." })).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Uživatelské jméno").fill(username);
  await page.getByLabel("Heslo", { exact: true }).fill("E2e-test-password-2026");
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/profile");
  await page.getByLabel("Jméno", { exact: true }).fill("Testovací");
  await page.getByLabel("Příjmení", { exact: true }).fill("Trenér");
  const onboardingDone = page.waitForResponse(response => response.url().endsWith("/me/person") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Uložit osobní údaje" }).click();
  expect((await onboardingDone).status()).toBe(201);
  await expect.poll(async () => (await (await page.request.get(apiUrl + "/auth/me")).json()).profileState).toBe("COMPLETE");
  await page.goto("/setup");
  await page.getByLabel("Instalační token").fill(token!);
  const setupDone = page.waitForResponse(response => response.url().endsWith("/club/setup") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Převzít správu klubu" }).click();
  expect((await setupDone).status()).toBe(200);
  await expect.poll(async () => (await (await page.request.get(apiUrl + "/auth/me")).json()).role).toBe("ADMIN");
  await page.goto("/admin/sports");
  for (let index = 0; index < names.length; index++) {
    await page.getByLabel("Kód sportu").fill((index === 0 ? "FOOTBALL_" : "BASKETBALL_") + suffix.toUpperCase());
    await page.getByLabel("Název sportu").fill(names[index]);
    await page.getByRole("button", { name: "Přidat sport" }).click();
    await expect(page.getByRole("article", { name: names[index], exact: true })).toBeVisible();
  }
  const sports = (await (await page.request.get(apiUrl + "/sports")).json()).items as { id: string; name: string }[];

  await page.goto("/admin/seasons");
  await page.getByLabel("Název sezóny").fill(seasonName);
  await page.getByLabel("Začátek sezóny").fill(startsOn);
  await page.getByLabel("Konec sezóny").fill(endsOn);
  await page.getByRole("button", { name: "Vytvořit sezónu" }).click();
  await expect(page.getByRole("article", { name: seasonName, exact: true })).toBeVisible();
  const season = (await (await page.request.get(apiUrl + "/seasons")).json()).items[0] as { id: string };
  await page.goto("/admin/teams");
  for (let index = 0; index < teamNames.length; index++) {
    const form = page.getByRole("form", { name: "Nový tým", exact: true });
    await form.getByLabel("Název týmu", { exact: true }).fill(teamNames[index]);
    await form.getByLabel("Sport týmu").selectOption(sports.find(sport => sport.name === names[index])!.id);
    await form.getByRole("button", { name: "Vytvořit tým" }).click();
    await expect(page.getByRole("article", { name: teamNames[index], exact: true })).toBeVisible();
    const teams = (await (await page.request.get(apiUrl + "/teams")).json()).items as { id: string; name: string }[];
    const seasonForm = page.getByRole("form", { name: "Tým do sezóny", exact: true });
    await seasonForm.getByLabel("Tým k zařazení").selectOption(teams.find(team => team.name === teamNames[index])!.id);
    await seasonForm.getByLabel("Sezóna pro tým").selectOption(season.id);
    await seasonForm.getByLabel("Název týmu v sezóně").fill(displayNames[index]);
    await seasonForm.getByRole("button", { name: "Zařadit tým do sezóny" }).click();
    await expect(page.getByRole("article", { name: displayNames[index], exact: true })).toBeVisible();
  }
  const teamSeasons = (await (await page.request.get(apiUrl + "/team-seasons")).json()).items as { id: string; teamId: string; displayName: string }[];
  const teamIds = displayNames.map(name => teamSeasons.find(team => team.displayName === name)!.id);
  await page.goto("/admin/players");
  for (const name of ["Alex", "Sam"]) {
    const form = page.getByRole("form", { name: "Nový hráč", exact: true });
    await form.getByLabel("Jméno", { exact: true }).fill(name);
    await form.getByLabel("Příjmení", { exact: true }).fill("Testovací " + suffix);
    await form.getByLabel("Datum narození").fill("2012-02-03");
    await form.getByLabel("E-mail", { exact: true }).fill(name.toLowerCase() + "@example.test");
    await form.getByRole("button", { name: "Vytvořit hráče" }).click();
    await expect(page.getByRole("region", { name: "Hráči", exact: true }).getByText(name + " Testovací " + suffix, { exact: true })).toBeVisible();
  }
  const players = (await (await page.request.get(apiUrl + "/players")).json()).items as { id: string; firstName: string }[];
  const playerIds = ["Alex", "Sam"].map(name => players.find(player => player.firstName === name)!.id);
  const me = await (await page.request.get(apiUrl + "/auth/me")).json() as { id: string };
  for (let index = 0; index < teamIds.length; index++) {
    await page.goto("/admin/teams/" + teamIds[index]);
    const coach = page.getByRole("form", { name: "Přidat trenérské přiřazení", exact: true });
    await coach.getByLabel("Trenér", { exact: true }).selectOption(me.id);
    await coach.getByRole("button", { name: "Přidat trenéra", exact: true }).click();
    await expect(page.getByRole("region", { name: "Trenérská přiřazení", exact: true }).getByText("Testovací Trenér", { exact: true })).toBeVisible();
    const form = page.getByRole("form", { name: "Přidat hráčské členství", exact: true });
    await form.getByLabel("Hráč", { exact: true }).selectOption(playerIds[index]);
    await form.getByRole("button", { name: "Přidat hráče do týmu" }).click();
    await expect(page.getByRole("region", { name: "Hráčská členství", exact: true }).getByText(["Alex", "Sam"][index] + " Testovací " + suffix, { exact: true })).toBeVisible();
  }
  const context = await (await page.request.get(apiUrl + "/me/context")).json();
  expect(context.teamContexts.map((team: { teamSeasonId: string }) => team.teamSeasonId).sort()).toEqual([...teamIds].sort());
  expect(context.children).toEqual([]);
  expect((await (await page.request.get(apiUrl + "/admin/coach-candidates")).json()).totalElements).toBe("1");

  // A base-team rename must not overwrite the historic, separately stored season name.
  await page.goto("/admin/teams");
  const football = page.getByRole("article", { name: teamNames[0], exact: true });
  await football.getByRole("button", { name: "Upravit tým", exact: true }).click();
  await football.getByLabel("Název týmu", { exact: true }).fill("Přejmenovaný " + teamNames[0]);
  await football.getByRole("button", { name: "Uložit tým", exact: true }).click();
  await expect(page.getByRole("article", { name: "Přejmenovaný " + teamNames[0], exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: displayNames[0], exact: true })).toBeVisible();

  // End the old membership today and create a current one in the other sport.
  await page.goto("/admin/teams/" + teamIds[0]);
  const old = page.getByRole("region", { name: "Hráčská členství", exact: true }).getByRole("article", { name: "Alex Testovací " + suffix, exact: true });
  await old.getByRole("button", { name: "Upravit interval", exact: true }).click();
  await old.getByLabel("Konec členství").fill(today);
  await old.getByRole("button", { name: "Uložit interval", exact: true }).click();
  await expect(old.getByText(today, { exact: false })).toBeVisible();
  await page.goto("/admin/teams/" + teamIds[1]);
  const next = page.getByRole("form", { name: "Přidat hráčské členství", exact: true });
  await next.getByLabel("Hráč", { exact: true }).selectOption(playerIds[0]);
  await next.getByLabel("Začátek členství").fill(today);
  await next.getByRole("button", { name: "Přidat hráče do týmu" }).click();
  await expect(page.getByRole("region", { name: "Hráčská členství", exact: true }).getByText("Alex Testovací " + suffix, { exact: true })).toBeVisible();
  await page.goto("/players/" + playerIds[0]);
  await expect(page.getByRole("region", { name: "Historie členství", exact: true }).getByRole("article")).toHaveCount(2);
  const basic = await (await page.request.get(apiUrl + "/players/" + playerIds[0])).json();
  expect(Object.keys(basic).sort()).toEqual(["firstName", "id", "lastName"]);
  await page.goto("/teams/" + teamIds[0]);
  await expect(page.getByText("Ke zvolenému dni není na soupisce žádný hráč.", { exact: true })).toBeVisible();
  await page.getByLabel("Soupiska ke dni").fill(day(-1));
  await page.getByRole("button", { name: "Zobrazit soupisku", exact: true }).click();
  await expect(page.getByRole("article", { name: "Alex Testovací " + suffix, exact: true })).toBeVisible();

  await page.goto("/admin/seasons");
  const card = page.getByRole("article", { name: seasonName, exact: true });
  await card.getByRole("button", { name: "Archivovat sezónu" }).click();
  await card.getByRole("button", { name: "Potvrdit archivaci" }).click();
  await expect(card.getByText("Archivovaná", { exact: true })).toBeVisible();
  await page.goto("/admin/teams/" + teamIds[1]);
  await expect(page.getByText("Sezóna je archivovaná.", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "Přidat hráče do týmu" })).toHaveCount(0);
  const csrf = await (await page.request.get(apiUrl + "/auth/csrf")).json() as { headerName: string; token: string };
  const locked = await page.request.post(apiUrl + "/team-seasons/" + teamIds[1] + "/player-memberships", { headers: { [csrf.headerName]: csrf.token }, data: { playerId: playerIds[0], validFrom: today, validTo: null } });
  expect(locked.status()).toBe(409);
  expect(await locked.json()).toMatchObject({ code: "CONFIGURATION_LOCKED" });
  await page.goto("/teams/" + teamIds[1]);
  await expect(page.getByRole("article", { name: "Alex Testovací " + suffix, exact: true })).toBeVisible();
  await expect(page.getByRole("article", { name: "Sam Testovací " + suffix, exact: true })).toBeVisible();
  const roster = await (await page.request.get(apiUrl + "/team-seasons/" + teamIds[1] + "/players")).json();
  expect(roster.totalElements).toBe("2");
  for (const entry of roster.items) expect(Object.keys(entry).sort()).toEqual(["firstName", "lastName", "membershipId", "playerId", "validFrom", "validTo"]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("roster.png"), fullPage: true });
});
