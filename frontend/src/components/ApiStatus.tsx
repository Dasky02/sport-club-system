"use client";

import { useEffect, useState } from "react";
import { getAppVersion } from "@/api/api";
import { mapErrorToMessage } from "@/api/errorMapper";

type Status = { state: "loading" } | { state: "ready"; version: string } | { state: "error"; message: string };

export function ApiStatus() {
  const [status, setStatus] = useState<Status>({ state: "loading" });
  const fetchStatus = async () => {
    try {
      const { version } = await getAppVersion();
      setStatus({ state: "ready", version });
    } catch (error: unknown) {
      setStatus({ state: "error", message: mapErrorToMessage(error) });
    }
  };
  useEffect(() => {
    let active = true;
    void getAppVersion().then(
      ({ version }) => { if (active) setStatus({ state: "ready", version }); },
      (error: unknown) => { if (active) setStatus({ state: "error", message: mapErrorToMessage(error) }); },
    );
    return () => { active = false; };
  }, []);

  const retry = () => {
    setStatus({ state: "loading" });
    void fetchStatus();
  };

  return (
    <div className="api-status" aria-live="polite">
      {status.state === "loading" && <p>Ověřuji spojení s API…</p>}
      {status.state === "ready" && <><p className="status-label"><span className="status-dot" /> API je dostupné</p><p className="version">Verze backendu <strong>{status.version}</strong></p></>}
      {status.state === "error" && <><p className="status-label"><span className="status-dot error-dot" /> API není dostupné</p><p className="subtle">{status.message}</p><button className="text-button" onClick={retry}>Zkusit znovu <span aria-hidden="true">↻</span></button></>}
    </div>
  );
}
