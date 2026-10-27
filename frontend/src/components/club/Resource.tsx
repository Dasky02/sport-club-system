"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ResourceError } from "../ResourceError";
import type { PageResponse } from "@/api/types";

export type Resource<T> = { state: "loading" } | { state: "ready"; data: T } | { state: "error"; error: unknown };

export function useResource<T>(load: () => Promise<T>, scope: unknown = null) {
  const [revision, setRevision] = useState(0);
  const [stored, setStored] = useState<{ load: typeof load; scope: unknown; resource: Resource<T> }>({ load, scope, resource: { state: "loading" } });
  const sequence = useRef(0);
  useEffect(() => {
    const ticket = ++sequence.current;
    let active = true;
    void load().then(
      (data) => { if (active && ticket === sequence.current) setStored({ load, scope, resource: { state: "ready", data } }); },
      (error: unknown) => { if (active && ticket === sequence.current) setStored({ load, scope, resource: { state: "error", error } }); },
    );
    return () => { active = false; };
  }, [load, revision, scope]);
  const reload = useCallback(() => {
    sequence.current += 1;
    setStored({ load, scope, resource: { state: "loading" } });
    setRevision((value) => value + 1);
  }, [load, scope]);
  const resource: Resource<T> = stored.load === load && stored.scope === scope ? stored.resource : { state: "loading" };
  return { resource, reload };
}

export function ResourceView<T>({ resource, reload, children }: { resource: Resource<T>; reload: () => void; children: (data: T) => ReactNode }) {
  if (resource.state === "loading") return <p role="status">Načítám data…</p>;
  if (resource.state === "error") return <ResourceError error={resource.error} onRetry={reload} />;
  return children(resource.data);
}

export function Pagination({ page, result, changePage }: { page: number; result: PageResponse<unknown>; changePage: (page: number) => void }) {
  return <nav className="pagination" aria-label="Stránkování"><button className="button button-secondary button-small" disabled={page === 0} onClick={() => changePage(page - 1)}>Předchozí stránka</button><span>Stránka {page + 1}{result.totalPages > 0 ? ` z ${result.totalPages}` : ""} · Celkem {result.totalElements}</span><button className="button button-secondary button-small" disabled={page + 1 >= result.totalPages} onClick={() => changePage(page + 1)}>Další stránka</button></nav>;
}

export function EmptyState({ children }: { children: ReactNode }) {
  return <div className="empty-state"><p>{children}</p></div>;
}
