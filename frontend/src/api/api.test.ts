import MockAdapter from "axios-mock-adapter";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  ApiError, apiClient, authLogin, authLogout, authRegister, getAppPrivacyPolicy,
  getAppReleaseNotes, getAppTermsOfService, getAppVersion, getMe,
} from "./api";
import { mapErrorToMessage } from "./errorMapper";

const user = { id: "00000000-0000-0000-0000-000000000001", username: "tester", role: "USER", createdAt: "2026-10-05T10:00:00Z" };
const credentials = { username: "tester", password: "test-password" };
let mock: MockAdapter;

beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.restore(); });

describe("session API client", () => {
  it("používá credentials a pouze jednu /api v URL", async () => {
    mock.onGet("/auth/me").reply(200, user);
    expect(await getMe()).toEqual(user);
    expect(apiClient.defaults.withCredentials).toBe(true);
    expect(apiClient.defaults.baseURL).toBe("http://localhost:8080/api");
    expect(mock.history.get[0].url).toBe("/auth/me");
  });

  it("získá nový CSRF token před každou mutací včetně rotace při login/logout", async () => {
    let nextToken = 0;
    mock.onGet("/auth/csrf").reply(() => [200, { token: `token-${++nextToken}`, headerName: "X-CSRF-TOKEN", parameterName: "_csrf" }]);
    mock.onPost("/auth/register").reply(201, user);
    mock.onPost("/auth/login").reply(200, user);
    mock.onPost("/auth/logout").reply(200);
    expect(await authRegister(credentials)).toEqual(user);
    expect(await authLogin(credentials)).toEqual(user);
    await authLogout();
    expect(mock.history.get).toHaveLength(3);
    expect(mock.history.post.map((request) => request.headers?.["X-CSRF-TOKEN"])).toEqual(["token-1", "token-2", "token-3"]);
    expect(mock.history.post.map((request) => request.url)).toEqual(["/auth/register", "/auth/login", "/auth/logout"]);
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual(credentials);
  });

  it("neodešle login při nedostupném CSRF endpointu", async () => {
    mock.onGet("/auth/csrf").networkError();
    await expect(authLogin(credentials)).rejects.toMatchObject({ status: 0, code: "NETWORK_ERROR" });
    expect(mock.history.post).toHaveLength(0);
  });

  it("neopakuje změnový požadavek při odmítnutí tokenu", async () => {
    mock.onGet("/auth/csrf").reply(200, { token: "expired", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
    mock.onPost("/auth/login").reply(403, { timestamp: "2026-10-05T10:00:00Z", code: "FORBIDDEN", message: "Rejected" });
    await expect(authLogin(credentials)).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
    expect(mock.history.post).toHaveLength(1);
    expect(mock.history.get).toHaveLength(1);
  });

  it("mapuje JSON chybu i ne-JSON serverovou chybu bez zveřejnění detailů", async () => {
    mock.onGet("/auth/me").replyOnce(401, { timestamp: "2026-10-05T10:00:00Z", code: "UNAUTHORIZED", message: "Details", details: "secret" });
    await expect(getMe()).rejects.toBeInstanceOf(ApiError);
    mock.onGet("/auth/me").replyOnce(502, "proxy error");
    try { await getMe(); } catch (error: unknown) {
      expect(error).toMatchObject({ status: 502, code: "502", body: null });
      expect(mapErrorToMessage(error)).toBe("API hlásí chybu. Zkuste to později.");
    }
    expect(mapErrorToMessage(new ApiError(500, "INTERNAL_SERVER_ERROR", "stack trace"))).not.toContain("stack trace");
  });

  it("informační endpointy odpovídají skutečným /info mappingům a content DTO", async () => {
    mock.onGet("/info/version").reply(200, { version: "0.1.0" });
    mock.onGet("/info/release-notes").reply(200, { content: "release" });
    mock.onGet("/info/terms-of-service").reply(200, { content: "terms" });
    mock.onGet("/info/privacy-policy").reply(200, { content: "privacy" });
    expect(await getAppVersion()).toEqual({ version: "0.1.0" });
    expect(await getAppReleaseNotes()).toEqual({ content: "release" });
    expect(await getAppTermsOfService()).toEqual({ content: "terms" });
    expect(await getAppPrivacyPolicy()).toEqual({ content: "privacy" });
  });
});
