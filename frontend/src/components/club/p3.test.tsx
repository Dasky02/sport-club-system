import MockAdapter from "axios-mock-adapter";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/api";
import type { AccountContext, UserResponse } from "@/api/types";
import { AuthProvider } from "@/context/AuthContext";
import { adminContext, adminUser, completeUser, person, userContext } from "@/test/fixtures";
import { AccountsManager } from "./AccountsManager";
import { GuardiansManager } from "./GuardiansManager";
import { ChildProfile, MyChildren } from "./ChildrenViews";
import { PersonProfile } from "../PersonProfile";
import { Dashboard } from "../Dashboard";

vi.mock("next/navigation", () => ({ usePathname: () => "/admin/accounts" }));
let mock: MockAdapter; let identity: UserResponse; let context: AccountContext;
const empty = { items: [], page: 0, size: 20, totalElements: "0", totalPages: 0 };
const pageOf = <T,>(items: T[]) => ({ ...empty, items, totalElements: String(items.length), totalPages: items.length ? 1 : 0 });
const childPerson = { ...person, id: "child-person", firstName: "Eliška", lastName: "Testovací", birthDate: "2013-01-01" };
const parentPerson = { ...person, id: "parent-person", firstName: "Jana", lastName: "Testovací" };
const child = { ...completeUser, id: "child-account", username: "child", personId: childPerson.id, accountType: "CHILD" as const, enabled: false, firstName: childPerson.firstName, lastName: childPerson.lastName };
const fullContext: AccountContext = { ...adminContext, capabilities: ["MANAGE_CLUB", "MANAGE_PLAYERS", "MANAGE_ACCOUNTS", "MANAGE_GUARDIANS"] };
beforeEach(() => {
  mock = new MockAdapter(apiClient); identity = adminUser; context = fullContext;
  mock.onGet("/auth/me").reply(() => [200, identity]); mock.onGet("/me/context").reply(() => [200, context]);
  mock.onGet("/auth/csrf").reply(200, { token: "csrf", headerName: "X-CSRF-TOKEN" });
});
afterEach(() => { mock.restore(); vi.restoreAllMocks(); });
const view = (node: React.ReactNode) => render(<AuthProvider>{node}</AuthProvider>);

