import MockAdapter from "axios-mock-adapter";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/api";
import type { AccountContext, SportResponse, UserResponse } from "@/api/types";
import { AuthProvider } from "@/context/AuthContext";
import { adminContext, adminUser, completeUser, pendingUser, person, userContext } from "@/test/fixtures";
import { PersonProfile } from "./PersonProfile";
import { ClubSetup } from "./ClubSetup";
import { SportsManager } from "./SportsManager";
import { SiteHeader } from "./SiteHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard" }));

let mock: MockAdapter;
let identity: UserResponse;
let context: AccountContext;
const emptyPage = { items: [], page: 0, size: 20, totalElements: "0", totalPages: 0 };
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  identity = { ...pendingUser };
  context = { ...userContext };
  mock.onGet("/auth/me").reply(() => [200, identity]);
  mock.onGet("/me/context").reply(() => [200, context]);
  mock.onGet("/auth/csrf").reply(200, { token: "csrf", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
});
afterEach(() => { mock.restore(); vi.restoreAllMocks(); });

describe("P1 person onboarding", () => {
  it("uloží skutečnou vlastní osobu bez privilegovaných polí a obnoví profil i kontext", async () => {
    mock.onPost("/me/person").reply(() => { identity = completeUser; return [201, person]; });
    mock.onGet("/me/person").reply(200, person);
    const actor = userEvent.setup();
    render(<AuthProvider><PersonProfile /></AuthProvider>);
    await screen.findByRole("heading", { name: "Vaše osobní údaje" });
    expect(mock.history.get.filter((request) => request.url === "/me/person")).toHaveLength(0);
    await actor.type(screen.getByLabelText("Jméno", { exact: true }), "  Jan  ");
    await actor.type(screen.getByLabelText("Příjmení"), "Novák");
    await actor.click(screen.getByRole("button", { name: "Uložit osobní údaje" }));
    await screen.findByRole("heading", { name: "Váš profil je dokončený." });
    await screen.findByRole("heading", { name: "Jan Novák" });
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ firstName: "Jan", lastName: "Novák", birthDate: null, email: null, phone: null });
    expect(mock.history.get.filter((request) => request.url === "/auth/me")).toHaveLength(2);
    expect(mock.history.get.filter((request) => request.url === "/me/context")).toHaveLength(2);
  });

  it("zachová údaje při serverové validaci a nikdy nevykreslí rejectedValue/details", async () => {
    mock.onPost("/me/person").reply(400, { timestamp: "2026-10-27T10:00:00Z", code: "VALIDATION_ERROR", message: "secret", details: "secret", fieldErrors: [{ field: "firstName", code: "Size", message: "secret", rejectedValue: "secret" }, { field: "role", message: "ADMIN" }] });
    const actor = userEvent.setup();
    render(<AuthProvider><PersonProfile /></AuthProvider>);
    await screen.findByRole("heading", { name: "Vaše osobní údaje" });
    await actor.type(screen.getByLabelText("Jméno", { exact: true }), "Jan");
    await actor.type(screen.getByLabelText("Příjmení"), "Novák");
    await actor.click(screen.getByRole("button", { name: "Uložit osobní údaje" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Zkontrolujte označená pole.");
    expect(screen.getByLabelText("Jméno", { exact: true })).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Jméno", { exact: true })).toHaveValue("Jan");
    expect(screen.queryByText(/secret/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText("role")).not.toBeInTheDocument();
    expect(mock.history.post).toHaveLength(1);
  });

  it("odmítne jméno z mezer bez mutace a dovolí opravu", async () => {
    const actor = userEvent.setup();
    render(<AuthProvider><PersonProfile /></AuthProvider>);
    await screen.findByRole("heading", { name: "Vaše osobní údaje" });
    await actor.type(screen.getByLabelText("Jméno", { exact: true }), "   ");
    await actor.type(screen.getByLabelText("Příjmení"), "Novák");
    await actor.click(screen.getByRole("button", { name: "Uložit osobní údaje" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Zkontrolujte označená pole.");
    expect(mock.history.post).toHaveLength(0);
  });

  it("výpadek načtení dokončené osoby má retry a nevytváří druhou osobu", async () => {
    identity = completeUser;
    mock.onGet("/me/person").networkErrorOnce();
    mock.onGet("/me/person").reply(200, person);
    render(<AuthProvider><PersonProfile /></AuthProvider>);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }));
    await screen.findByRole("heading", { name: "Jan Novák" });
    expect(screen.queryByRole("button", { name: "Uložit osobní údaje" })).not.toBeInTheDocument();
    expect(mock.history.post).toHaveLength(0);
  });
});

describe("P1 safe club setup", () => {
  it("PENDING profil má zakázaný setup bez dotazu na chráněný status", async () => {
    render(<AuthProvider><ClubSetup /></AuthProvider>);
    await screen.findByRole("heading", { name: "Nejprve doplňte osobní údaje." });
    expect(screen.getByLabelText("Instalační token")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Převzít správu klubu" })).toBeDisabled();
    expect(mock.history.get.filter((request) => request.url === "/club/setup-status")).toHaveLength(0);
    expect(screen.getByRole("link", { name: "Doplnit osobní údaje" })).toHaveAttribute("href", "/profile");
  });

  it.each([
    { completed: true, available: false, expected: "Správa klubu je již nastavená." },
    { completed: false, available: false, expected: /Převzetí správy není nakonfigurované/ },
  ])("neumožní odeslání pro completed=$completed / available=$available", async ({ completed, available, expected }) => {
    identity = completeUser;
    mock.onGet("/club/setup-status").reply(200, { completed, available, clubName: "Sportovní klub" });
    render(<AuthProvider><ClubSetup /></AuthProvider>);
    await screen.findByText(expected);
    expect(screen.getByLabelText("Instalační token")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Převzít správu klubu" })).toBeDisabled();
    expect(mock.history.post).toHaveLength(0);
  });

  it("CHILD se ke statusu ani k tokenovému formuláři nedostane", async () => {
    identity = { ...completeUser, accountType: "CHILD" };
    context = { ...userContext, accountType: "CHILD" };
    render(<AuthProvider><ClubSetup /></AuthProvider>);
    await screen.findByRole("heading", { name: "Převzetí správy není pro tento účet povolené." });
    expect(screen.queryByLabelText("Instalační token")).not.toBeInTheDocument();
    expect(mock.history.get.filter((request) => request.url === "/club/setup-status")).toHaveLength(0);
  });

  it("odmítnutý token vymaže z pole a nepersistuje jej ani nezobrazí serverové tajné hodnoty", async () => {
    identity = completeUser;
    const secret = "private-setup-value";
    const storage = vi.spyOn(Storage.prototype, "setItem");
    mock.onGet("/club/setup-status").reply(200, { completed: false, available: true, clubName: "Sportovní klub" });
    mock.onPost("/club/setup").reply(403, { timestamp: "2026-10-27T10:00:00Z", code: "FORBIDDEN", message: secret, details: secret });
    const actor = userEvent.setup();
    render(<AuthProvider><ClubSetup /></AuthProvider>);
    await screen.findByRole("heading", { name: "Sportovní klub" });
    await actor.type(screen.getByLabelText("Instalační token"), secret);
    await actor.click(screen.getByRole("button", { name: "Převzít správu klubu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Token nebyl přijat");
    expect(screen.getByLabelText("Instalační token")).toHaveValue("");
    expect(screen.queryByText(secret)).not.toBeInTheDocument();
    expect(storage).not.toHaveBeenCalled();
    expect(window.location.href).not.toContain(secret);
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ token: secret });
    expect(mock.history.post).toHaveLength(1);
  });

  it("úspěšné převzetí obnoví aktuální ADMIN roli, kontext i navigaci", async () => {
    identity = completeUser;
    let completed = false;
    mock.onGet("/club/setup-status").reply(() => [200, { completed, available: !completed, clubName: "Sportovní klub" }]);
    mock.onPost("/club/setup").reply(() => { completed = true; identity = adminUser; context = adminContext; return [200, adminUser]; });
    const actor = userEvent.setup();
    render(<AuthProvider><SiteHeader /><ClubSetup /></AuthProvider>);
    await screen.findByRole("heading", { name: "Sportovní klub" });
    expect(screen.queryByRole("link", { name: "Správa sportů" })).not.toBeInTheDocument();
    await actor.type(screen.getByLabelText("Instalační token"), "setup-token");
    await actor.click(screen.getByRole("button", { name: "Převzít správu klubu" }));
    await screen.findByText("Správa klubu je již nastavená.");
    expect(screen.getByRole("link", { name: "Správa sportů" })).toHaveAttribute("href", "/admin/sports");
    expect(screen.getByRole("link", { name: "Otevřít správu sportů" })).toBeInTheDocument();
    expect(mock.history.get.filter((request) => request.url === "/me/context")).toHaveLength(2);
  });
});

describe("P1 sports administration", () => {
  it.each([
    { user: completeUser, ctx: userContext, heading: "Tato stránka vyžaduje oprávnění správce." },
    { user: { ...completeUser, accountType: "CHILD" as const }, ctx: { ...adminContext, accountType: "CHILD" as const }, heading: "Tato stránka vyžaduje oprávnění správce." },
    { user: { ...pendingUser, role: "ADMIN" as const }, ctx: adminContext, heading: "Nejprve doplňte osobní údaje." },
  ])("zabrání neoprávněnému načtení sportů pro $user.role/$user.accountType/$user.profileState", async ({ user, ctx, heading }) => {
    identity = user;
    context = ctx;
    render(<AuthProvider><SportsManager /></AuthProvider>);
    await screen.findByRole("heading", { name: heading });
    expect(mock.history.get.filter((request) => request.url === "/sports")).toHaveLength(0);
    expect(screen.queryByRole("button", { name: "Přidat sport" })).not.toBeInTheDocument();
  });

  it("zobrazí síťovou chybu a po retry skutečný prázdný seznam", async () => {
    identity = adminUser; context = adminContext;
    mock.onGet("/sports").networkErrorOnce();
    mock.onGet("/sports").reply(200, emptyPage);
    render(<AuthProvider><SportsManager /></AuthProvider>);
    await screen.findByRole("alert");
    fireEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }));
    await screen.findByRole("heading", { name: "Zatím nejsou evidované žádné sporty." });
    expect(screen.getByRole("button", { name: "Předchozí stránka" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Další stránka" })).toBeDisabled();
  });

  it("přidá, přejmenuje a deaktivuje sport přes reálný transport bez DELETE/code v PATCH", async () => {
    identity = adminUser; context = adminContext;
    let sports: SportResponse[] = [];
    mock.onGet("/sports").reply(() => [200, { ...emptyPage, items: sports, totalElements: String(sports.length), totalPages: sports.length ? 1 : 0 }]);
    mock.onPost("/sports").reply((request) => { sports = [{ id: "sport-1", ...JSON.parse(request.data as string), active: true }]; return [201, sports[0]]; });
    mock.onPatch("/sports/sport-1").reply((request) => { sports = [{ ...sports[0], ...JSON.parse(request.data as string) }]; return [200, sports[0]]; });
    const actor = userEvent.setup();
    render(<AuthProvider><SportsManager /></AuthProvider>);
    await screen.findByRole("heading", { name: "Zatím nejsou evidované žádné sporty." });
    await actor.type(screen.getByLabelText("Kód sportu"), "football");
    await actor.type(screen.getByLabelText("Název sportu"), "Fotbal");
    await actor.click(screen.getByRole("button", { name: "Přidat sport" }));
    let card = await screen.findByRole("article", { name: "Fotbal" });
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ code: "FOOTBALL", name: "Fotbal" });
    await actor.click(within(card).getByRole("button", { name: "Upravit" }));
    await actor.clear(within(card).getByLabelText("Nový název sportu"));
    await actor.type(within(card).getByLabelText("Nový název sportu"), "Fotbal mládež");
    await actor.click(within(card).getByRole("button", { name: "Uložit změny" }));
    card = await screen.findByRole("article", { name: "Fotbal mládež" });
    await actor.click(within(card).getByRole("button", { name: "Deaktivovat" }));
    card = await screen.findByRole("article", { name: "Fotbal mládež" });
    expect(within(card).getByText("Neaktivní")).toBeInTheDocument();
    expect(JSON.parse(mock.history.patch[0].data as string)).toEqual({ name: "Fotbal mládež" });
    expect(JSON.parse(mock.history.patch[1].data as string)).toEqual({ active: false });
    expect(mock.history.delete).toHaveLength(0);
  });

  it("deaktivace ze staré karty nepřepíše mezitím změněný název sportu", async () => {
    identity = adminUser; context = adminContext;
    let serverSport: SportResponse = { id: "sport-1", code: "FOOTBALL", name: "Fotbal", active: true };
    mock.onGet("/sports").reply(() => [200, { ...emptyPage, items: [serverSport], totalElements: "1", totalPages: 1 }]);
    mock.onPatch("/sports/sport-1").reply((request) => {
      serverSport = { ...serverSport, ...JSON.parse(request.data as string) };
      return [200, serverSport];
    });
    const actor = userEvent.setup();
    render(<AuthProvider><SportsManager /></AuthProvider>);
    const card = await screen.findByRole("article", { name: "Fotbal" });
    serverSport = { ...serverSport, name: "Fotbal – změna druhým správcem" };
    await actor.click(within(card).getByRole("button", { name: "Deaktivovat" }));
    const updated = await screen.findByRole("article", { name: "Fotbal – změna druhým správcem" });
    expect(within(updated).getByText("Neaktivní")).toBeInTheDocument();
    expect(JSON.parse(mock.history.patch[0].data as string)).toEqual({ active: false });
    expect(serverSport.name).toBe("Fotbal – změna druhým správcem");
  });

  it("stránkuje od nuly s velikostí 20 a nezobrazuje předchozí stránku jako novou", async () => {
    identity = adminUser; context = adminContext;
    const sports = Array.from({ length: 20 }, (_, index) => ({ id: `sport-${index}`, code: `SPORT_${index}`, name: `Sport ${index}`, active: true }));
    mock.onGet("/sports").reply((request) => request.params.page === 0
      ? [200, { items: sports, page: 0, size: 20, totalElements: "21", totalPages: 2 }]
      : [200, { items: [{ id: "basketball", code: "BASKETBALL", name: "Basketbal", active: true }], page: 1, size: 20, totalElements: "21", totalPages: 2 }]);
    const actor = userEvent.setup();
    render(<AuthProvider><SportsManager /></AuthProvider>);
    await screen.findByRole("article", { name: "Sport 0" });
    await actor.click(screen.getByRole("button", { name: "Další stránka" }));
    await screen.findByRole("article", { name: "Basketbal" });
    expect(screen.queryByRole("article", { name: "Sport 0" })).not.toBeInTheDocument();
    expect(mock.history.get.filter((request) => request.url === "/sports").map((request) => request.params)).toEqual([{ page: 0, size: 20 }, { page: 1, size: 20 }]);
    expect(screen.getByRole("button", { name: "Další stránka" })).toBeDisabled();
  });

  it("403 po odebrání práv skryje formulář a dovolí obnovit aktuální kontext bez retry mutace", async () => {
    identity = adminUser; context = adminContext;
    mock.onGet("/sports").reply(403, { timestamp: "2026-10-27T10:00:00Z", code: "FORBIDDEN", message: "Forbidden" });
    render(<AuthProvider><SportsManager /></AuthProvider>);
    await screen.findByRole("alert");
    expect(screen.queryByLabelText("Kód sportu")).not.toBeInTheDocument();
    identity = completeUser; context = userContext;
    fireEvent.click(screen.getByRole("button", { name: "Obnovit ověření přístupu" }));
    await screen.findByRole("heading", { name: "Tato stránka vyžaduje oprávnění správce." });
    expect(mock.history.get.filter((request) => request.url === "/sports")).toHaveLength(1);
    expect(mock.history.post).toHaveLength(0);
  });

  it("duplicita vrátí opravitelný konflikt a zachová vyplněný kód", async () => {
    identity = adminUser; context = adminContext;
    mock.onGet("/sports").reply(200, emptyPage);
    mock.onPost("/sports").reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "DUPLICATE_RESOURCE", message: "SQL secret" });
    const actor = userEvent.setup();
    render(<AuthProvider><SportsManager /></AuthProvider>);
    await screen.findByLabelText("Kód sportu");
    await actor.type(screen.getByLabelText("Kód sportu"), "FOOTBALL");
    await actor.type(screen.getByLabelText("Název sportu"), "Fotbal");
    await actor.click(screen.getByRole("button", { name: "Přidat sport" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Záznam se stejným jedinečným údajem již existuje.");
    expect(screen.getByLabelText("Kód sportu")).toHaveValue("FOOTBALL");
    await waitFor(() => expect(screen.getByRole("button", { name: "Přidat sport" })).toBeEnabled());
    expect(mock.history.post).toHaveLength(1);
  });
});
