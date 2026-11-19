"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { getNotifications, getUnreadCount, markNoticeRead } from "@/api/events";
import { useAuth } from "@/context/AuthContext";
import { EmptyState, Pagination, ResourceView, useResource } from "@/components/club/Resource";
import { displayDateTime } from "./clubTime";
import { eventError } from "./EventForm";
import { noticeLabels } from "./labels";

export function Notifications() {
  const { user } = useAuth();
  const [page, setPage] = useState(0);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");
  const list = useCallback(async () => {
    const [items, unread] = await Promise.all([getNotifications(page), getUnreadCount()]);
    return { items, unread };
  }, [page]);
  const inbox = useResource(list, user?.id);
  const read = async (id: string) => {
    setPending(id); setError("");
    try { await markNoticeRead(id); inbox.reload(); }
    catch (failure) { setError(eventError(failure)); }
    finally { setPending(null); }
  };
  return <section className="club-page event-page">
    <h1>Oznámení</h1>
    {error && <p className="message message-error" role="alert">{error}</p>}
    <ResourceView {...inbox}>{({ items, unread }) => <>
      <p role="status">Nepřečtená oznámení: {unread}</p>
      {items.items.length ? <ul className="notice-list">
        {items.items.map((notice) => <li className={`detail-card notice ${notice.readAt ? "" : "notice-unread"}`} key={notice.id}>
          <div>
            <p className="notice-meta">{noticeLabels[notice.type]} · <time dateTime={notice.deliveredAt}>{displayDateTime(notice.deliveredAt)}</time>{!notice.readAt && " · Nepřečteno"}</p>
            <h2><Link href={`/events/${notice.eventId}`}>{notice.title}</Link></h2>
            <p>{notice.body}</p>
          </div>
          {!notice.readAt && <button className="button button-secondary button-small" type="button" disabled={pending !== null} onClick={() => void read(notice.id)}>
            {pending === notice.id ? "Ukládám…" : "Označit jako přečtené"}
          </button>}
        </li>)}
      </ul> : <EmptyState>Schránka je prázdná.</EmptyState>}
      {items.totalPages > 1 && <Pagination page={page} result={items} changePage={setPage} />}
    </>}</ResourceView>
  </section>;
}
