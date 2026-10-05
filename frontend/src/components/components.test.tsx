import MockAdapter from "axios-mock-adapter";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "@/api/api";
import { AuthProvider } from "@/context/AuthContext";
import { ApiStatus } from "./ApiStatus";
import { AuthForm } from "./AuthForm";
import { Dashboard } from "./Dashboard";

const push = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

let mock: MockAdapter;
const user = { id: "00000000-0000-0000-0000-000000000001", username: "tester", role: "USER", createdAt: "2026-10-05T10:00:00Z" };
beforeEach(() => {
  mock = new MockAdapter(apiClient);
  mock.onGet("/auth/me").reply(401);
  mock.onGet("/auth/csrf").reply(200, { token: "token", headerName: "X-CSRF-TOKEN", parameterName: "_csrf" });
});
afterEach(() => { mock.restore(); });

describe("Czech UI integration", () => {
  it("ukazuje skutečnou API verzi po retry výpadku", async () => {
    mock.onGet("/info/version").networkErrorOnce();
    mock.onGet("/info/version").reply(200, { version: "0.1.0" });
    render(<ApiStatus />);
    await screen.findByText("API není dostupné");
    fireEvent.click(screen.getByRole("button", { name: /Zkusit znovu/ }));
    await screen.findByText("API je dostupné");
    expect(screen.getByText("0.1.0")).toBeInTheDocument();
  });

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
    expect(await screen.findByRole("alert")).toHaveTextContent("Hesla se neshodují.");
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
    mock.onGet("/auth/me").networkErrorOnce();
    mock.onGet("/auth/me").reply(200, user);
    render(<AuthProvider><Dashboard /></AuthProvider>);
    await screen.findByRole("heading", { name: "Session se nepodařilo ověřit." });
    expect(screen.queryByText("tester")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Zkusit znovu" }));
    await screen.findByRole("heading", { name: "Ahoj, tester." });
    expect(screen.getByText("Uživatel bez klubových oprávnění")).toBeInTheDocument();
  });
});
