import { ApiError } from "./api";

const ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Přihlášení se nezdařilo. Zkontrolujte jméno a heslo.",
  FORBIDDEN: "Akce nebyla povolena. Obnovte stránku a zkuste ji znovu.",
  NOT_FOUND: "Požadovaný záznam nebyl nalezen.",
  CONFLICT: "Toto uživatelské jméno je již obsazené.",
  VALIDATION_ERROR: "Zkontrolujte údaje. Jméno má mít 3–50 znaků, heslo 6–72 znaků a nejvýše 72 bajtů.",
  NETWORK_ERROR: "API není dostupné. Zkontrolujte připojení a spuštění backendu.",
  INVALID_RESPONSE: "API vrátilo neočekávanou odpověď. Zkuste načtení znovu.",
};

const STATUS_MESSAGES: Record<number, string> = {
  400: "Zkontrolujte vyplněné údaje.",
  401: "Přihlášení se nezdařilo. Zkontrolujte jméno a heslo.",
  403: "Akce nebyla povolena. Obnovte stránku a zkuste ji znovu.",
  409: "Toto uživatelské jméno je již obsazené.",
};

/** Technické detaily z backendu se nezobrazují uživateli. */
export function mapErrorToMessage(error: unknown): string {
  return error instanceof ApiError
    ? ERROR_MESSAGES[error.code] ?? STATUS_MESSAGES[error.status] ?? "API hlásí chybu. Zkuste to později."
    : "Došlo k neočekávané chybě. Zkuste to znovu.";
}
