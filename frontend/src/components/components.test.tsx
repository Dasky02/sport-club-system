import { completeUser, userContext } from "@/test/fixtures";
import MockAdapter from "axios-mock-adapter";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/api";
import { AuthProvider } from "@/context/AuthContext";
import { AuthForm } from "./AuthForm";
import { Dashboard } from "./Dashboard";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ push }) }));

let mock: MockAdapter;
const user = completeUser;
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mock.onGet("/auth/me").reply(401);
  mock.onGet("/me/context").reply(200, userContext);
  mock.onGet("/auth/csrf").reply(200, { token: "token", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
});
afterEach(() => { mock.restore(); });

describe("Czech UI integration", () => {
  it("registruje pouze username/password a navede na login bez předstírání aktivní session", async () => {
    mock.onPost("/auth/register").reply(201, user);
    const actor = userEvent.setup();
    render(<AuthProvider><AuthForm mode="register" /></AuthProvider>);
    await actor.type(screen.getByLabelText("Uživatelské jméno"), "tester");
    await actor.type(screen.getByLabelText("Heslo", { exact: true }), "test-password");
    await actor.type(screen.getByLabelText("Heslo znovu"), "test-password");
    await actor.click(screen.getByRole("button", { name: /Vytvořit účet/ }));
    await screen.findByRole("heading", { name: "Účet je připravený." });
    expect(JSON.parse(mock.history.post[0].data as string)).toEqual({ username: "tester", password: "test-password" });
    expect(screen.getByRole("link", { name: "Přejít k přihlášení" })).toHaveAttribute("href", "/login");
    expect(push).not.toHaveBeenCalled();
  });

  it("validuje shodu hesel a BCrypt limit UTF-8 před odesláním", async () => {
    const actor = userEvent.setup();
    render(<AuthProvider><AuthForm mode="register" /></AuthProvider>);
    await actor.type(screen.getByLabelText("Uživatelské jméno"), "tester");
    await actor.type(screen.getByLabelText("Heslo", { exact: true }), "test-password");
    await actor.type(screen.getByLabelText("Heslo znovu"), "other-password");
    await actor.click(screen.getByRole("button", { name: /Vytvořit účet/ }));
    const summary = await screen.findByRole("alert");
    expect(summary).toHaveTextContent("Hesla se neshodují.");
    expect(summary).toHaveFocus();
    await actor.click(screen.getByRole("link", { name: "Hesla se neshodují." }));
    expect(screen.getByLabelText("Heslo znovu")).toHaveFocus();
    fireEvent.change(screen.getByLabelText("Heslo", { exact: true }), { target: { value: "ě".repeat(40) } });
    fireEvent.change(screen.getByLabelText("Heslo znovu"), { target: { value: "ě".repeat(40) } });
    await actor.click(screen.getByRole("button", { name: /Vytvořit účet/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("nejvýše 72 bajtů");
    expect(mock.history.post).toHaveLength(0);
  });

  it("zobrazí odmítnutí loginu a umožní další pokus", async () => {
    mock.onPost("/auth/login").replyOnce(401, { timestamp: "2026-10-05T10:00:00Z", code: "UNAUTHORIZED", message: "Unauthorized" });
    mock.onPost("/auth/login").reply(200, user);
    const actor = userEvent.setup();
    render(<AuthProvider><AuthForm mode="login" /></AuthProvider>);
    await actor.type(screen.getByLabelText("Uživatelské jméno"), "tester");
    await actor.type(screen.getByLabelText("Heslo"), "test-password");
    await actor.click(screen.getByRole("button", { name: /Přihlásit se/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Zkontrolujte jméno a heslo");
    await actor.click(screen.getByRole("button", { name: /Přihlásit se/ }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/dashboard"));
    expect(mock.history.post).toHaveLength(2);
  });

  it("chráněný obsah zobrazí až po ověření a při výpadku nabídne retry", async () => {
    mock.resetHandlers();
    mock.onGet("/me/context").reply(200, userContext);
    mock.onGet("/auth/me").networkErrorOnce();
    mock.onGet("/auth/me").reply(200, user);
    render(<AuthProvider><Dashboard /></AuthProvider>);
    await screen.findByRole("heading", { name: "Session se nepodařilo ověřit." });
    expect(screen.queryByText("tester")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }));
    await screen.findByRole("heading", { name: "Ahoj, tester." });
    expect(screen.getByText("Běžný uživatel")).toBeInTheDocument();
  });

  it("zobrazí chybu odhlášení i po obnovení obsahu přehledu", async () => {
    mock.onGet("/auth/me").reply(200, user);
    mock.onGet("/events").reply(200, { items: [], totalPages: 0 });
    mock.onGet("/notifications/unread-count").reply(200, { count: 0 });
    mock.onPost("/auth/logout").networkError();
    render(<AuthProvider><Dashboard /></AuthProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Odhlásit se" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Odhlášení nebylo potvrzeno.");
    expect(screen.getByRole("heading", { name: "Ahoj, tester." })).toBeInTheDocument();
  });
});
