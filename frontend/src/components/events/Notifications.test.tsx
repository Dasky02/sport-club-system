import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { getNotifications, getUnreadCount, markNoticeRead, type Notice } from "@/api/events";
import { Notifications } from "./Notifications";

vi.mock("@/api/events", () => ({ getNotifications: vi.fn(), getUnreadCount: vi.fn(), markNoticeRead: vi.fn() }));
vi.mock("@/context/AuthContext", () => ({ useAuth: () => ({ user: { id: "recipient" } }) }));

it("ukáže odkaz na akci, označí vlastní oznámení jako přečtené a obnoví počet", async () => {
  const notice: Notice = {
    id: "notice", type: "NOMINATION_PUBLISHED", eventId: "event",
    title: "Podzimní zápas", body: "Klub zveřejnil vaši nominaci.",
    deliveredAt: "2026-10-27T15:00:00Z", readAt: null,
  };
  const page = { items: [notice], page: 0, size: 20, totalElements: "1", totalPages: 1 };
  vi.mocked(getNotifications).mockResolvedValueOnce(page).mockResolvedValueOnce({ ...page, items: [{ ...notice, readAt: notice.deliveredAt }] });
  vi.mocked(getUnreadCount).mockResolvedValueOnce(1).mockResolvedValueOnce(0);
  vi.mocked(markNoticeRead).mockResolvedValue(undefined);
  render(<Notifications />);
  expect(await screen.findByRole("link", { name: notice.title })).toHaveAttribute("href", "/events/event");
  expect(screen.getByRole("status")).toHaveTextContent("Nepřečtená oznámení: 1");
  fireEvent.click(screen.getByRole("button", { name: "Označit jako přečtené" }));
  await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nepřečtená oznámení: 0"));
  expect(markNoticeRead).toHaveBeenCalledExactlyOnceWith("notice");
  expect(screen.queryByRole("button", { name: "Označit jako přečtené" })).not.toBeInTheDocument();
});
