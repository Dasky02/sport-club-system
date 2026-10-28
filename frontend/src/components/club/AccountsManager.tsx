"use client";

import { useCallback, useState, type FormEvent } from "react";
import { activateChildAccount, createAccount, getAccounts, linkAccountPerson, setAccountEnabled, setAccountRole, setAccountType, type AdminAccount } from "@/api/accounts";
import { allPages, createPerson, getPersons } from "@/api/teams";
import type { AccountType, PersonResponse, UserRole } from "@/api/types";
import { mapFieldErrors } from "@/api/errorMapper";
import { useAuth } from "@/context/AuthContext";
import { AccessGate } from "../AccessGate";
import { FormField } from "../FormField";
import { AdminNav } from "./AdminNav";
import { FormError, PersonFields, personFromForm, ReasonField, SelectField } from "./Fields";
import { EmptyState, Pagination, ResourceView, useResource } from "./Resource";

function NewPerson({ saved }: { saved: () => void }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null); const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const body = personFromForm(new FormData(form));
    setPending(true); setError(null); setErrors({});
    try { await createPerson(body); form.reset(); saved(); }
    catch (caught) { setError(caught); setErrors(mapFieldErrors(caught, ["firstName", "lastName", "birthDate", "email", "phone"])); }
    finally { setPending(false); }
  };
  return <form className="detail-card club-form" aria-label="Nová osoba pro účet" onSubmit={submit} aria-busy={pending}><h2>Nová osoba pro účet</h2><p>Rodič nebo jiný člen nemusí mít hráčský profil. Nejprve založte jeho osobu, poté ji vyberte při vytváření účtu.</p><PersonFields disabled={pending} errors={errors} /><FormError error={error} fieldErrors={errors} /><button className="button" disabled={pending}>{pending ? "Ukládám…" : "Vytvořit osobu"}</button></form>;
}

function NewAccount({ persons, saved }: { persons: PersonResponse[]; saved: () => void }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null); const [errors, setErrors] = useState<Record<string, string>>({});
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form); const password = String(data.get("password") ?? "");
    const passwordInput = form.elements.namedItem("password"); if (passwordInput instanceof HTMLInputElement) passwordInput.value = "";
    if (new TextEncoder().encode(password).length > 72) { setErrors({ password: "Heslo může mít nejvýše 72 bajtů." }); return; }
    setPending(true); setError(null); setErrors({});
    try { await createAccount({ personId: String(data.get("personId") ?? ""), username: String(data.get("username") ?? "").trim(), password, accountType: String(data.get("accountType")) as AccountType }); form.reset(); saved(); }
    catch (caught) { setError(caught); setErrors(mapFieldErrors(caught, ["personId", "username", "password", "accountType"])); }
    finally { const input = form.elements.namedItem("password"); if (input instanceof HTMLInputElement) input.value = ""; setPending(false); }
  };
  return <form className="detail-card club-form" aria-label="Nový přístupový účet" onSubmit={submit} aria-busy={pending}><h2>Nový přístupový účet</h2><SelectField name="personId" label="Ověřená osoba" defaultValue="" required disabled={pending}><option value="">Vyberte osobu bez účtu</option>{persons.map(person => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}{person.birthDate ? ` · ${person.birthDate}` : ""}</option>)}</SelectField><FormField name="username" label="Uživatelské jméno" autoComplete="off" minLength={3} maxLength={50} required disabled={pending} error={errors.username} /><FormField name="password" label="První heslo" type="password" autoComplete="new-password" minLength={6} maxLength={72} required disabled={pending} error={errors.password} hint="Předejte soukromě oprávněné osobě; u dětského účtu ověřenému rodiči. Heslo se po odeslání vymaže z formuláře." /><SelectField name="accountType" label="Typ nového účtu" defaultValue="STANDARD" disabled={pending}><option value="STANDARD">Běžný účet</option><option value="CHILD">Dětský účet</option></SelectField><p className="field-hint">Nový účet má roli USER. Dětský účet vzniká zakázaný. Aktivujte jej samostatně po přiřazení hráčského profilu a schválení aktivního rodiče.</p><FormError error={error} fieldErrors={errors} /><button className="button" disabled={pending}>{pending ? "Ukládám…" : "Vytvořit přístupový účet"}</button></form>;
}