describe("P3 formuláře a omezení", () => {
  it("běžný uživatel nevyvolá admin seznamy osob ani účtů", async () => {
    identity = completeUser; context = userContext; view(<AccountsManager />);
    await screen.findByRole("heading", { name: "Tato stránka vyžaduje oprávnění správce." });
    expect(mock.history.get.map(request => request.url)).not.toContain("/admin/users"); expect(mock.history.get.map(request => request.url)).not.toContain("/persons");
  });
  it("admin založí dětský účet na vybrané osobě bez role/enabled a vymaže heslo i při konfliktu", async () => {
    mock.onGet("/persons").reply(200, pageOf([childPerson])); mock.onGet("/admin/users").reply(200, empty);
    mock.onPost("/admin/users").reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "DUPLICATE_RESOURCE", message: "test-secret-must-not-render" });
    const actor = userEvent.setup(); view(<AccountsManager />); const form = await screen.findByRole("form", { name: "Nový přístupový účet" });
    await actor.selectOptions(within(form).getByLabelText("Ověřená osoba"), childPerson.id); await actor.type(within(form).getByLabelText("Uživatelské jméno"), "child-test"); await actor.type(within(form).getByLabelText("První heslo"), "test-password"); await actor.selectOptions(within(form).getByLabelText("Typ nového účtu"), "CHILD"); await actor.click(within(form).getByRole("button", { name: "Vytvořit přístupový účet" }));
    expect(await within(form).findByRole("alert")).toHaveTextContent("jedinečným"); expect(within(form).getByLabelText("První heslo")).toHaveValue(""); expect(within(form).getByLabelText("Uživatelské jméno")).toHaveValue("child-test");
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ personId: childPerson.id, username: "child-test", password: "test-password", accountType: "CHILD" }); expect(mock.history.post).toHaveLength(1); expect(screen.queryByText("test-secret-must-not-render")).not.toBeInTheDocument();
  });
  it("rodičovskou osobu vytvoří bez hráčského profilu a přihlašovacích polí", async () => {
    mock.onGet("/persons").reply(200, empty); mock.onGet("/admin/users").reply(200, empty); mock.onPost("/persons").reply(201, parentPerson);
    const actor = userEvent.setup(); view(<AccountsManager />); const form = await screen.findByRole("form", { name: "Nová osoba pro účet" });
    await actor.type(within(form).getByLabelText("Jméno", { exact: true }), "Jana"); await actor.type(within(form).getByLabelText("Příjmení"), "Testovací"); await actor.click(within(form).getByRole("button", { name: "Vytvořit osobu" }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1)); expect(mock.history.post[0].url).toBe("/persons"); expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ firstName: "Jana", lastName: "Testovací", birthDate: null, email: null, phone: null });
  });
  it("CHILD se aktivuje samostatným endpointem, nikoli obecným enabled PATCH", async () => {
    mock.onGet("/persons").reply(200, pageOf([childPerson])); mock.onGet("/admin/users").reply(200, pageOf([child])); mock.onPost("/admin/users/child-account/activate").reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "STATE_CONFLICT", message: "private state" });
    const actor = userEvent.setup(); view(<AccountsManager />); const card = await screen.findByRole("article", { name: "child" });
    expect(within(card).queryByRole("button", { name: "Povolit účet" })).not.toBeInTheDocument(); expect(within(card).getByRole("button", { name: "Uložit roli" })).toBeDisabled(); await actor.type(within(card).getByLabelText("Odůvodnění změny přístupu"), "Rodič ověřen"); await actor.click(within(card).getByRole("button", { name: "Aktivovat dětský účet" }));
    await within(card).findByRole("alert"); expect(mock.history.post[0].url).toBe("/admin/users/child-account/activate"); expect(mock.history.patch).toHaveLength(0);
  });
  it.each(["disable", "type"] as const)("bez potvrzení neodešle bezpečnostní změnu %s a po potvrzení přiloží důvod", async operation => {
    const account = { ...child, id: "parent-account", username: "parent", accountType: "STANDARD", enabled: true };
    mock.onGet("/persons").reply(200, pageOf([parentPerson])); mock.onGet("/admin/users").reply(200, pageOf([account])); mock.onPatch().reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "STATE_CONFLICT", message: "private" });
    const actor = userEvent.setup(); view(<AccountsManager />); const card = await screen.findByRole("article", { name: "parent" });
    if (operation === "disable") { await actor.type(within(card).getByLabelText("Odůvodnění změny přístupu"), "Ověřená změna"); await actor.click(within(card).getByRole("button", { name: "Zakázat účet" })); }
    else { await actor.selectOptions(within(card).getByLabelText("Typ účtu", { exact: true }), "CHILD"); await actor.type(within(card).getByLabelText("Odůvodnění změny typu"), "Ověřená změna"); await actor.click(within(card).getByRole("button", { name: "Uložit typ účtu" })); }
    expect(mock.history.patch).toHaveLength(0); expect(within(card).getByText(/Historie hráče|sportovní historie/)).toBeInTheDocument(); await actor.click(within(card).getByRole("button", { name: operation === "disable" ? "Potvrdit zákaz účtu" : "Potvrdit změnu typu účtu" })); await within(card).findByRole("alert");
    expect(mock.history.patch).toHaveLength(1); expect(JSON.parse(mock.history.patch[0].data as string)).toEqual(operation === "disable" ? { enabled: false, reason: "Ověřená změna" } : { accountType: "CHILD", reason: "Ověřená změna" });
  });
  it("po vlastní bezpečnostní změně znovu ověří session a po 401 odstraní admin data", async () => {
    mock.onGet("/persons").reply(200, empty); mock.onGet("/admin/users").reply(200, pageOf([{ ...adminUser, enabled: true, firstName: "Jan", lastName: "Správce" }])); mock.onPatch(`/admin/users/${adminUser.id}/role`).reply(() => { mock.onGet("/auth/me").reply(401); return [200, { ...adminUser, role: "USER" }]; });
    const actor = userEvent.setup(); view(<AccountsManager />); const form = await screen.findByRole("form", { name: `Role účtu ${adminUser.username}` }); await actor.selectOptions(within(form).getByLabelText("Systémová role"), "USER"); await actor.type(within(form).getByLabelText("Odůvodnění změny role"), "Správu převezme jiný správce"); await actor.click(within(form).getByRole("button", { name: "Uložit roli" })); await screen.findByRole("heading", { name: "Pro přístup se přihlaste." }); expect(screen.queryByRole("article", { name: adminUser.username })).not.toBeInTheDocument(); expect(screen.queryByRole("form", { name: "Nový přístupový účet" })).not.toBeInTheDocument();
  });
  it("nepropojený účet zachová identitu při výslovném výběru existující osoby", async () => {
    mock.onGet("/persons").reply(200, pageOf([parentPerson])); mock.onGet("/admin/users").reply(200, pageOf([{ ...child, id: "pending", username: "pending-parent", accountType: "STANDARD", personId: null, profileState: "PENDING", firstName: null, lastName: null }])); mock.onPost("/admin/users/pending/person-link").reply(200, {});
    const actor = userEvent.setup(); view(<AccountsManager />); const form = await screen.findByRole("form", { name: "Propojení osoby pending-parent" }); await actor.selectOptions(within(form).getByLabelText("Osoba pro propojení"), parentPerson.id); await actor.type(within(form).getByLabelText("Odůvodnění propojení"), "Identita ověřena"); await actor.click(within(form).getByRole("button", { name: "Propojit ověřenou osobu" }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1)); expect(mock.history.post[0].url).toBe("/admin/users/pending/person-link"); expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ personId: parentPerson.id, reason: "Identita ověřena" });
  });
  it("správce schválí explicitní osobu a odvolá přesný složený klíč rodičovské vazby", async () => {
    const guardian = { guardianPersonId: parentPerson.id, playerId: "player", firstName: parentPerson.firstName, lastName: parentPerson.lastName, grantedBy: adminUser.id, grantedAt: "2026-10-27T10:00:00Z", revokedAt: null };
    mock.onGet("/persons").reply(200, pageOf([parentPerson, childPerson])); mock.onGet("/players").reply(200, pageOf([{ id: "player", personId: childPerson.id, firstName: childPerson.firstName, lastName: childPerson.lastName, birthDate: childPerson.birthDate }])); mock.onGet("/players/player/guardians").reply(200, pageOf([guardian])); mock.onPut("/players/player/guardians/parent-person").reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "STATE_CONFLICT", message: "already active" }); mock.onPost("/players/player/guardians/parent-person/revoke").reply(200, { ...guardian, revokedAt: "2026-10-27T11:00:00Z" });
    const actor = userEvent.setup(); view(<GuardiansManager playerId="player" />); const form = await screen.findByRole("form", { name: "Schválit rodičovskou vazbu" }); expect(within(form).queryByRole("option", { name: /Eliška/ })).not.toBeInTheDocument(); await actor.selectOptions(within(form).getByLabelText("Ověřený rodič nebo zástupce"), parentPerson.id); await actor.type(within(form).getByLabelText("Odůvodnění schválení"), "Rodič ověřen"); await actor.click(within(form).getByRole("button", { name: "Schválit rodičovskou vazbu" })); await screen.findByRole("alert"); expect(mock.history.put[0].url).toBe("/players/player/guardians/parent-person");
    const card = screen.getByRole("article", { name: "Jana Testovací" }); await actor.type(within(card).getByLabelText("Odůvodnění odvolání"), "Změna oprávnění"); await actor.click(within(card).getByRole("button", { name: "Odvolat rodičovskou vazbu" })); expect(mock.history.post).toHaveLength(0); await actor.click(within(card).getByRole("button", { name: "Potvrdit odvolání vazby" })); await waitFor(() => expect(mock.history.post).toHaveLength(1)); expect(mock.history.post[0].url).toBe("/players/player/guardians/parent-person/revoke");
  });
  it("dítě má osobní údaje pouze ke čtení bez setup linku a bez finančních dotazů", async () => {
    identity = { ...child }; context = { ...userContext, accountType: "CHILD", ownPlayerId: "player" }; mock.onGet("/me/person").reply(200, childPerson); view(<PersonProfile />);
    await screen.findByRole("heading", { name: "Eliška Testovací" }); expect(screen.queryByRole("textbox")).not.toBeInTheDocument(); expect(screen.queryByRole("link", { name: "Nastavení klubu" })).not.toBeInTheDocument(); expect(mock.history.get.every(request => !/fee|payment|finance/.test(request.url ?? ""))).toBe(true);
  });
  it("dětský dashboard nabízí vlastní sportovní profil a nemá rodičovskou ani správní navigaci", async () => {
    identity = { ...child }; context = { ...userContext, accountType: "CHILD", ownPlayerId: "player" }; view(<Dashboard />); await screen.findByRole("heading", { name: "Ahoj, child." }); expect(screen.getByRole("link", { name: "Profil a členství" })).toHaveAttribute("href", "/players/player"); expect(screen.queryByRole("link", { name: "Moje děti" })).not.toBeInTheDocument(); expect(screen.queryByRole("link", { name: "Administrace klubu" })).not.toBeInTheDocument();
  });
  it("rodič načte dvě schválené děti bez filtru cizí identity a bez soukromých údajů", async () => {
    identity = completeUser; context = { ...userContext, children: [{ playerId: "first", displayName: "Eliška Testovací", capabilities: ["READ_CHILD"] }, { playerId: "second", displayName: "Adam Testovací", capabilities: ["READ_CHILD"] }] };
    mock.onGet("/me/children").reply(200, pageOf([{ playerId: "first", displayName: "Eliška Testovací", firstName: "Eliška", lastName: "Testovací" }, { playerId: "second", displayName: "Adam Testovací", firstName: "Adam", lastName: "Testovací" }])); view(<MyChildren />);
    await screen.findByRole("article", { name: "Eliška Testovací" }); expect(screen.getByRole("article", { name: "Adam Testovací" })).toBeInTheDocument(); expect(screen.getAllByRole("link", { name: "Profil dítěte" })).toHaveLength(2); expect(mock.history.get.find(request => request.url === "/me/children")?.params).toEqual({ page: 0, size: 20 }); expect(mock.history.get.every(request => !/fee|payment|finance|persons/.test(request.url ?? ""))).toBe(true);
  });
  it("detail dítěte zachová členskou historii a nabízí jen aktuálně dostupné týmy", async () => {
    identity = completeUser; context = { ...userContext, children: [{ playerId: "first", displayName: "Eliška Testovací", capabilities: ["READ_CHILD"] }], teamContexts: [{ teamSeasonId: "current", capabilities: ["READ_TEAM"] }] };
    mock.onGet("/me/children/first").reply(200, { playerId: "first", displayName: "Eliška Testovací", firstName: "Eliška", lastName: "Testovací" }); mock.onGet("/players/first/memberships").reply(200, pageOf([{ membershipId: "old-membership", teamSeasonId: "old", displayName: "Minulý tým", seasonName: "2025", sportName: "Fotbal", validFrom: "2025-01-01", validTo: "2026-01-01" }, { membershipId: "current-membership", teamSeasonId: "current", displayName: "Současný tým", seasonName: "2026", sportName: "Basketbal", validFrom: "2026-01-01", validTo: null }])); view(<ChildProfile playerId="first" />);
    await screen.findByRole("heading", { name: "Eliška Testovací" }); expect(screen.getByRole("heading", { name: "Minulý tým" })).toBeInTheDocument(); expect(screen.getByRole("link", { name: "Zobrazit tým" })).toHaveAttribute("href", "/teams/current"); expect(screen.getAllByRole("link", { name: "Zobrazit tým" })).toHaveLength(1);
  });
  it("cizí detail dítěte po 404 nevykreslí předchozí identitu ani mock profil", async () => {
    identity = completeUser; context = userContext;
    mock.onGet("/me/children/foreign").reply(404, { timestamp: "2026-10-27T10:00:00Z", code: "NOT_FOUND", message: "foreign-child-name" }); mock.onGet("/players/foreign/memberships").reply(404); view(<ChildProfile playerId="foreign" />); expect(await screen.findByRole("alert")).toHaveTextContent("nebyl nalezen"); expect(screen.queryByText("foreign-child-name")).not.toBeInTheDocument(); expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
  it("CHILD neotevře rodičovskou stránku a vůbec nevyvolá children endpoint", async () => {
    identity = { ...child }; context = { ...userContext, accountType: "CHILD", ownPlayerId: "player" }; view(<MyChildren />); await screen.findByRole("heading", { name: "Tato stránka je dostupná pouze běžnému účtu." }); expect(mock.history.get.map(request => request.url)).not.toContain("/me/children");
  });
  it("zakázanou starou session s 401 nepovažuje za platné dětské přihlášení", async () => {
    mock.onGet("/auth/me").reply(401); view(<Dashboard />); await screen.findByRole("heading", { name: "Pro přístup se přihlaste." }); expect(screen.queryByText("child")).not.toBeInTheDocument(); expect(mock.history.get.map(request => request.url)).not.toContain("/me/context");
  });
  it("BCrypt limit se ověří před zasláním přístupového hesla", async () => {
    mock.onGet("/persons").reply(200, pageOf([childPerson])); mock.onGet("/admin/users").reply(200, empty); const actor = userEvent.setup(); view(<AccountsManager />); const form = await screen.findByRole("form", { name: "Nový přístupový účet" }); await actor.selectOptions(within(form).getByLabelText("Ověřená osoba"), childPerson.id); await actor.type(within(form).getByLabelText("Uživatelské jméno"), "tester"); fireEvent.change(within(form).getByLabelText("První heslo"), { target: { value: "ě".repeat(40) } }); await actor.click(within(form).getByRole("button", { name: "Vytvořit přístupový účet" })); expect(await within(form).findByText("Heslo může mít nejvýše 72 bajtů.")).toBeInTheDocument(); expect(mock.history.post).toHaveLength(0);
  });
});
