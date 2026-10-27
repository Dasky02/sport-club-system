import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8080/api";

// Explicit opt-in: this scenario claims an isolated, previously unconfigured club.
// Run each browser project against its own fresh verification database.
test("osoba, jednorázový ADMIN setup a dva sporty přes skutečné API", async ({ page }, testInfo) => {
  test.setTimeout(60_000);
  const setupToken = process.env.E2E_SETUP_TOKEN;
  test.skip(!setupToken, "Vyžaduje E2E_SETUP_TOKEN a novou izolovanou testovací databázi.");
  test.skip(testInfo.project.name !== (process.env.E2E_SETUP_PROJECT ?? "desktop"),
    "Jednorázový setup ověřuje jeden projekt nad jednou čistou databází.");

  const suffix = randomUUID().slice(0, 8);
  const username = "club-e2e-" + suffix;
  const password = "E2e-test-password-2026";
  await page.goto("/register");
  await page.getByLabel("Uživatelské jméno").fill(username);
  await page.getByLabel("Heslo", { exact: true }).fill(password);
  await page.getByLabel("Heslo znovu").fill(password);
  await page.getByRole("button", { name: "Vytvořit účet" }).click();
  await expect(page.getByRole("heading", { name: "Účet je připravený." })).toBeVisible();
  await page.goto("/login");
  await page.getByLabel("Uživatelské jméno").fill(username);
  await page.getByLabel("Heslo", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Přihlásit se" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  const csrfHeaders = async () => {
    const response = await page.request.get(apiUrl + "/auth/csrf");
    expect(response.status()).toBe(200);
    const csrf = await response.json() as { headerName: string; token: string };
    return { [csrf.headerName]: csrf.token };
  };
  const pendingClaim = await page.request.post(apiUrl + "/club/setup", {
    headers: await csrfHeaders(), data: { token: setupToken },
  });
  expect(pendingClaim.status()).toBe(403);
  expect(await pendingClaim.json()).toMatchObject({ code: "PROFILE_INCOMPLETE" });

  await page.goto("/profile");
  await page.getByLabel("Jméno", { exact: true }).fill("Testovací");
  await page.getByLabel("Příjmení", { exact: true }).fill("Správce");
  await page.getByRole("button", { name: "Uložit osobní údaje" }).click();
  await expect.poll(async () => (await (await page.request.get(apiUrl + "/auth/me")).json()).profileState)
    .toBe("COMPLETE");
  expect((await page.request.get(apiUrl + "/sports")).status()).toBe(403);

  await page.goto("/setup");
  await page.getByLabel("Instalační token").fill("incorrect-test-token");
  await page.getByRole("button", { name: "Převzít správu klubu" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  expect(await (await page.request.get(apiUrl + "/auth/me")).json()).toMatchObject({ role: "USER" });
  await page.getByLabel("Instalační token").fill(setupToken!);
  await page.getByRole("button", { name: "Převzít správu klubu" }).click();
  await expect.poll(async () => (await (await page.request.get(apiUrl + "/auth/me")).json()).role)
    .toBe("ADMIN");
  // Drop the token from the live page before any screenshot can be retained.
  await page.goto("/admin/sports");

  for (const [code, name] of [
    ["FOOTBALL_" + suffix.toUpperCase(), "Fotbal " + suffix],
    ["BASKETBALL_" + suffix.toUpperCase(), "Basketbal " + suffix],
  ]) {
    await page.getByLabel("Kód sportu").fill(code);
    await page.getByLabel("Název sportu").fill(name);
    await page.getByRole("button", { name: "Přidat sport" }).click();
    await expect(page.getByText(name, { exact: true })).toBeVisible();
  }
  const sports = await (await page.request.get(apiUrl + "/sports")).json();
  expect(sports.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "FOOTBALL_" + suffix.toUpperCase(), active: true }),
    expect.objectContaining({ code: "BASKETBALL_" + suffix.toUpperCase(), active: true }),
  ]));
  const football = page.getByRole("article", { name: "Fotbal " + suffix, exact: true });
  await football.getByRole("button", { name: "Upravit", exact: true }).click();
  const renamed = "Fotbal mládež " + suffix;
  await football.getByLabel("Nový název sportu").fill(renamed);
  await football.getByRole("button", { name: "Uložit změny" }).click();
  const renamedFootball = page.getByRole("article", { name: renamed, exact: true });
  await expect(renamedFootball).toBeVisible();
  await renamedFootball.getByRole("button", { name: "Deaktivovat" }).click();
  await expect(renamedFootball.getByText("Neaktivní", { exact: true })).toBeVisible();
  const updatedSports = await (await page.request.get(apiUrl + "/sports")).json();
  expect(updatedSports.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ code: "FOOTBALL_" + suffix.toUpperCase(), name: renamed, active: false }),
  ]));
  const repeatedClaim = await page.request.post(apiUrl + "/club/setup", {
    headers: await csrfHeaders(), data: { token: setupToken },
  });
  expect(repeatedClaim.status()).toBe(409);
  expect(await repeatedClaim.json()).toMatchObject({ code: "SETUP_ALREADY_COMPLETED" });
  await page.reload();
  await expect(page.getByText(renamed, { exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("sports.png"), fullPage: true });
});
