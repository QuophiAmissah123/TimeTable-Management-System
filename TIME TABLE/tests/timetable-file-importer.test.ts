import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/db/prisma";
import {
  parseGridToTimetableRows,
  extractGridFromExcel,
  processUniversalTimetableFile,
  processStandaloneTimetableIntake,
  normalizeTimeTo24Hr,
  splitTimeRange,
} from "@/lib/services/timetable-file-importer";

describe("Universal Timetable File Intake Engine (Word / Excel / CSV)", () => {
  it("normalizes diverse time formats correctly", () => {
    expect(normalizeTimeTo24Hr("8:30")).toBe("08:30");
    expect(normalizeTimeTo24Hr("08:30")).toBe("08:30");
    expect(normalizeTimeTo24Hr("8:30 AM")).toBe("08:30");
    expect(normalizeTimeTo24Hr("2:00 PM")).toBe("14:00");
    expect(normalizeTimeTo24Hr("12:30 PM")).toBe("12:30");

    const split = splitTimeRange("08:30 - 10:30");
    expect(split.start).toBe("08:30");
    expect(split.end).toBe("10:30");

    const splitTo = splitTimeRange("8:30am to 10:30am");
    expect(splitTo.start).toBe("08:30");
    expect(splitTo.end).toBe("10:30");
  });

  it("parses 2D grid rows into structured timetable entries", () => {
    const grid = [
      ["Programme", "Course Code", "Course Title", "Facilitator", "Day", "Time", "Venue"],
      ["BSc Computer Science", "CS201", "Object-Oriented Programming", "Dr. Kwame Mensah", "Monday", "08:30 - 10:30", "Lab 1"],
      ["BSc Computer Science", "CS202", "Web Technologies", "Prof. Ama Serwaa", "Wednesday", "10:30 - 12:30", "LH 201"],
    ];

    const parsed = parseGridToTimetableRows(grid);
    expect(parsed.length).toBe(2);
    expect(parsed[0].courseCode).toBe("CS201");
    expect(parsed[0].courseName).toBe("Object-Oriented Programming");
    expect(parsed[0].facilitatorName).toBe("Dr. Kwame Mensah");
    expect(parsed[0].dayOfWeek).toBe("Monday");
    expect(parsed[0].startTime).toBe("08:30");
    expect(parsed[0].endTime).toBe("10:30");
    expect(parsed[0].venue).toBe("Lab 1");
    expect(parsed[0].programme).toBe("BSc Computer Science");
  });

  it("extracts and processes an in-memory Excel workbook auto-populating Programme, Course, and Facilitator", async () => {
    // 1. Create test academic period and timetable version
    const period = await prisma.academicPeriod.upsert({
      where: {
        academicYear_semester: {
          academicYear: "2027/2028",
          semester: "Semester 1",
        },
      },
      update: {},
      create: {
        academicYear: "2027/2028",
        semester: "Semester 1",
        isCurrent: false,
      },
    });

    const uniqueSuffix = Date.now().toString().slice(-6);
    const prog = await prisma.programme.create({
      data: {
        code: `TI${uniqueSuffix}`,
        name: `Test Intake Programme ${uniqueSuffix}`,
      },
    });

    const level = await prisma.programmeLevel.create({
      data: {
        programmeId: prog.id,
        levelCode: "100",
        levelName: "Level 100",
      },
    });

    const timetable = await prisma.timetable.create({
      data: {
        programmeId: prog.id,
        programmeLevelId: level.id,
        academicPeriodId: period.id,
        status: "DRAFT",
      },
    });

    const version = await prisma.timetableVersion.create({
      data: {
        timetableId: timetable.id,
        versionNumber: 1,
        status: "DRAFT",
      },
    });

    // 2. Build in-memory Excel workbook buffer
    const testCourseCode = `AUTO${Date.now().toString().slice(-4)}`;
    const testFacName = `Dr. Auto Facilitator ${Date.now().toString().slice(-4)}`;
    const sheetData = [
      ["Programme", "Course Code", "Course Name", "Lead Facilitator", "Day of Week", "Start Time", "End Time", "Venue"],
      ["Software Engineering", testCourseCode, "Distributed Cloud Computing", testFacName, "THURSDAY", "09:00", "11:00", "Auditorium C"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // 3. Process the file
    const result = await processUniversalTimetableFile({
      buffer,
      fileName: "external_board_timetable.xlsx",
      versionId: version.id,
    });

    if (result.errors.length > 0) {
      console.log("TEST IMPORT ERRORS:", result.errors);
    }
    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.coursesCreated.some((c) => c.includes(testCourseCode))).toBe(true);
    expect(result.facilitatorsCreated.some((f) => f.includes(testFacName))).toBe(true);

    // 4. Verify entities exist in database
    const courseInDb = await prisma.course.findUnique({ where: { code: testCourseCode } });
    expect(courseInDb).toBeDefined();
    expect(courseInDb?.name).toBe("Distributed Cloud Computing");

    const facInDb = await prisma.facilitator.findFirst({ where: { name: testFacName } });
    expect(facInDb).toBeDefined();

    const entryInDb = await prisma.timetableEntry.findFirst({
      where: {
        timetableVersionId: version.id,
        courseId: courseInDb?.id,
      },
    });
    expect(entryInDb).toBeDefined();
    expect(entryInDb?.dayOfWeek).toBe("THURSDAY");
    expect(entryInDb?.startTime).toBe("09:00");
    expect(entryInDb?.endTime).toBe("11:00");

    // Clean up test timetable
    await prisma.timetable.delete({ where: { id: timetable.id } });
  });

  it("performs standalone timetable intake directly creating Programme, Level, Timetable, Course, Facilitator, and publishing for tracking", async () => {
    const uniqueSuffix = Date.now().toString().slice(-5);
    const progName = `Cyber Security Studies ${uniqueSuffix}`;
    const courseCode = `CYBER${uniqueSuffix}`;
    const facName = `Dr. Cyber Defense ${uniqueSuffix}`;

    const sheetData = [
      ["Programme", "Level", "Course Code", "Course Name", "Lead Facilitator", "Day of Week", "Start Time", "End Time", "Venue"],
      [progName, "Level 200", courseCode, "Network Defense Strategies", facName, "TUESDAY", "10:00", "12:00", "Cyber Warfare Lab"],
    ];

    const ws = XLSX.utils.aoa_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Timetable");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    const result = await processStandaloneTimetableIntake({
      buffer,
      fileName: `Intake_${progName.replace(/\s+/g, "_")}.xlsx`,
      autoPublish: true,
    });

    expect(result.success).toBe(true);
    expect(result.imported).toBe(1);
    expect(result.timetablesCreated.length).toBeGreaterThanOrEqual(1);
    expect(result.timetablesCreated[0].published).toBe(true);
    expect(result.timetablesCreated[0].programmeName).toBe(progName);
    expect(result.timetablesCreated[0].levelCode).toBe("200");

    // Verify Programme was created in DB
    const progInDb = await prisma.programme.findFirst({
      where: { name: progName },
      include: { levels: true },
    });
    expect(progInDb).toBeDefined();
    expect(progInDb?.levels.some((l) => l.levelCode === "200")).toBe(true);

    // Verify Course was created
    const courseInDb = await prisma.course.findUnique({ where: { code: courseCode } });
    expect(courseInDb).toBeDefined();

    // Verify Facilitator was created
    const facInDb = await prisma.facilitator.findFirst({ where: { name: facName } });
    expect(facInDb).toBeDefined();

    // Verify Timetable and Published Version exist
    const timetableInDb = await prisma.timetable.findFirst({
      where: { programmeId: progInDb!.id },
      include: {
        versions: {
          include: { entries: true },
        },
      },
    });
    expect(timetableInDb).toBeDefined();
    expect(timetableInDb?.status).toBe("PUBLISHED");
    expect(timetableInDb?.versions[0].status).toBe("PUBLISHED");
    expect(timetableInDb?.versions[0].entries.length).toBe(1);
    expect(timetableInDb?.versions[0].entries[0].dayOfWeek).toBe("TUESDAY");
    expect(timetableInDb?.versions[0].entries[0].startTime).toBe("10:00");
    expect(timetableInDb?.versions[0].entries[0].endTime).toBe("12:00");

    // Clean up
    if (timetableInDb) {
      await prisma.timetable.delete({ where: { id: timetableInDb.id } });
    }
  });
});
