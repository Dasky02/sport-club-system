import { adminContext, adminUser, completeUser, userContext } from "@/test/fixtures";
import MockAdapter from "axios-mock-adapter";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { apiClient } from "@/api/api";
import type { AccountContext } from "@/api/types";
import { AuthProvider, useAuth } from "./AuthContext";

const user = completeUser;
let mock: MockAdapter;
beforeEach(() => { mock = new MockAdapter(apiClient); mock.onGet("/me/context").reply(200, userContext); });
afterEach(() => { mock.restore(); });

function Consumer() {
  const { user, context, loading, initialized, sessionError, login, logout, refreshUser } = useAuth();
  return <><p>{!initialized || loading ? "loading" : sessionError ? "api-error" : user?.username ?? "anonymous"}</p><output data-testid="role">{user?.role ?? "none"}</output><output data-testid="capabilities">{context?.capabilities.join(",") || "none"}</output><button onClick={() => void refreshUser()}>Retry</button><button onClick={() => void login({ username: "tester", password: "test-password" }).catch(() => undefined)}>Login</button><button onClick={() => void logout().catch(() => undefined)}>Logout</button></>;
}

describe("AuthProvider integration with API client", () => {
  it("obnoví session po mountu a reloadu", async () => {
    mock.onGet("/auth/me").reply(200, user);
    const first = render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("tester");
    first.unmount();
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("tester");
    expect(mock.history.get.filter((request) => request.url === "/auth/me")).toHaveLength(2);
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

  it("výpadek kontextu se liší od odhlášení a retry znovu načte účet i kontext", async () => {
    mock.onGet("/auth/me").reply(200, user);
    let calls = 0;
    mock.onGet("/me/context").reply(() => ++calls === 1 ? [503] : [200, userContext]);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("api-error");
    expect(screen.queryByText("anonymous")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("tester");
    expect(mock.history.get.filter((request) => request.url === "/auth/me")).toHaveLength(2);
    expect(mock.history.get.filter((request) => request.url === "/me/context")).toHaveLength(2);
  });

  it("obnovení účtu odstraní odebranou ADMIN roli i její schopnosti", async () => {
    let admin = true;
    mock.onGet("/auth/me").reply(() => [200, admin ? adminUser : user]);
    mock.onGet("/me/context").reply(() => [200, admin ? adminContext : userContext]);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await screen.findByText("tester");
    expect(screen.getByTestId("role")).toHaveTextContent("ADMIN");
    expect(screen.getByTestId("capabilities")).toHaveTextContent("MANAGE_SPORTS");
    admin = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("tester");
    expect(screen.getByTestId("role")).toHaveTextContent("USER");
    expect(screen.getByTestId("capabilities")).toHaveTextContent("none");
  });

  it("opožděný kontext po úspěšném logoutu neobnoví uživatele ani oprávnění", async () => {
    let resolveContext: (value: [number, AccountContext]) => void = () => undefined;
    mock.onGet("/auth/me").reply(200, adminUser);
    mock.onGet("/me/context").reply(() => new Promise<[number, AccountContext]>((resolve) => { resolveContext = resolve; }));
    mock.onGet("/auth/csrf").reply(200, { token: "token", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
    mock.onPost("/auth/logout").reply(200);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(mock.history.get.filter((request) => request.url === "/me/context")).toHaveLength(1));
    fireEvent.click(screen.getByRole("button", { name: "Logout" }));
    await screen.findByText("anonymous");
    await act(async () => { resolveContext([200, adminContext]); });
    expect(screen.getByText("anonymous")).toBeInTheDocument();
    expect(screen.getByTestId("capabilities")).toHaveTextContent("none");
    expect(screen.getByTestId("role")).toHaveTextContent("none");
  });

  it("starý kontext nepřepíše novější refresh se změněnými oprávněními", async () => {
    let resolveContext: (value: [number, AccountContext]) => void = () => undefined;
    let admin = true;
    let calls = 0;
    mock.onGet("/auth/me").reply(() => [200, admin ? adminUser : user]);
    mock.onGet("/me/context").reply(() => ++calls === 1
      ? new Promise<[number, AccountContext]>((resolve) => { resolveContext = resolve; })
      : [200, userContext]);
    render(<AuthProvider><Consumer /></AuthProvider>);
    await waitFor(() => expect(mock.history.get.filter((request) => request.url === "/me/context")).toHaveLength(1));
    admin = false;
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await screen.findByText("tester");
    await act(async () => { resolveContext([200, adminContext]); });
    expect(screen.getByTestId("role")).toHaveTextContent("USER");
    expect(screen.getByTestId("capabilities")).toHaveTextContent("none");
  });
});
