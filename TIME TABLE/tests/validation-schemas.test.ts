import { describe, it, expect } from "vitest";
import {
  academicPeriodSchema,
  programmeSchema,
  courseSchema,
  facilitatorSchema,
  timetableEntrySchema,
} from "../src/lib/validation/schemas";

describe("Domain Entity Validation Schemas", () => {
  describe("Academic Period Schema", () => {
    it("validates well-formed academic year formats (e.g. 2025/2026)", () => {
      const result = academicPeriodSchema.safeParse({
        academicYear: "2025/2026",
        semester: "Semester 1",
        isCurrent: true,
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid academic year formats", () => {
      const result = academicPeriodSchema.safeParse({
        academicYear: "25-26",
        semester: "Semester 1",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Course Schema", () => {
    it("accepts valid course codes and transforms to uppercase", () => {
      const result = courseSchema.safeParse({
        code: "cs101",
        name: "Introduction to Programming",
        creditHours: 3,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.code).toBe("CS101");
      }
    });

    it("rejects course codes shorter than 2 characters", () => {
      const result = courseSchema.safeParse({
        code: "C",
        name: "Test Course",
        creditHours: 3,
      });
      expect(result.success).toBe(false);
    });
  });

  describe("Timetable Entry Schema - Temporal Invariants", () => {
    it("accepts valid time range with at least 30 minutes duration", () => {
      const result = timetableEntrySchema.safeParse({
        timetableVersionId: "v123",
        courseId: "c123",
        facilitatorId: "f123",
        dayOfWeek: "MONDAY",
        startTime: "08:30",
        endTime: "10:30",
        venue: "Great Hall Annex 1",
      });
      expect(result.success).toBe(true);
    });

    it("rejects session where endTime is earlier than startTime", () => {
      const result = timetableEntrySchema.safeParse({
        timetableVersionId: "v123",
        courseId: "c123",
        facilitatorId: "f123",
        dayOfWeek: "MONDAY",
        startTime: "11:00",
        endTime: "09:00", // Inverted!
        venue: "Great Hall Annex 1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("End time must be strictly after start time");
      }
    });

    it("rejects session where duration is under 30 minutes", () => {
      const result = timetableEntrySchema.safeParse({
        timetableVersionId: "v123",
        courseId: "c123",
        facilitatorId: "f123",
        dayOfWeek: "MONDAY",
        startTime: "09:00",
        endTime: "09:15", // Only 15 mins!
        venue: "Great Hall Annex 1",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain("Session duration must be at least 30 minutes");
      }
    });
  });
});
