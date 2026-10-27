import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ApiError, apiClient, mutateWithCsrf } from "./api";
import { createMyPerson, createSport, getAccountContext, getClubSetupStatus, getMyPerson, getSports, updateSport } from "./club";
import { mapErrorToMessage, mapFieldErrors } from "./errorMapper";
import { adminContext, person } from "@/test/fixtures";

let mock: MockAdapter;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  let token = 0;
  mock.onGet("/auth/csrf").reply(() => [200, { token: `token-${++token}`, headerName: "X-CSRF-TOKEN", parameterName: "_csrf" }]);
});
afterEach(() => { mock.restore(); });

describe("P1 API contracts", () => {
  it("načítá skutečnou osobu, kontext, stav setupu a stránkované sporty bez druhého /api", async () => {
    mock.onGet("/me/person").reply(200, person);
    mock.onGet("/me/context").reply(200, adminContext);
    mock.onGet("/club/setup-status").reply(200, { completed: true, available: false, clubName: "Sportovní klub" });
    mock.onGet("/sports").reply(200, { items: [], page: 1, size: 20, totalElements: "9007199254740993", totalPages: 2 });
    expect(await getMyPerson()).toEqual(person);
    expect(await getAccountContext()).toEqual(adminContext);
    expect(await getClubSetupStatus()).toMatchObject({ completed: true });
    expect((await getSports(1, 20)).totalElements).toBe("9007199254740993");
    expect(mock.history.get.at(-1)?.params).toEqual({ page: 1, size: 20 });
    expect(mock.history.get.every((request) => !request.url?.startsWith("/api"))).toBe(true);
  });

  it("POST/PUT/PATCH/DELETE získávají fresh CSRF a neopakují selhanou mutaci", async () => {
    mock.onPost("/test").reply(200, { ok: true });
    mock.onPut("/test").reply(200, { ok: true });
    mock.onPatch("/test").reply(200, { ok: true });
    mock.onDelete("/test").reply(500);
    await mutateWithCsrf("POST", "/test", { value: "post" });
    await mutateWithCsrf("PUT", "/test", { value: "put" });
    await mutateWithCsrf("PATCH", "/test", { value: "patch" });
    await expect(mutateWithCsrf("DELETE", "/test")).rejects.toMatchObject({ status: 500 });
    expect(mock.history.get).toHaveLength(4);
    expect([mock.history.post[0], mock.history.put[0], mock.history.patch[0], mock.history.delete[0]].map((request) => request.headers?.["X-CSRF-TOKEN"])).toEqual(["token-1", "token-2", "token-3", "token-4"]);
    expect(mock.history.delete).toHaveLength(1);
  });

  it("vytvoří jen vlastní osobní údaje a při editaci sportu neposílá stabilní code", async () => {
    mock.onPost("/me/person").reply(201, person);
    mock.onPost("/sports").reply(201, { id: "sport", code: "FOOTBALL", name: "Fotbal", active: true });
    mock.onPatch("/sports/sport").reply(200, { id: "sport", code: "FOOTBALL", name: "Fotbal mládež", active: false });
    await createMyPerson({ firstName: "Jan", lastName: "Novák", birthDate: null, email: null, phone: null });
    await createSport({ code: "FOOTBALL", name: "Fotbal" });
    await updateSport("sport", { name: "Fotbal mládež" });
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ firstName: "Jan", lastName: "Novák", birthDate: null, email: null, phone: null });
    expect(JSON.parse(mock.history.patch[0].data as string)).toEqual({ name: "Fotbal mládež" });
  });

  it("zachová details string a bezpečné fieldErrors; rejectedValue a neznámá pole nezobrazí", async () => {
    mock.onPost("/me/person").reply(400, {
      timestamp: "2026-10-27T10:00:00Z", code: "VALIDATION_ERROR", message: "secret-value",
      details: "secret-details", fieldErrors: [{ field: "firstName", code: "NotBlank", message: "secret-value", rejectedValue: "secret-value" }, { field: "password", message: "secret-password" }],
    });
    try {
      await createMyPerson({ firstName: "", lastName: "Novák" });
      expect.fail("Request must reject");
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).body?.details).toBe("secret-details");
      expect((error as ApiError).body?.fieldErrors?.[0]).not.toHaveProperty("rejectedValue");
      expect(mapFieldErrors(error, ["firstName", "lastName"])).toEqual({ firstName: "Zkontrolujte hodnotu tohoto pole." });
      expect(mapErrorToMessage(error)).not.toContain("secret");
    }
  });

  it.each(["DUPLICATE_RESOURCE", "PROFILE_ALREADY_LINKED", "SETUP_ALREADY_COMPLETED", "OPTIMISTIC_LOCK_CONFLICT"])("409 %s má kontextovou zprávu bez přihlašovacího boilerplate", (code) => {
    const message = mapErrorToMessage(new ApiError(409, code, "secret"));
    expect(message).not.toContain("heslo");
    expect(message).not.toContain("uživatelské jméno");
    expect(message).not.toContain("secret");
  });
});