function AccountCard({ account, persons, saved }: { account: AdminAccount; persons: PersonResponse[]; saved: () => void }) {
  const [pending, setPending] = useState(false); const [error, setError] = useState<unknown>(null);
  const [confirmation, setConfirmation] = useState<{ title: string; description: string; action: () => Promise<unknown> } | null>(null);
  const run = async (action: () => Promise<unknown>) => { setPending(true); setError(null); setConfirmation(null); try { await action(); saved(); } catch (caught) { setError(caught); } finally { setPending(false); } };
  const submit = (event: FormEvent<HTMLFormElement>, action: (data: FormData) => Promise<unknown>) => { event.preventDefault(); const data = new FormData(event.currentTarget); void run(() => action(data)); };
  const confirmType = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); const type = String(data.get("accountType")) as AccountType; const reason = String(data.get("reason") ?? "").trim();
    setConfirmation({ title: "Potvrdit změnu typu účtu", description: "Změna typu odvolá dosavadní přihlášení. Účet zůstane zakázaný a jeho přístup bude nutné samostatně povolit nebo aktivovat. Historie hráče zůstane zachována.", action: () => setAccountType(account.id, type, reason) });
  };
  const changeAccess = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const reason = String(new FormData(event.currentTarget).get("reason") ?? "").trim();
    if (account.enabled) setConfirmation({ title: "Potvrdit zákaz účtu", description: "Zákaz odvolá přihlášení tohoto účtu. Pokud jde o posledního aktivního rodiče dítěte, zakáže také jeho dětský účet. Osoby a sportovní historie zůstanou zachovány.", action: () => setAccountEnabled(account.id, false, reason) });
    else void run(() => account.accountType === "CHILD" ? activateChildAccount(account.id, reason) : setAccountEnabled(account.id, true, reason));
  };
  return <article className="detail-card club-stack" aria-label={account.username} aria-busy={pending}>
    <h3>{account.username}</h3><p>{account.firstName && account.lastName ? `${account.firstName} ${account.lastName}` : "Osoba zatím nepropojena"} · {account.enabled ? "Povolený" : "Zakázaný"} · {account.accountType === "CHILD" ? "Dětský účet" : "Běžný účet"} · {account.role}</p><p className="subtle identifier">Účet: {account.id}</p>
    {!account.personId && <form className="club-form" aria-label={`Propojení osoby ${account.username}`} onSubmit={event => submit(event, data => linkAccountPerson(account.id, String(data.get("personId") ?? ""), String(data.get("reason") ?? "").trim()))}>
      <SelectField name="personId" label="Osoba pro propojení" defaultValue="" required disabled={pending}><option value="">Vyberte ověřenou osobu bez účtu</option>{persons.map(person => <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option>)}</SelectField><ReasonField label="Odůvodnění propojení" disabled={pending} /><p className="field-hint">Propojte pouze po ověření identity. Propojení zachová účet a nelze je přesměrovat na jinou osobu.</p><button className="button button-small" disabled={pending}>Propojit ověřenou osobu</button>
    </form>}
    <form className="club-form" aria-label={`Role účtu ${account.username}`} onSubmit={event => submit(event, data => setAccountRole(account.id, String(data.get("role")) as UserRole, String(data.get("reason") ?? "").trim()))}>
      <SelectField name="role" label="Systémová role" defaultValue={account.role} disabled={pending || account.accountType === "CHILD"}><option value="USER">USER – běžný uživatel</option><option value="ADMIN">ADMIN – administrátor</option></SelectField><ReasonField label="Odůvodnění změny role" disabled={pending || account.accountType === "CHILD"} /><button className="button button-secondary button-small" disabled={pending || account.accountType === "CHILD"}>Uložit roli</button>
    </form>
    <form className="club-form" aria-label={`Typ účtu ${account.username}`} onSubmit={confirmType}>
      <SelectField name="accountType" label="Typ účtu" defaultValue={account.accountType} disabled={pending}><option value="STANDARD">Běžný účet</option><option value="CHILD">Dětský účet</option></SelectField><ReasonField label="Odůvodnění změny typu" disabled={pending} /><button className="button button-secondary button-small" disabled={pending}>Uložit typ účtu</button>
    </form>
    <form className="club-form" aria-label={`Přístup účtu ${account.username}`} onSubmit={changeAccess}>
      <ReasonField label="Odůvodnění změny přístupu" disabled={pending} /><button className="button button-secondary button-small" disabled={pending}>{account.enabled ? "Zakázat účet" : account.accountType === "CHILD" ? "Aktivovat dětský účet" : "Povolit účet"}</button>
    </form>
    <p className="field-hint">Dětský účet nelze povolit obecným přepínačem. Aktivace vždy ověří jeho hráčský profil a aktivního schváleného rodiče. Posledního aktivního správce nelze odebrat.</p>
    {confirmation && <section className="message" aria-label="Potvrzení změny účtu"><h4>{confirmation.title}</h4><p>{confirmation.description}</p><div className="actions"><button className="button button-small" disabled={pending} onClick={() => void run(confirmation.action)}>{confirmation.title}</button><button className="text-button" disabled={pending} onClick={() => setConfirmation(null)}>Zrušit změnu</button></div></section>}
    <FormError error={error} />
  </article>;
}

function AccountsContent() {
  const { user, context, refreshUser } = useAuth(); const [page, setPage] = useState(0); const [notice, setNotice] = useState<string | null>(null);
  const load = useCallback(async () => { const [accounts, persons, allAccounts] = await Promise.all([getAccounts(page), allPages(getPersons), allPages(getAccounts)]); const used = new Set(allAccounts.map(account => account.personId)); return { accounts, persons: persons.filter(person => !used.has(person.id)) }; }, [page]);
  const { resource, reload } = useResource(load, context);
  const saved = (changedUserId?: string) => { setNotice("Správa osob a účtů byla uložena."); reload(); if (changedUserId === user?.id) void refreshUser(); };
  return <section className="club-page"><AdminNav /><p className="eyebrow">Administrace klubu</p><h1>Správa přístupových účtů</h1><p className="lead">Účet se vytváří pro konkrétní ověřenou osobu. Trenérství, hráčský profil a rodičovské vazby se nastavují samostatně.</p>{notice && <p className="message message-success" role="status">{notice}</p>}<ResourceView resource={resource} reload={reload}>{data => <><div className="club-two-columns"><NewAccount persons={data.persons} saved={saved} /><NewPerson saved={saved} /></div><section className="club-section" aria-label="Přístupové účty"><h2>Evidované účty</h2><div className="club-cards">{data.accounts.items.map(account => <AccountCard key={`${account.id}:${account.role}:${account.accountType}:${account.enabled}:${account.personId}`} account={account} persons={data.persons} saved={() => saved(account.id)} />)}</div>{!data.accounts.items.length && <EmptyState>Nejsou evidované žádné účty.</EmptyState>}<Pagination page={page} result={data.accounts} changePage={setPage} /></section></>}</ResourceView></section>;
}
export function AccountsManager() { return <AccessGate completeProfile capability="MANAGE_ACCOUNTS"><AccountsContent /></AccessGate>; }
