import { randomUUID } from "node:crypto";
import { devices, expect, test, type BrowserContext, type Page } from "@playwright/test";
const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8080/api";
const password = "E2e-guardian-test-2026";

// Claims one NEW isolated club. Select this spec instead of the other setup specs.
test("rodiče dvou dětí, omezené přihlášení a trvalé odvolání starých sessions", async ({ page, browser }, testInfo) => {
  test.setTimeout(180_000);
  const token = process.env.E2E_SETUP_TOKEN;
  test.skip(!token, "Vyžaduje E2E_SETUP_TOKEN a novou izolovanou testovací DB.");
  test.skip(testInfo.project.name !== (process.env.E2E_SETUP_PROJECT ?? "desktop"), "Jeden projekt na jednu čistou DB.");
  const suffix = randomUUID().slice(0, 8);
  const names = { admin: "admin-" + suffix, parent1: "parent-a-" + suffix, parent2: "parent-b-" + suffix, child1: "child-a-" + suffix, child2: "child-b-" + suffix, pending: "pending-" + suffix };
  const contexts: BrowserContext[] = [];
  const newContext = async () => {
    const context = await browser.newContext({ ...(testInfo.project.name === "mobile" ? devices["Pixel 7"] : devices["Desktop Chrome"]), baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000" });
    contexts.push(context); return context;
  };
  const headers = async (context: BrowserContext) => {
    const r = await context.request.get(apiUrl + "/auth/csrf"); expect(r.status()).toBe(200);
    const c = await r.json() as { headerName: string; token: string }; return { [c.headerName]: c.token };
  };
  const mutate = async (method: string, path: string, data: unknown, status = 201, context = page.context()) => {
    const r = await context.request.fetch(apiUrl + path, { method, headers: await headers(context), data });
    expect(r.status(), await r.text()).toBe(status); return r.json();
  };
  const login = async (p: Page, username: string) => {
    await p.goto("/login"); await p.getByLabel("Uživatelské jméno").fill(username);
    await p.getByLabel("Heslo", { exact: true }).fill(password); await p.getByRole("button", { name: "Přihlásit se" }).click();
    await expect(p).toHaveURL(/\/dashboard$/);
  };
  const account = (username: string) => page.getByRole("article", { name: username, exact: true });
  const activate = async (username: string) => {
    await page.goto("/admin/accounts"); const card = account(username);
    await card.getByLabel("Odůvodnění změny přístupu").fill("Ověřené podmínky testovací aktivace");
    await card.getByRole("button", { name: "Aktivovat dětský účet", exact: true }).click();
    await expect(card.getByRole("button", { name: "Zakázat účet", exact: true })).toBeVisible();
  };
  const grant = async (playerId: string, parentPersonId: string) => {
    await page.goto(`/admin/players/${playerId}/guardians`);
    const form = page.getByRole("form", { name: "Schválit rodičovskou vazbu", exact: true });
    await form.getByLabel("Ověřený rodič nebo zástupce").selectOption(parentPersonId);
    await form.getByLabel("Odůvodnění schválení").fill("Ověřená testovací rodinná vazba");
    await form.getByRole("button", { name: "Schválit rodičovskou vazbu", exact: true }).click();
    await expect(page.getByRole("status").filter({ hasText: "Rodičovská vazba byla schválena." })).toBeVisible();
  };
  const revoke = async (playerId: string, parentName: string) => {
    await page.goto(`/admin/players/${playerId}/guardians`); const card = page.getByRole("article", { name: parentName, exact: true });
    await card.getByLabel("Odůvodnění odvolání").fill("Test výslovného odvolání vazby");
    await card.getByRole("button", { name: "Odvolat rodičovskou vazbu", exact: true }).click();
    await card.getByRole("button", { name: "Potvrdit odvolání vazby" }).click();
    await expect(card.getByText("Odvolaná vazba", { exact: true })).toBeVisible();
  };
  try {
    await page.goto("/register"); await page.getByLabel("Uživatelské jméno").fill(names.admin);
    await page.getByLabel("Heslo", { exact: true }).fill(password); await page.getByLabel("Heslo znovu").fill(password);
    await page.getByRole("button", { name: "Vytvořit účet" }).click();
    await expect(page.getByRole("heading", { name: "Účet je připravený." })).toBeVisible();
    await login(page, names.admin); await page.goto("/profile");
    await page.getByLabel("Jméno", { exact: true }).fill("Testovací"); await page.getByLabel("Příjmení", { exact: true }).fill("Správce");
    const onboardingDone = page.waitForResponse(response => response.url().endsWith("/me/person") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Uložit osobní údaje" }).click();
  expect((await onboardingDone).status()).toBe(201);
    await expect.poll(async () => (await (await page.request.get(apiUrl + "/auth/me")).json()).profileState).toBe("COMPLETE");
    await page.goto("/setup"); await page.getByLabel("Instalační token").fill(token!);
    const setupDone = page.waitForResponse(response => response.url().endsWith("/club/setup") && response.request().method() === "POST");
  await page.getByRole("button", { name: "Převzít správu klubu" }).click();
  expect((await setupDone).status()).toBe(200);
  await expect.poll(async () => (await (await page.request.get(apiUrl + "/auth/me")).json()).role).toBe("ADMIN");
    await page.goto("/admin/accounts");

    const today = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Prague" }).format(new Date());
    const day = (delta: number) => new Date(Date.parse(today + "T12:00Z") + delta * 86_400_000).toISOString().slice(0, 10);
    const season = await mutate("POST", "/seasons", { name: "Rodina " + suffix, startsOn: day(-30), endsOn: day(365) });
    const players: { id: string; personId: string }[] = []; const teams: { id: string }[] = [];
    // P2 fixtures via real API; this spec concentrates UI coverage on the new P3 flows.
    for (let i = 0; i < 2; i++) {
      const sport = await mutate("POST", "/sports", { code: (i ? "BASKETBALL_" : "FOOTBALL_") + suffix.toUpperCase(), name: i ? "Basketbal" : "Fotbal" });
      const team = await mutate("POST", "/teams", { sportId: sport.id, name: (i ? "Basketbal" : "Fotbal") + " U15", isClubTeam: true });
      teams.push(await mutate("POST", "/team-seasons", { teamId: team.id, seasonId: season.id, displayName: (i ? "Basketbal" : "Fotbal") + " rodina " + suffix }));
      players.push(await mutate("POST", "/players", { person: { firstName: i ? "Sam" : "Alex", lastName: "Testovací " + suffix, birthDate: "2012-01-01" } }));
      await mutate("POST", `/team-seasons/${teams[i].id}/player-memberships`, { playerId: players[i].id, validFrom: day(-30), validTo: null });
    }
    const parentPersons: string[] = [];
    for (const firstName of ["První", "Druhý"]) {
      await page.goto("/admin/accounts"); const form = page.getByRole("form", { name: "Nová osoba pro účet" });
      await form.getByLabel("Jméno", { exact: true }).fill(firstName); await form.getByLabel("Příjmení", { exact: true }).fill("Rodič " + suffix);
      await form.getByRole("button", { name: "Vytvořit osobu", exact: true }).click();
      await expect.poll(async () => (await (await page.request.get(apiUrl + "/persons")).json()).items.some((p: { firstName: string }) => p.firstName === firstName)).toBe(true);
      const persons = (await (await page.request.get(apiUrl + "/persons")).json()).items as { id: string; firstName: string }[];
      parentPersons.push(persons.find(p => p.firstName === firstName)!.id);
    }
    const accountRows = [[names.parent1, parentPersons[0], "STANDARD"], [names.parent2, parentPersons[1], "STANDARD"], [names.child1, players[0].personId, "CHILD"], [names.child2, players[1].personId, "CHILD"]];
    for (const [username, personId, type] of accountRows) {
      await page.goto("/admin/accounts"); const form = page.getByRole("form", { name: "Nový přístupový účet", exact: true });
      await form.getByLabel("Ověřená osoba", { exact: true }).selectOption(personId); await form.getByLabel("Uživatelské jméno").fill(username);
      await form.getByLabel("První heslo").fill(password); await form.getByLabel("Typ nového účtu").selectOption(type);
      await form.getByRole("button", { name: "Vytvořit přístupový účet", exact: true }).click();
      await expect(account(username)).toBeVisible(); await expect(page.getByLabel("První heslo")).toHaveValue("");
    }
    const accounts = (await (await page.request.get(apiUrl + "/admin/users")).json()).items as { id: string; username: string; enabled: boolean }[];
    const child1Id = accounts.find(a => a.username === names.child1)!.id;
    const child2Id = accounts.find(a => a.username === names.child2)!.id;
    const childState = async (id: string) => (await (await page.request.get(apiUrl + "/admin/users/" + id)).json()).enabled;
    expect(await childState(child1Id)).toBe(false);
    await account(names.child1).getByLabel("Odůvodnění změny přístupu").fill("Pokus před schválením rodiče");
    await account(names.child1).getByRole("button", { name: "Aktivovat dětský účet", exact: true }).click();
    await expect(account(names.child1).getByRole("alert")).toBeVisible(); expect(await childState(child1Id)).toBe(false);
    await grant(players[0].id, parentPersons[0]); await grant(players[0].id, parentPersons[1]); await grant(players[1].id, parentPersons[0]);
    await activate(names.child1); await activate(names.child2);

    const parent1 = await newContext(), parent2 = await newContext(), child = await newContext(), unused = await newContext();
    const parentPage = await parent1.newPage(), secondParentPage = await parent2.newPage(), childPage = await child.newPage(), unusedPage = await unused.newPage();
    await login(parentPage, names.parent1); await login(secondParentPage, names.parent2); await login(childPage, names.child1); await login(unusedPage, names.child1);
    const get = async (context: BrowserContext, path: string) => context.request.get(apiUrl + path);
    expect((await (await get(parent1, "/me/children")).json()).totalElements).toBe("2");
    expect((await (await get(parent2, "/me/children")).json()).totalElements).toBe("1");
    expect((await get(parent2, "/me/children/" + players[1].id)).status()).toBe(404);
    expect((await (await get(parent1, "/team-seasons")).json()).totalElements).toBe("2");
    expect((await (await get(parent2, "/team-seasons")).json()).totalElements).toBe("1");
    const childContext = await (await get(child, "/me/context")).json();
    expect(childContext).toMatchObject({ ownPlayerId: players[0].id, capabilities: [], children: [] });
    expect(childContext.teamContexts.map((t: { teamSeasonId: string }) => t.teamSeasonId)).toEqual([teams[0].id]);
    expect((await get(child, "/players/" + players[1].id)).status()).toBe(404);
    for (const path of ["/me/fees", "/fees/" + randomUUID(), "/payments/" + randomUUID(), "/fees/export", "/notifications", "/notifications/unread-count", "/me/children", "/admin/users"]) expect((await get(child, path)).status()).toBe(403);
    await mutate("POST", "/notifications/" + randomUUID() + "/read", {}, 403, child);
    await mutate("PUT", "/me/person", { firstName: "Změna", lastName: "Zakázaná", birthDate: "2000-01-01" }, 403, child);
    await parentPage.goto("/my-children"); await expect(parentPage.getByRole("heading", { name: "Moje děti", exact: true })).toBeVisible();
    await expect(parentPage.getByRole("article")).toHaveCount(2);
    await parentPage.getByRole("article", { name: "Alex Testovací " + suffix, exact: true }).getByRole("link", { name: "Profil dítěte", exact: true }).click();
    await expect(parentPage.getByRole("heading", { name: "Profil dítěte", exact: true })).toBeVisible();

    await revoke(players[0].id, "První Rodič " + suffix);
    expect((await get(child, "/auth/me")).status()).toBe(200); // Second qualified parent remains.
    expect((await (await get(parent1, "/me/children")).json()).totalElements).toBe("1");
    await revoke(players[0].id, "Druhý Rodič " + suffix);
    expect(await childState(child1Id)).toBe(false); expect(await childState(child2Id)).toBe(true);
    expect((await get(child, "/auth/me")).status()).toBe(401);
    expect((await (await get(parent2, "/me/children")).json()).totalElements).toBe("0");
    // Do not use the other child cookie during suspension; it still must not revive later.
    await grant(players[0].id, parentPersons[0]); expect(await childState(child1Id)).toBe(false);
    await activate(names.child1); expect((await get(unused, "/auth/me")).status()).toBe(401);
    await login(childPage, names.child1);

    await page.goto("/admin/accounts"); let parentCard = account(names.parent1);
    await parentCard.getByLabel("Odůvodnění změny přístupu").fill("Test zákazu posledního aktivního rodiče");
    await parentCard.getByRole("button", { name: "Zakázat účet", exact: true }).click();
    await parentCard.getByRole("button", { name: "Potvrdit zákaz účtu", exact: true }).click();
    await expect(parentCard.getByRole("button", { name: "Povolit účet", exact: true })).toBeVisible();
    expect(await childState(child1Id)).toBe(false); expect(await childState(child2Id)).toBe(false);
    // Reactivating the parent must neither enable the children nor revive the parent's old cookie.
    parentCard = account(names.parent1); await parentCard.getByLabel("Odůvodnění změny přístupu").fill("Obnovení ověřeného rodičovského účtu");
    await parentCard.getByRole("button", { name: "Povolit účet", exact: true }).click();
    await expect(parentCard.getByRole("button", { name: "Zakázat účet", exact: true })).toBeVisible();
    expect(await childState(child1Id)).toBe(false); expect((await get(parent1, "/auth/me")).status()).toBe(401);
    await activate(names.child1); expect((await get(child, "/auth/me")).status()).toBe(401);
    await login(parentPage, names.parent1); await login(childPage, names.child1);

    // The only administrator cannot accidentally remove the club's last admin access.
    await page.goto("/admin/accounts"); const owner = account(names.admin);
    await owner.getByLabel("Systémová role").selectOption("USER"); await owner.getByLabel("Odůvodnění změny role").fill("Test ochrany posledního správce");
    await owner.getByRole("button", { name: "Uložit roli", exact: true }).click(); await expect(owner.getByRole("alert")).toBeVisible();
    expect((await (await page.request.get(apiUrl + "/auth/me")).json()).role).toBe("ADMIN");
    await parentPage.goto("/my-children"); await expect(parentPage.getByRole("article")).toHaveCount(2);
    expect(await parentPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await parentPage.screenshot({ path: testInfo.outputPath("my-children.png"), fullPage: true });
    await childPage.goto("/teams/" + teams[0].id); await expect(childPage.getByRole("article", { name: "Alex Testovací " + suffix })).toBeVisible();
    await expect(childPage.getByLabel("Soupiska ke dni")).toHaveCount(0);
    await expect(childPage.getByRole("link", { name: "Administrace", exact: true })).toHaveCount(0);
    await expect(childPage.getByRole("link", { name: "Nastavení klubu", exact: true })).toHaveCount(0);
    await expect(childPage.getByRole("link", { name: "Moje děti", exact: true })).toHaveCount(0);
    expect(await childPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await childPage.screenshot({ path: testInfo.outputPath("child-roster.png"), fullPage: true });
    await page.goto("/admin/accounts"); await expect(page.getByRole("form", { name: "Nový přístupový účet", exact: true })).toBeVisible(); await page.screenshot({ path: testInfo.outputPath("accounts.png"), fullPage: false });
  } finally { await Promise.all(contexts.map(context => context.close())); }
});
