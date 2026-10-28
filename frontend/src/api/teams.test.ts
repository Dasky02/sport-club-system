import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "./api";
import { allPages, getRoster, getTeamSeasons, updateCoachMembership, updatePerson, updateSeason, updateTeam } from "./teams";

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  let token = 0;
  mock.onGet("/auth/csrf").reply(() => [200, { token: `csrf-${++token}`, headerName: "X-CSRF-TOKEN" }]);
});
afterEach(() => mock.restore());

describe("P2 transport", () => {
  it("zachová filtry a přesný počet bez přidání druhého /api", async () => {
    mock.onGet("/team-seasons").reply(200, { items: [], page: 2, size: 20, totalElements: "9007199254740993", totalPages: 3 });
    mock.onGet("/team-seasons/team%2Fid/players").reply(200, { items: [], page: 0, size: 20, totalElements: "0", totalPages: 0 });
    expect((await getTeamSeasons(2, 20, { seasonId: "season", sportId: "sport" })).totalElements).toBe("9007199254740993");
    await getRoster("team/id", 0, 20, "2026-10-27");
    expect(mock.history.get[0].params).toEqual({ page: 2, size: 20, seasonId: "season", sportId: "sport" });
    expect(mock.history.get[1].params).toEqual({ page: 0, size: 20, on: "2026-10-27" });
  });

  it("partial PATCH nepřepíše sport nebo intervaly, úplné PUT a interval PATCH pošlou explicitní null", async () => {
    mock.onPatch().reply(200, {}); mock.onPut().reply(200, {});
    await updateTeam("team", { name: "Nový název" });
    await updateSeason("season", { name: "Nová sezóna" });
    await updateCoachMembership("membership", { validFrom: "2026-09-01", validTo: null });
    await updatePerson("person", { firstName: "Jan", lastName: "Testovací", birthDate: "2000-01-01", email: null, phone: null });
    expect(mock.history.patch.map(request => JSON.parse(request.data as string))).toEqual([
      { name: "Nový název" }, { name: "Nová sezóna" }, { validFrom: "2026-09-01", validTo: null },
    ]);
    expect(JSON.parse(mock.history.put[0].data as string)).toMatchObject({ email: null, phone: null });
    expect([...mock.history.patch, ...mock.history.put].map(request => request.headers?.["X-CSRF-TOKEN"])).toEqual(["csrf-1", "csrf-2", "csrf-3", "csrf-4"]);
  });

  it("výběry načtou další stránky i nad první stovku", async () => {
    const calls: { page: number; size: number }[] = [];
    const rows = await allPages(async (page, size) => {
      calls.push({ page, size });
      return { items: page === 0 ? Array.from({ length: 100 }, (_, id) => ({ id })) : [{ id: 100 }], page, size, totalElements: "101", totalPages: 2 };
    });
    expect(rows).toHaveLength(101);
    expect(rows.at(-1)).toEqual({ id: 100 });
    expect(calls).toEqual([{ page: 0, size: 100 }, { page: 1, size: 100 }]);
  });
});
