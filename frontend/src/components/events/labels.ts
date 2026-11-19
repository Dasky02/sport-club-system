export const typeLabels = { TRAINING: "Trénink", MATCH: "Zápas", OTHER: "Klubová akce" } as const;
export const statusLabels = { DRAFT: "Koncept", PUBLISHED: "Zveřejněno", CANCELLED: "Zrušeno", COMPLETED: "Dokončeno" } as const;
export const availabilityLabels = { UNKNOWN: "Zatím nevím", AVAILABLE: "Mohu", UNAVAILABLE: "Nemohu" } as const;
export const nominationLabels = { NOT_SELECTED: "Nenominován", SELECTED: "Nominován", RESERVE: "Náhradník" } as const;
export const attendanceLabels = { PRESENT: "Přítomen", ABSENT: "Nepřítomen", EXCUSED: "Omluven", LATE: "Pozdní příchod" } as const;
export const noticeLabels = {
  EVENT_CREATED: "Nová akce", EVENT_CHANGED: "Změna akce", EVENT_CANCELLED: "Zrušení akce",
  NOMINATION_PUBLISHED: "Nominace zveřejněna", NOMINATION_CHANGED: "Změna nominace",
} as const;
