import { describe, it, expect } from "vitest";
import { checkIntervalOverlap } from "../src/lib/conflict/conflict-engine";
import { timeToMinutes } from "../src/lib/validation/schemas";

describe("Scheduling Conflict Engine - Interval Math & Overlap Detection", () => {
  it("converts HH:mm time strings to minutes accurately", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("08:30")).toBe(8 * 60 + 30); // 510
    expect(timeToMinutes("12:00")).toBe(720);
    expect(timeToMinutes("23:59")).toBe(1439);
  });

  it("detects exact matching overlapping intervals", () => {
    const overlaps = checkIntervalOverlap("09:00", "11:00", "09:00", "11:00");
    expect(overlaps).toBe(true);
  });

  it("detects partial start overlap (session A starts before session B ends)", () => {
    const overlaps = checkIntervalOverlap("08:30", "10:00", "09:00", "11:00");
    expect(overlaps).toBe(true);
  });

  it("detects partial end overlap (session A ends after session B starts)", () => {
    const overlaps = checkIntervalOverlap("10:00", "12:00", "09:00", "11:00");
    expect(overlaps).toBe(true);
  });

  it("detects fully enclosed intervals (session A is inside session B)", () => {
    const overlaps = checkIntervalOverlap("09:30", "10:30", "08:00", "12:00");
    expect(overlaps).toBe(true);
  });

  it("does NOT flag adjacent sessions as overlapping (back-to-back classes)", () => {
    // 08:00-10:00 finishes exactly when 10:00-12:00 begins
    const overlaps = checkIntervalOverlap("08:00", "10:00", "10:00", "12:00");
    expect(overlaps).toBe(false);
  });

  it("does NOT flag completely separated time intervals", () => {
    const overlaps = checkIntervalOverlap("08:00", "09:30", "11:00", "13:00");
    expect(overlaps).toBe(false);
  });
});
