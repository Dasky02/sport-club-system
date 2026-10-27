"use client";

import { ApiError } from "@/api/api";
import { mapErrorToMessage } from "@/api/errorMapper";
import { useAuth } from "@/context/AuthContext";

export function ResourceError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { refreshUser } = useAuth();
  const denied = error instanceof ApiError && (error.status === 401 || error.status === 403);
  return <div className="resource-error">
    <p className="message message-error" role="alert">{mapErrorToMessage(error)}</p>
    {denied
      ? <button className="button button-secondary" onClick={() => void refreshUser()}>Obnovit ověření přístupu</button>
      : <button className="button button-secondary" onClick={onRetry}>Zkusit znovu</button>}
  </div>;
}
