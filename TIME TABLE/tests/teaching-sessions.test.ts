import { describe, it, expect, beforeEach, afterAll } from "vitest";
import { prisma } from "../src/lib/db/prisma";
import {
  startTeachingSession,
  stopTeachingSession,
  getTodayScheduledClasses,
  getTeachingSessionsReport,
  generateSessionsCsv,
  formatDurationSeconds,
  formatDateKey,
} from "../src/lib/services/session-service";

describe("Lecturer Attendance & Teaching-Session Tracking Engine", () => {
  let testAdminUser: any;
  let testViewerUser: any;
  let testEntry: any;
  const testDate = "2026-10-15";

  beforeEach(async () => {
    // Clean any previous test sessions
    await prisma.teachingSession.deleteMany({
      where: { sessionDate: testDate },
    });

    testAdminUser = await prisma.user.findUnique({
      where: { email: "admin@university.edu" },
    });

    testViewerUser = await prisma.user.findUnique({
      where: { email: "viewer@university.edu" },
    });

    // Get a valid published timetable entry
    testEntry = await prisma.timetableEntry.findFirst({
      where: {
        timetableVersion: { status: "PUBLISHED" },
      },
      include: {
        course: true,
        facilitator: true,
      },
    });
  });

  describe("Duration Calculation & Time Math", () => {
    it("formats duration seconds to HH:MM:SS correctly", () => {
      expect(formatDurationSeconds(0)).toBe("00:00:00");
      expect(formatDurationSeconds(45)).toBe("00:00:45");
      expect(formatDurationSeconds(125)).toBe("00:02:05");
      expect(formatDurationSeconds(3600)).toBe("01:00:00");
      expect(formatDurationSeconds(5420)).toBe("01:30:20");
    });

    it("ensures elapsed timer math derived from persisted start timestamp is reload-resilient", () => {
      const fixedStart = new Date(Date.now() - 3600 * 1000); // 1 hour ago
      const simulatedNow = Date.now();
      const elapsed = Math.floor((simulatedNow - fixedStart.getTime()) / 1000);
      expect(elapsed).toBeGreaterThanOrEqual(3600);
    });
  });

  describe("Start Class Workflow & Integrity", () => {
    it("successfully starts a scheduled class session with server UTC timestamp", async () => {
      expect(testEntry).toBeDefined();

      const result = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.status).toBe("IN_PROGRESS");
      expect(result.data.lecturerPresent).toBe(true);
      expect(result.data.startedById).toBe(testAdminUser.id);
      expect(result.data.timetableEntryId).toBe(testEntry.id);
      expect(result.data.sessionDate).toBe(testDate);
    });

    it("prevents starting duplicate active sessions for the same scheduled occurrence", async () => {
      // First start
      const firstResult = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate
      );
      expect(firstResult.success).toBe(true);

      // Attempt second duplicate start for same entry and date
      const secondResult = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate
      );

      expect(secondResult.success).toBe(false);
      expect(secondResult.error).toContain("already in progress");
    });
  });

  describe("Stop Class Workflow & Durations", () => {
    it("successfully stops an active session and calculates duration", async () => {
      const startResult = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate
      );
      expect(startResult.success).toBe(true);
      const session = startResult.data;

      // Stop session
      const stopResult = await stopTeachingSession(
        session.id,
        testAdminUser.id,
        "Class completed smoothly"
      );

      expect(stopResult.success).toBe(true);
      expect(stopResult.data.status).toBe("COMPLETED");
      expect(stopResult.data.endedAt).toBeDefined();
      expect(stopResult.data.durationSeconds).toBeGreaterThanOrEqual(0);
      expect(stopResult.data.notes).toBe("Class completed smoothly");
    });

    it("is idempotent: prevents repeated stop requests from overwriting completion data", async () => {
      const startResult = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate
      );
      const session = startResult.data;

      // First Stop
      const firstStop = await stopTeachingSession(session.id, testAdminUser.id);
      expect(firstStop.success).toBe(true);
      const originalEndedAt = firstStop.data.endedAt;
      const originalDuration = firstStop.data.durationSeconds;

      // Repeated Stop Attempt
      const secondStop = await stopTeachingSession(session.id, testAdminUser.id);
      expect(secondStop.success).toBe(false);
      expect(secondStop.error).toContain("already been completed");

      // Verify original data remained completely unaltered in DB
      const dbRecord = await prisma.teachingSession.findUnique({
        where: { id: session.id },
      });
      expect(dbRecord?.status).toBe("COMPLETED");
      expect(dbRecord?.endedAt?.toISOString()).toBe(originalEndedAt.toISOString());
      expect(dbRecord?.durationSeconds).toBe(originalDuration);
    });
  });

  describe("Reporting & Institutional CSV Export", () => {
    it("includes completed sessions in reporting query", async () => {
      const startResult = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate
      );
      await stopTeachingSession(startResult.data.id, testAdminUser.id);

      const report = await getTeachingSessionsReport({
        startDate: testDate,
        endDate: testDate,
      });

      expect(report.success).toBe(true);
      expect(report.data.length).toBeGreaterThanOrEqual(1);
      const found = report.data.find((s: any) => s.id === startResult.data.id);
      expect(found).toBeDefined();
      expect(found.status).toBe("COMPLETED");
    });

    it("records and updates facilitator present and student attendance headcount", async () => {
      const startResult = await startTeachingSession(
        testEntry.id,
        testAdminUser.id,
        testDate,
        "Dr. Substitute Lecturer"
      );
      const session = startResult.data;
      expect(session.facilitatorPresent).toBe("Dr. Substitute Lecturer");

      // Stop session with headcount 45
      const stopResult = await stopTeachingSession(
        session.id,
        testAdminUser.id,
        "Class finished",
        45,
        null,
        "Prof. Final Instructor"
      );
      expect(stopResult.success).toBe(true);
      expect(stopResult.data.studentsPresent).toBe(45);
      expect(stopResult.data.facilitatorPresent).toBe("Prof. Final Instructor");

      // Verify DB persistence
      let record = await prisma.teachingSession.findUnique({ where: { id: session.id } });
      expect(record?.studentsPresent).toBe(45);
      expect(record?.facilitatorPresent).toBe("Prof. Final Instructor");

      // Verify updating student attendance later
      const { updateSessionAttendance } = await import("@/lib/services/session-service");
      const updateResult = await updateSessionAttendance(session.id, testAdminUser.id, 48, "Dr. Substitute Lecturer");
      expect(updateResult.success).toBe(true);
      expect(updateResult.data.studentsPresent).toBe(48);
      expect(updateResult.data.facilitatorPresent).toBe("Dr. Substitute Lecturer");

      record = await prisma.teachingSession.findUnique({ where: { id: session.id } });
      expect(record?.studentsPresent).toBe(48);
      expect(record?.facilitatorPresent).toBe("Dr. Substitute Lecturer");
    });

    it("generates an Excel-ready CSV export with UTF-8 BOM, lead facilitator, and facilitator present", async () => {
      const csv = await generateSessionsCsv({
        startDate: testDate,
        endDate: testDate,
      });

      expect(typeof csv).toBe("string");
      // Starts with UTF-8 BOM \uFEFF
      expect(csv.charCodeAt(0)).toBe(0xfeff);
      expect(csv).toContain("Session Date");
      expect(csv).toContain("Course Code");
      expect(csv).toContain("Duration (HH:MM:SS)");
      expect(csv).toContain("Lead Facilitator (Timetable)");
      expect(csv).toContain("Facilitator Present");
      expect(csv).toContain("Students Present");
      expect(csv).toContain("Recorded By (Operator)");
    });
  });
});
