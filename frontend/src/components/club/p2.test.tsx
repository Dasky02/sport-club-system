import MockAdapter from "axios-mock-adapter";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/api";
import type { AccountContext, UserResponse } from "@/api/types";
import { AuthProvider } from "@/context/AuthContext";
import { adminContext, adminUser, completeUser, pendingUser, person, userContext } from "@/test/fixtures";
import { SeasonsManager } from "./SeasonsManager";
import { PlayersManager } from "./PlayersManager";
import { MembershipsManager } from "./MembershipsManager";
import { TeamList, TeamRoster } from "./TeamViews";
import { intervalError } from "./Fields";
import { ResourceView, useResource } from "./Resource";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin" }));
let mock: MockAdapter;
let identity: UserResponse;
let context: AccountContext;
const empty = { items: [], page: 0, size: 20, totalElements: "0", totalPages: 0 };
const fullContext: AccountContext = { ...adminContext, capabilities: ["MANAGE_CLUB", "MANAGE_SPORTS", "MANAGE_SEASONS", "MANAGE_TEAMS", "MANAGE_PLAYERS", "MANAGE_MEMBERSHIPS"] };
const season = { id: "season", name: "2026/2027", startsOn: "2026-07-01", endsOn: "2027-07-01", archived: false };
const team = { id: "team", teamId: "base", seasonId: "season", sportId: "sport", sportName: "Fotbal", teamName: "U15", displayName: "U15 2026", isClubTeam: true, seasonName: season.name, startsOn: season.startsOn, endsOn: season.endsOn, archived: false };
const pageOf = <T,>(items: T[]) => ({ ...empty, items, totalElements: String(items.length), totalPages: items.length ? 1 : 0 });

beforeEach(() => {
  mock = new MockAdapter(apiClient); identity = adminUser; context = fullContext;
  mock.onGet("/auth/me").reply(() => [200, identity]);
  mock.onGet("/me/context").reply(() => [200, context]);
  mock.onGet("/auth/csrf").reply(200, { token: "csrf", headerName: "X-CSRF-TOKEN" });
});
afterEach(() => { mock.restore(); vi.restoreAllMocks(); });

function view(node: React.ReactNode) { return render(<AuthProvider>{node}</AuthProvider>); }

