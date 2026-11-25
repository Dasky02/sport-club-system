"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { authRegister } from "@/api/api";
import { mapErrorToMessage, mapFieldErrors } from "@/api/errorMapper";
import { useAuth } from "@/context/AuthContext";

function loginDestination() {
  const next = new URLSearchParams(window.location.search).get("next");
  if (!next?.startsWith("/") || next.startsWith("//") || next.includes("\\")) return "/dashboard";
  const url = new URL(next, window.location.origin);
  if (url.origin !== window.location.origin || url.pathname.startsWith("//")) return "/dashboard";
  return url.pathname + url.search + url.hash;
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const isRegister = mode === "register";
  const { login, user, initialized, sessionError } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [registered, setRegistered] = useState(false);
  const errorSummary = useRef<HTMLDivElement>(null);
  const formId = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (error) errorSummary.current?.focus();
  }, [error, fieldErrors]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    const username = String(data.get("username") ?? "").trim();
    const password = String(data.get("password") ?? "");
    const passwordConfirmation = String(data.get("passwordConfirmation") ?? "");
    if (isRegister && password !== passwordConfirmation) {
      setError("Hesla se neshodují.");
      setFieldErrors({ passwordConfirmation: "Hesla se neshodují." });
      return;
    }
    if (new TextEncoder().encode(password).length > 72) {
      const message = "Heslo může mít nejvýše 72 bajtů. Zkraťte jej, zejména pokud obsahuje diakritiku.";
      setError(message);
      setFieldErrors({ password: message });
      return;
    }
    setPending(true);
    setError(null);
    setFieldErrors({});
    try {
      if (isRegister) {
        await authRegister({ username, password });
        setRegistered(true);
      } else {
        await login({ username, password });
        router.push(loginDestination());
      }
    } catch (caught: unknown) {
      setError(mapErrorToMessage(caught));
      setFieldErrors(mapFieldErrors(caught, ["username", "password"]));
    } finally {
      setPending(false);
    }
  };

  if (initialized && user && !sessionError) {
    return <section className="state-card"><h1>Jste přihlášeni jako {user.username}.</h1><Link className="button" href="/dashboard">Otevřít přehled</Link></section>;
  }

  if (registered) {
    return <section className="state-card"><h1>Účet je připravený.</h1><p role="status">Přihlaste se a doplňte osobní údaje.</p><Link className="button" href="/login">Přejít k přihlášení</Link></section>;
  }

  const fields = [
    { name: "username", label: "Uživatelské jméno", type: "text", autocomplete: "username", min: 3, max: 50, hint: isRegister ? "3–50 znaků" : "" },
    { name: "password", label: "Heslo", type: "password", autocomplete: isRegister ? "new-password" : "current-password", min: 6, max: 72, hint: isRegister ? "Alespoň 6 znaků, nejvýše 72 bajtů" : "" },
  ];
  if (isRegister) fields.push({ name: "passwordConfirmation", label: "Heslo znovu", type: "password", autocomplete: "new-password", min: 6, max: 72, hint: "" });

  return (
    <section className="auth-card">
        <h1>{isRegister ? "Vytvořit účet" : "Přihlášení"}</h1>
        <form ref={formId} onSubmit={submit} aria-busy={pending}>
          {error && (
            <div className="message message-error form-error" role="alert" ref={errorSummary} tabIndex={-1}>
              {Object.keys(fieldErrors).length ? (
                <ul>
                  {Object.entries(fieldErrors).map(([field, message]) => (
                    <li key={field}><a href={`#${field}`} onClick={(event) => {
                      event.preventDefault();
                      (formId.current?.elements.namedItem(field) as HTMLInputElement | null)?.focus();
                    }}>{message}</a></li>
                  ))}
                </ul>
              ) : error}
            </div>
          )}
          {fields.map(({ name, label, type, autocomplete, min, max, hint }) => (
            <div className="field" key={name}>
              <label htmlFor={name}>{label}</label>
              <input id={name} name={name} type={type} autoComplete={autocomplete} minLength={min} maxLength={max}
                spellCheck={false} autoCapitalize="none" required disabled={pending}
                aria-invalid={!!fieldErrors[name]}
                aria-describedby={[hint && `${name}-hint`, fieldErrors[name] && `${name}-error`].filter(Boolean).join(" ") || undefined} />
              {hint && <span id={`${name}-hint`} className="field-hint">{hint}</span>}
              {fieldErrors[name] && <span id={`${name}-error`} className="field-error">{fieldErrors[name]}</span>}
            </div>
          ))}
          <button className="button full-width" type="submit" disabled={pending}>{pending ? "Odesílám…" : isRegister ? "Vytvořit účet" : "Přihlásit se"}</button>
        </form>
        <p className="auth-switch">{isRegister ? "Už máte účet? " : "Ještě nemáte účet? "}<Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Přihlásit se" : "Zaregistrovat se"}</Link></p>
    </section>
  );
}
