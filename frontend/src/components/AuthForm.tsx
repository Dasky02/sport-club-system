"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authRegister } from "@/api/api";
import { mapErrorToMessage } from "@/api/errorMapper";
import { useAuth } from "@/context/AuthContext";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { login, user, initialized, sessionError } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [registered, setRegistered] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const passwordConfirmation = String(data.get("passwordConfirmation") ?? "");
    if (isRegister && password !== passwordConfirmation) {
      setError("Hesla se neshodují.");
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      setError("Heslo může mít nejvýše 72 bajtů. Zkraťte jej, zejména pokud obsahuje diakritiku.");
      return;
    }
    setPending(true);
    setError(null);
    try {
      if (isRegister) {
        await authRegister({ username, password });
        setRegistered(true);
      } else {
        await login({ username, password });
        router.push("/dashboard");
      }
    } catch (caught: unknown) {
      setError(mapErrorToMessage(caught));
    } finally {
      setPending(false);
    }
  };

  if (initialized && user && !sessionError) {
    return <section className="auth-card"><p className="eyebrow">Vaše session je aktivní</p><h1>Jste přihlášeni jako {user.username}.</h1><Link className="button" href="/dashboard">Otevřít můj účet</Link></section>;
  }

  if (registered) {
    return <section className="auth-card"><p className="eyebrow">Registrace dokončena</p><h1>Účet je připravený.</h1><p role="status">Účet byl vytvořen s rolí USER. Nyní se přihlaste. Klubová oprávnění vám přidělí administrátor.</p><Link className="button" href="/login">Přejít k přihlášení</Link></section>;
  }

  return (
    <section className="auth-layout">
      <div className="auth-intro"><p className="eyebrow">Sport Club System</p><h1>{isRegister ? "Začněte vlastním účtem." : "Vítejte zpátky v klubu."}</h1><p className="lead">{isRegister ? "Vytvořte si účet pro přístup do systému. Role trenéra, hráče či rodiče spravuje administrátor." : "Přihlaste se uživatelským jménem a heslem. Vaše přihlášení spravuje serverová session."}</p><Link className="back-link" href="/">← Zpět na úvod</Link></div>
      <div className="auth-card">
        <h2>{isRegister ? "Vytvořit účet" : "Přihlášení"}</h2>
        <form onSubmit={submit} aria-busy={pending}>
          <div className="field"><label htmlFor="username">Uživatelské jméno</label><input id="username" name="username" autoComplete="username" minLength={3} maxLength={50} required disabled={pending} aria-describedby="username-hint" /><span id="username-hint" className="field-hint">3–50 znaků</span></div>
          <div className="field"><label htmlFor="password">Heslo</label><input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={6} maxLength={72} required disabled={pending} aria-describedby={isRegister ? "password-hint" : undefined} />{isRegister && <span id="password-hint" className="field-hint">6–72 znaků, nejvýše 72 bajtů</span>}</div>
          {isRegister && <div className="field"><label htmlFor="passwordConfirmation">Heslo znovu</label><input id="passwordConfirmation" name="passwordConfirmation" type="password" autoComplete="new-password" minLength={6} maxLength={72} required disabled={pending} /></div>}
          {error && <p className="message message-error" role="alert">{error}</p>}
          <button className="button full-width" type="submit" disabled={pending}>{pending ? "Odesílám…" : isRegister ? "Vytvořit účet" : "Přihlásit se"}<span aria-hidden="true">→</span></button>
        </form>
        <p className="auth-switch">{isRegister ? "Už máte účet? " : "Ještě nemáte účet? "}<Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Přihlásit se" : "Zaregistrovat se"}</Link></p>
      </div>
    </section>
  );
}
