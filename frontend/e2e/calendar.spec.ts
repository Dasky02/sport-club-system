import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { clubDateKey, clubDateTimeInput } from "../src/components/events/clubTime";

const apiUrl = process.env.E2E_API_URL ?? "http://localhost:8080/api";

test("P5: navigace, plánování tréninku, kalendář a přečtení oznámení", async ({ page, isMobile }, testInfo) => {
  test.setTimeout(90_000);
  const token = process.env.E2E_SETUP_TOKEN;
  test.skip(!token || testInfo.project.name !== (process.env.E2E_SETUP_PROJECT ?? "desktop"),
    "Vyžaduje čerstvou izolovanou databázi a instalační token.");

  async function post(path: string, data: object, status = 201) {
    const response = await page.request.get(apiUrl + "/auth/csrf");
    expect(response.status()).toBe(200);
    const csrf = await response.json();
    const result = await page.request.post(apiUrl + path, { data, headers: { [csrf.headerName]: csrf.token } });
    expect(result.status(), path).toBe(status);
    return await result.json();
  }

  const account = { username: "kalendar-" + randomUUID().slice(0, 8), password: "E2e-calendar-test-password" };
  await post("/auth/register", account);
  await post("/auth/login", account, 200);
  const person = await post("/me/person", { firstName: "Testovací", lastName: "Správce", birthDate: "1990-01-01" });
  await post("/club/setup", { token }, 200);
  const now = Date.now();
  const startsAt = new Date(now + 86_400_000).toISOString();
  const endsAt = new Date(now + 90_000_000).toISOString();
  const startsOn = clubDateKey(new Date(now - 86_400_000));
  const endsOn = clubDateKey(new Date(now + 28 * 86_400_000));
  const player = await post("/players", { personId: person.id });

  await page.goto("/dashboard");
  const menu = page.getByRole("button", { name: "Menu" });
  const calendar = page.getByRole("navigation", { name: "Hlavní navigace" }).getByRole("link", { name: "Kalendář" });
  if (isMobile) {
    await expect(calendar).toBeHidden();
    await menu.click();
    await expect(calendar).toBeVisible();
    await calendar.press("Escape");
    await expect(menu).toBeFocused();
    await menu.click();
  }
  await calendar.click();
  await page.getByRole("link", { name: "Vytvořit akci" }).click();
  await page.getByRole("link", { name: "Založit sezónu" }).click();
  await page.getByLabel("Název sezóny").fill("Testovací sezóna");
  await page.getByLabel("Začátek sezóny").fill(startsOn);
  await page.getByLabel("Konec sezóny").fill(endsOn);
  await page.getByRole("button", { name: "Vytvořit sezónu" }).click();
  await expect(page.getByRole("article", { name: "Testovací sezóna" })).toBeVisible();
  await page.goto("/calendar/new");
  await expect(page.getByRole("link", { name: "Zařadit klubový tým do sezóny" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Vytvořit koncept" })).toBeDisabled();

  await page.goto("/admin/sports");
  await page.getByLabel("Kód sportu").fill("FOOTBALL");
  await page.getByLabel("Název sportu").fill("Fotbal");
  await page.getByRole("button", { name: "Přidat sport" }).click();
  await page.getByRole("link", { name: "Vytvořit tým pro Fotbal" }).click();
  await expect(page.getByLabel("Sport týmu").locator("option:checked")).toHaveText("Fotbal");
  await page.getByLabel("Název týmu", { exact: true }).fill("Testovací tým A");
  await page.getByRole("button", { name: "Vytvořit tým" }).click();
  await page.getByRole("link", { name: "Zařadit nový tým do sezóny" }).click();
  await expect(page.getByLabel("Tým k zařazení").locator("option:checked")).toHaveText("Testovací tým A · Fotbal");
  await expect(page.getByLabel("Název týmu v sezóně")).toHaveValue("Testovací tým A");
  await page.getByRole("button", { name: "Zařadit tým do sezóny" }).click();
  await page.getByRole("link", { name: "Naplánovat akci pro tým" }).click();
  await expect(page.getByRole("checkbox", { name: "Testovací tým A" })).toBeChecked();
  const eventFormUrl = page.url();
  await page.getByLabel("Typ akce").selectOption("MATCH");
  await expect(page.getByText("Pro zápas potřebujete v této sezóně dva týmy stejného sportu.")).toBeVisible();

  await page.goto("/admin/players");
  await page.getByRole("article", { name: "Testovací Správce" }).getByRole("button", { name: "Přiřadit do týmu" }).click();
  await page.getByLabel("Klubový tým v sezóně").selectOption({ label: "Testovací tým A · Fotbal · Testovací sezóna" });
  await page.getByRole("link", { name: "Nastavit členství" }).click();
  await expect(page.getByLabel("Hráč", { exact: true })).toHaveValue(player.id);
  await page.getByRole("button", { name: "Přidat hráče do týmu" }).click();
  await expect(page.getByText("Členství bylo uloženo.")).toBeVisible();
  await page.getByRole("link", { name: "Zobrazit soupisku" }).click();
  await expect(page.getByRole("article", { name: "Testovací Správce" })).toBeVisible();

  await page.goto(eventFormUrl);
  await expect(page.getByRole("checkbox", { name: "Testovací tým A" })).toBeChecked();
  await page.getByLabel("Název", { exact: true }).fill("Večerní trénink");
  await page.getByLabel("Začátek", { exact: true }).fill(clubDateTimeInput(startsAt));
  const end = page.getByLabel("Konec", { exact: true });
  await end.fill(clubDateTimeInput(startsAt));
  const save = page.getByRole("button", { name: "Vytvořit koncept" });
  await save.click();
  await expect(page.getByRole("main").getByRole("alert")).toHaveText("Konec musí následovat po začátku.");
  await expect(end).toHaveAttribute("aria-invalid", "true");
  await end.fill(clubDateTimeInput(endsAt));
  await save.click();
  await expect(page).toHaveURL(/\/events\/[^/]+$/);
  await page.getByRole("button", { name: "Zveřejnit akci" }).click();
  await expect(page.getByText("Akce zveřejněna.", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: /Dostupnost hráče Testovací Správce/ })).toBeVisible();
  await expect(page.getByRole("region", { name: /Nominace hráče/ })).toHaveCount(0);

  const month = clubDateKey(startsAt).slice(0, 7);
  await page.goto(`/calendar?month=${month}`);
  const event = page.getByRole("link", { name: /Večerní trénink/ });
  await expect(event).toBeVisible();
  await page.getByLabel("Typ akce").selectOption("MATCH");
  await expect(page).toHaveURL(/type=MATCH/);
  await expect(event).toHaveCount(0);
  await page.goBack();
  await expect(event).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("calendar.png"), fullPage: true });

  await page.goto("/dashboard");
  await expect(page.getByRole("main").getByRole("link", { name: /Večerní trénink/ })).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath("overview.png"), fullPage: true });
  await page.getByRole("main").getByRole("link", { name: /Oznámení/ }).click();
  await expect(page.getByText("Nepřečtená oznámení: 1")).toBeVisible();
  await page.getByRole("button", { name: "Označit jako přečtené" }).click();
  await expect(page.getByText("Nepřečtená oznámení: 0")).toBeVisible();
});
