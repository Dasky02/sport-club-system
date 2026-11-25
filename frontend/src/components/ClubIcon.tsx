const paths = {
  home: "M3 10.5 12 3l9 7.5V21H3zM9 21v-7h6v7",
  calendar: "M4 5h16v16H4zM8 3v4m8-4v4M4 10h16m-11 4h2m3 0h2m-7 4h2",
  bell: "M18 8a6 6 0 0 0-12 0c0 6-3 6-3 8h18c0-2-3-2-3-8M10 20a2 2 0 0 0 4 0",
  team: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4m-6-8a4 4 0 1 1-8 0 4 4 0 0 1 8 0Zm4-4a4 4 0 0 1 0 8",
  settings: "M4 6h5m4 0h7M4 12h10m4 0h2M4 18h3m4 0h9M9 4v4m5 2v4m-7 2v4",
  person: "M4 21v-2a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2m-4-14a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z",
  field: "M2 5h20v14H2zM12 5v14M2 9h3v6H2m20-6h-3v6h3m-4-3a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  menu: "M4 6h16M4 12h16M4 18h16",
  close: "m6 6 12 12M18 6 6 18",
  chevron: "m9 6 6 6-6 6",
} as const;

export type ClubIconName = keyof typeof paths;

export function ClubIcon({ name }: { name: ClubIconName }) {
  return (
    <svg className="club-icon" aria-hidden="true" viewBox="0 0 24 24" width="20" height="20"
      fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round">
      <path d={paths[name]} />
    </svg>
  );
}
