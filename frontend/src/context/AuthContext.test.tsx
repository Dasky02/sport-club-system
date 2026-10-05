import MockAdapter from "axios-mock-adapter";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/api/api";
import { AuthProvider, useAuth } from "./AuthContext";

const user = { id: "00000000-0000-0000-0000-000000000001", username: "tester", role: "USER", createdAt: "2026-10-05T10:00:00Z" };
let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); });
afterEach(() => { mock.restore(); });

function Consumer() {
  const { user, loading, initialized, sessionError, login, logout, refreshUser } = useAuth();
  return <><p>{!initialized || loading ? "loading" : sessionError ? "api-error" : user?.username ?? "anonymous"}</p><button onClick={() => void refreshUser()}>Retry</button><button onClick={() => void login({ username: "tester", password: "test-password" }).catch(() => undefined)}>Login</button><button onClick={() => void logout().catch(() => undefined)}>Logout</button></>;
}

describe("AuthProvider integration with API client", () => {
  it("obnoví session po mountu a reloadu", async () => {
    mock.onGet("/auth/me").reply(200, user);
    const first = render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("tester");
    first.unmount();
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("tester");
    expect(mock.history.get).toHaveLength(2);
  });

  it("rozlišuje anonymní 401 od výpadku API a dovolí retry", async () => {
    mock.onGet("/auth/me").networkErrorOnce();
    mock.onGet("/auth/me").reply(401);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("api-error");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("anonymous");
  });

  it("přihlásí a odhlásí uživatele prostřednictvím session a čerstvého CSRF", async () => {
    mock.onGet("/auth/me").reply(401);
    mock.onGet("/auth/csrf").reply(200, { token: "token", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
    mock.onPost("/auth/login").reply(200, user);
    mock.onPost("/auth/logout").reply(200);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("anonymous");
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByText("tester");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await screen.findByText("anonymous");
    expect(mock.history.post.map((request) => request.headers?.["X-CSRF-TOKEN"])).toEqual(["token", "token"]);
  });

  it("při selhání logoutu nevydává session za invalidovanou", async () => {
    mock.onGet("/auth/me").reply(200, user);
    mock.onGet("/auth/csrf").reply(200, { token: "token", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
    mock.onPost("/auth/logout").networkError();
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("tester");
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await waitFor(() => expect(mock.history.post).toHaveLength(1));
    await screen.findByText("tester");
    expect(screen.queryByText("anonymous")).not.toBeInTheDocument();
  });

  it("po loginu nepřepíše stav opožděnou odpovědí původního /me", async () => {
    let resolveMe: (value: [number]) => void = () => undefined;
    mock.onGet("/auth/me").reply(() => new Promise<[number]>((resolve) => { resolveMe = resolve; }));
    mock.onGet("/auth/csrf").reply(200, { token: "token", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
    mock.onPost("/auth/login").reply(200, user);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(mock.history.get).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Login" }));
    await screen.findByText("tester");
    resolveMe([401]);
    await waitFor(() => expect(screen.getByText("tester")).toBeInTheDocument());
  });
});