describe("P2 přístup a formuláře", () => {
  it("USER neotevře administraci hráčů a neodešle chráněné dotazy", async () => {
    identity = completeUser; context = userContext; view(<PlayersManager />);
    await screen.findByRole("heading", { name: "Tato stránka vyžaduje oprávnění správce." });
    expect(mock.history.get.map(r => r.url)).not.toContain("/persons");
    expect(mock.history.get.map(r => r.url)).not.toContain("/players");
  });
  it("PENDING nedostane seznam týmů", async () => {
    identity = pendingUser; context = userContext; view(<TeamList />);
    await screen.findByRole("heading", { name: "Nejprve doplňte osobní údaje." });
    expect(mock.history.get.map(r => r.url)).not.toContain("/team-seasons");
  });
  it("CHILD zůstává zablokovaný a soupiska se nenačítá", async () => {
    identity = { ...completeUser, accountType: "CHILD" }; context = { ...userContext, accountType: "CHILD" };
    view(<TeamRoster id="team" />);
    await screen.findByRole("heading", { name: "Klubové funkce nejsou pro tento účet dostupné." });
    expect(mock.history.get.map(r => r.url)).not.toContain("/team-seasons/team/players");
  });
  it("vytvoří sezónu a archivuje ji teprve po potvrzení, bez DELETE", async () => {
    let seasons: typeof season[] = [];
    mock.onGet("/seasons").reply(() => [200, pageOf(seasons)]);
    mock.onPost("/seasons").reply(r => { seasons = [{ ...season, ...JSON.parse(r.data as string) }]; return [201, seasons[0]]; });
    mock.onPost("/seasons/season/archive").reply(() => { seasons = [{ ...seasons[0], archived: true }]; return [200, seasons[0]]; });
    const actor = userEvent.setup(); view(<SeasonsManager />);
    await screen.findByText("Zatím nejsou vytvořené žádné sezóny.");
    await actor.type(screen.getByLabelText("Název sezóny"), season.name);
    fireEvent.change(screen.getByLabelText("Začátek sezóny"), { target: { value: season.startsOn } });
    fireEvent.change(screen.getByLabelText("Konec sezóny"), { target: { value: season.endsOn } });
    await actor.click(screen.getByRole("button", { name: "Vytvořit sezónu" }));
    let card = await screen.findByRole("article", { name: season.name });
    await actor.click(within(card).getByRole("button", { name: "Archivovat sezónu" }));
    expect(mock.history.post).toHaveLength(1);
    await actor.click(within(card).getByRole("button", { name: "Potvrdit archivaci" }));
    await screen.findByText("Archivovaná"); card = screen.getByRole("article", { name: season.name });
    expect(within(card).queryByRole("button", { name: "Upravit" })).not.toBeInTheDocument();
    expect(mock.history.delete).toHaveLength(0);
  });
  it("nový offline hráč odešle jediný atomický request bez přihlašovacích nebo rodičovských polí", async () => {
    mock.onGet("/persons").reply(200, empty); mock.onGet("/players").reply(200, empty);
    mock.onPost("/players").reply(201, { id: "player" });
    const actor = userEvent.setup(); view(<PlayersManager />);
    const form = await screen.findByRole("form", { name: "Nový hráč" });
    await actor.type(within(form).getByLabelText("Jméno", { exact: true }), "Jan");
    await actor.type(within(form).getByLabelText("Příjmení", { exact: true }), "Testovací");
    fireEvent.change(within(form).getByLabelText("Datum narození"), { target: { value: "2012-01-01" } });
    await actor.click(within(form).getByRole("button", { name: "Vytvořit hráče" }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(mock.history.post[0].url).toBe("/players");
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ person: { firstName: "Jan", lastName: "Testovací", birthDate: "2012-01-01", email: null, phone: null } });
  });
  it("hráče z evidované osoby propojí jen přes výslovně vybrané personId", async () => {
    mock.onGet("/persons").reply(200, pageOf([{ ...person, birthDate: "2000-01-01" }]));
    mock.onGet("/players").reply(200, empty); mock.onPost("/players").reply(201, { id: "player" });
    const actor = userEvent.setup(); view(<PlayersManager />);
    const form = await screen.findByRole("form", { name: "Nový hráč" });
    await actor.selectOptions(within(form).getByLabelText("Založení hráče"), "existing");
    await actor.selectOptions(within(form).getByLabelText("Evidovaná osoba"), person.id);
    await actor.click(within(form).getByRole("button", { name: "Vytvořit hráče" }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ personId: person.id });
  });
  it("trenérova soupiska neposílá historický datum filtr a zobrazuje jen minimální údaje", async () => {
    identity = completeUser; context = { ...userContext, teamContexts: [{ teamSeasonId: "team", capabilities: ["READ_TEAM"] }] };
    mock.onGet("/team-seasons/team").reply(200, team);
    mock.onGet("/team-seasons/team/players").reply(200, pageOf([{ playerId: "player", membershipId: "membership", firstName: "Jan", lastName: "Testovací", validFrom: season.startsOn, validTo: null }]));
    view(<TeamRoster id="team" />);
    await screen.findByRole("article", { name: "Jan Testovací" });
    expect(screen.queryByLabelText("Soupiska ke dni")).not.toBeInTheDocument();
    expect(mock.history.get.find(r => r.url === "/team-seasons/team/players")?.params).toEqual({ page: 0, size: 20, on: undefined });
    expect(screen.queryByText("2000-01-01")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Spravovat členství" })).not.toBeInTheDocument();
  });
  it("konflikt členství zachová rozepsaný interval a neopakuje mutaci", async () => {
    mock.onGet("/team-seasons/team").reply(200, team);
    mock.onGet("/players").reply(200, pageOf([{ id: "player", personId: "p", firstName: "Jan", lastName: "Testovací", birthDate: "2012-01-01" }]));
    mock.onGet("/admin/coach-candidates").reply(200, pageOf([{ id: adminUser.id, username: adminUser.username, firstName: "Jan", lastName: "Správce" }]));
    mock.onGet("/team-seasons/team/player-memberships").reply(200, empty);
    mock.onGet("/team-seasons/team/coach-memberships").reply(200, empty);
    mock.onPost("/team-seasons/team/player-memberships").reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "MEMBERSHIP_OVERLAP", message: "private database detail" });
    const actor = userEvent.setup(); view(<MembershipsManager id="team" />);
    const form = await screen.findByRole("form", { name: "Přidat hráčské členství" });
    await actor.selectOptions(within(form).getByLabelText("Hráč"), "player");
    await actor.click(within(form).getByRole("button", { name: "Přidat hráče do týmu" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("překrývá");
    expect(within(form).getByLabelText("Hráč")).toHaveValue("player");
    expect(within(form).getByLabelText("Začátek členství")).toHaveValue(season.startsOn);
    expect(mock.history.post).toHaveLength(1);
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ playerId: "player", validFrom: season.startsOn, validTo: null });
    expect(screen.queryByText("private database detail")).not.toBeInTheDocument();
  });
});

describe("intervaly a opožděné odpovědi", () => {
  it.each([
    ["2026-07-01", null, false], ["2026-07-01", "2027-07-01", false],
    ["2027-07-01", null, true], ["2026-06-30", null, true], ["2026-07-01", "2026-07-01", true],
  ] as const)("validuje vyloučený konec %s / %s", (from, to, invalid) => {
    expect(Boolean(intervalError(from, to, season.startsOn, season.endsOn))).toBe(invalid);
  });
  it("opožděná odpověď předchozího týmu nepřepíše nový výběr", async () => {
    let finish: (value: string) => void = () => {};
    const oldLoad = () => new Promise<string>(resolve => { finish = resolve; });
    const newLoad = () => Promise.resolve("Nový tým");
    function Probe({ load }: { load: () => Promise<string> }) {
      const { resource, reload } = useResource(load);
      return <ResourceView resource={resource} reload={reload}>{value => <p>{value}</p>}</ResourceView>;
    }
    const result = render(<Probe load={oldLoad} />);
    result.rerender(<Probe load={newLoad} />);
    await screen.findByText("Nový tým"); finish("Původní tým");
    await waitFor(() => expect(screen.queryByText("Původní tým")).not.toBeInTheDocument());
    expect(screen.getByText("Nový tým")).toBeInTheDocument();
  });
});
