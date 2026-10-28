import { ApiError } from "./api";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Přihlášení se nezdařilo. Zkontrolujte jméno a heslo.",
  FORBIDDEN: "K této akci nemáte oprávnění nebo nebyl přijat bezpečnostní token. Obnovte ověření přístupu.",
  NOT_FOUND: "Požadovaný záznam nebyl nalezen.",
  CONFLICT: "Záznam se nepodařilo uložit kvůli konfliktu. Ověřte aktuální stav.",
  DUPLICATE_RESOURCE: "Záznam se stejným jedinečným údajem již existuje.",
  PROFILE_ALREADY_LINKED: "Účet již má osobní údaje. Načtěte aktuální profil.",
  PROFILE_INCOMPLETE: "Nejprve dokončete osobní údaje svého účtu.",
  SETUP_ALREADY_COMPLETED: "Správa klubu již byla převzata. Obnovte stav nastavení.",
  SETUP_UNAVAILABLE: "Převzetí správy není nakonfigurované. Instalační token musí nastavit provozovatel.",
  OPTIMISTIC_LOCK_CONFLICT: "Záznam mezitím změnil jiný uživatel. Načtěte aktuální stav.",
  STATE_CONFLICT: "Akce není v aktuálním stavu povolena. Ověřte aktuální stav.",
  CHILD_ACTIVATION_CONFLICT: "Dětský účet vyžaduje vlastní hráčský profil a schváleného rodiče s povoleným běžným účtem.",
  LAST_ADMIN_REQUIRED: "Klub musí mít alespoň jednoho povoleného administrátora s dokončeným profilem.",
  MEMBERSHIP_OVERLAP: "Interval se překrývá s jiným členstvím stejného hráče nebo trenéra v tomto týmu.",
  CONFIGURATION_LOCKED: "Použité nebo archivované údaje již nelze tímto způsobem měnit.",
  VALIDATION_ERROR: "Zkontrolujte vyplněné údaje a označená pole.",
  BAD_REQUEST: "Zkontrolujte vyplněné údaje.",
  NETWORK_ERROR: "API není dostupné. Zkontrolujte připojení a spuštění backendu.",
  INVALID_RESPONSE: "API vrátilo neočekávanou odpověď. Zkuste načtení znovu.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Zkontrolujte vyplněné údaje.",
  401: "Přihlášení se nezdařilo. Zkontrolujte jméno a heslo.",
  403: "K této akci nemáte oprávnění. Ověřte aktuální přístup.",
  404: "Požadovaný záznam nebyl nalezen nebo není přístupný.",
  409: "Záznam se nepodařilo uložit kvůli konfliktu. Ověřte aktuální stav.",
};

/** Technické detaily z backendu se nezobrazují uživateli. */
export function mapErrorToMessage(error: unknown): string {
  return error instanceof ApiError
    ? ERROR_MESSAGES[error.code] ?? STATUS_MESSAGES[error.status] ?? "API hlásí chybu. Zkuste to později."
    : "Došlo k neočekávané chybě. Zkuste to znovu.";
}

/** Jen známá pole formuláře; details/rejectedValue ani text s tajnými hodnotami se nerenderují. */
export function mapFieldErrors(error: unknown, fields: readonly string[]): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  const messages: Record<string, string> = {};
  for (const fieldError of error.body?.fieldErrors ?? []) {
    if (!fields.includes(fieldError.field)) continue;
    messages[fieldError.field] = "Zkontrolujte hodnotu tohoto pole.";
  }
  return messages;
}
