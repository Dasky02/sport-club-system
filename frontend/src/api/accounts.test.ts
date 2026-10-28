import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "./api";
import { activateChildAccount, createAccount, getAccounts, grantGuardian, linkAccountPerson, revokeGuardian, setAccountEnabled, setAccountRole, setAccountType } from "./accounts";

let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); let token = 0; mock.onGet("/auth/csrf").reply(() => [200, { token: `csrf-${++token}`, headerName: "X-CSRF-TOKEN" }]); });
afterEach(() => mock.restore());

describe("P3 transport účtů a rodinných vazeb", () => {
  it("posílá oddělené operace pouze se změněným údajem a čerstvým CSRF", async () => {
    mock.onPatch().reply(200, {}); mock.onPost().reply(200, {});
    await setAccountRole("user/id", "USER", "Ověřeno"); await setAccountType("user/id", "CHILD", "Ověřeno"); await setAccountEnabled("user/id", false, "Ověřeno"); await activateChildAccount("user/id", "Ověřeno");
    expect(mock.history.patch.map(request => [request.url, JSON.parse(request.data as string)])).toEqual([
      ["/admin/users/user%2Fid/role", { role: "USER", reason: "Ověřeno" }], ["/admin/users/user%2Fid/account-type", { accountType: "CHILD", reason: "Ověřeno" }], ["/admin/users/user%2Fid/enabled", { enabled: false, reason: "Ověřeno" }],
    ]);
    expect(mock.history.post[0].url).toBe("/admin/users/user%2Fid/activate");
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ reason: "Ověřeno" });
    expect([...mock.history.patch, ...mock.history.post].map(request => request.headers?.["X-CSRF-TOKEN"])).toEqual(["csrf-1", "csrf-2", "csrf-3", "csrf-4"]);
  });
  it("grant a revoke používají složený klíč; nepřenášejí účty ani role do vazby", async () => {
    mock.onPut().reply(200, {}); mock.onPost().reply(200, {});
    await grantGuardian("player/id", "person/id", "Ověřeno"); await revokeGuardian("player/id", "person/id", "Ověřeno"); await linkAccountPerson("user/id", "person/id", "Ověřeno");
    expect(mock.history.put[0].url).toBe("/players/player%2Fid/guardians/person%2Fid");
    expect(JSON.parse(mock.history.put[0].data as string)).toEqual({ reason: "Ověřeno" });
    expect(mock.history.post.map(request => request.url)).toEqual(["/players/player%2Fid/guardians/person%2Fid/revoke", "/admin/users/user%2Fid/person-link"]);
    expect(JSON.parse(mock.history.post[1].data as string)).toEqual({ personId: "person/id", reason: "Ověřeno" });
  });
  it("vytvoření účtu samo nepřiděluje roli nebo aktivaci; konfliktní mutace se neopakuje", async () => {
    mock.onPost("/admin/users").reply(409, { timestamp: "2026-10-27T10:00:00Z", code: "DUPLICATE_RESOURCE", message: "conflict" });
    const body = { personId: "person", username: "child", password: "test-password", accountType: "CHILD" as const };
    await expect(createAccount(body)).rejects.toMatchObject({ code: "DUPLICATE_RESOURCE" });
    expect(mock.history.post).toHaveLength(1); expect(JSON.parse(mock.history.post[0].data as string)).toEqual(body);
  });
  it("stránkování účtů zachová přesný počet jako řetězec", async () => {
    mock.onGet("/admin/users").reply(200, { items: [], page: 1, size: 20, totalElements: "9007199254740993", totalPages: 2 });
    expect((await getAccounts(1)).totalElements).toBe("9007199254740993"); expect(mock.history.get[0].params).toEqual({ page: 1, size: 20 });
  });
});
