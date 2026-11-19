import { describe, expect, it } from "vitest";
import { changeMonth, clubDateKey, clubDateTimeInput, clubInstant, monthDays, monthRange } from "./clubTime";

describe("čas kalendáře v Praze", () => {
  it("převede lokální termín a půlnoc v zimním a letním čase", () => {
    expect(clubInstant("2026-11-19T16:30")).toBe("2026-11-19T15:30:00.000Z");
    expect(clubInstant("2026-07-19T16:30")).toBe("2026-07-19T14:30:00.000Z");
    expect(clubDateTimeInput("2026-07-19T14:30:00.000Z")).toBe("2026-07-19T16:30");
    expect(clubDateKey("2026-11-30T23:30:00Z")).toBe("2026-12-01");
  });

  it("odmítne neexistující i dvojznačný čas na přechodu", () => {
    expect(() => clubInstant("2026-03-29T02:30")).toThrow("jednoznačný");
    expect(() => clubInstant("2026-10-25T02:30")).toThrow("jednoznačný");
  });

  it("počítá český rozsah měsíce a začátek týdne v pondělí", () => {
    expect(monthRange("2026-03")).toEqual({ from: "2026-02-28T23:00:00.000Z", to: "2026-03-31T22:00:00.000Z" });
    expect(changeMonth("2026-12", 1)).toBe("2027-01");
    expect(monthDays("2026-11").blank).toBe(6);
    expect(monthDays("2028-02").dates).toHaveLength(29);
  });
});
