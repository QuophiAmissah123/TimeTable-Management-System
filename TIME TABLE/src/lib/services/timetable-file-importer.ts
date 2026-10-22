import * as XLSX from "xlsx";
import mammoth from "mammoth";
import { prisma } from "@/lib/db/prisma";
import {
  CandidateEntry,
  detectSchedulingConflicts,
  SchedulingConflict,
} from "@/lib/conflict/conflict-engine";
import { publishTimetableVersion } from "@/lib/services/timetable-service";

export interface ParsedTimetableRow {
  programme?: string;
  level?: string;
  courseCode: string;
  courseName?: string;
  facilitatorName: string; // Official Lead Facilitator
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
}

export interface UniversalImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  programmesCreated: string[];
  coursesCreated: string[];
  facilitatorsCreated: string[];
  errors: string[];
  conflicts: SchedulingConflict[];
  data?: any;
}

export interface StandaloneIntakeParams {
  buffer: Buffer;
  fileName: string;
  userId?: string;
  academicPeriodId?: string;
  defaultProgrammeName?: string;
  defaultLevelCode?: string;
  autoPublish?: boolean;
}

export interface StandaloneTimetableRecord {
  timetableId: string;
  versionId: string;
  versionNumber: number;
  programmeName: string;
  programmeCode: string;
  levelName: string;
  levelCode: string;
  entriesCount: number;
  published: boolean;
}

export interface StandaloneIntakeResult {
  success: boolean;
  imported: number;
  skipped: number;
  programmesCreated: string[];
  coursesCreated: string[];
  facilitatorsCreated: string[];
  timetablesCreated: StandaloneTimetableRecord[];
  errors: string[];
  conflicts: SchedulingConflict[];
  academicPeriodName: string;
  published: boolean;
}

const VALID_DAYS_MAP: Record<string, string> = {
  MONDAY: "MONDAY",
  MON: "MONDAY",
  TUESDAY: "TUESDAY",
  TUE: "TUESDAY",
  TUES: "TUESDAY",
  WEDNESDAY: "WEDNESDAY",
  WED: "WEDNESDAY",
  THURSDAY: "THURSDAY",
  THU: "THURSDAY",
  THUR: "THURSDAY",
  FRIDAY: "FRIDAY",
  FRI: "FRIDAY",
  SATURDAY: "SATURDAY",
  SAT: "SATURDAY",
  SUNDAY: "SUNDAY",
  SUN: "SUNDAY",
};

/**
 * Normalizes time strings like "8:30", "08:30", "8:30 AM", "2:00 PM" to HH:mm (24-hr)
 */
export function normalizeTimeTo24Hr(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim().toUpperCase().replace(/\s+/g, " ");

  // Handle AM/PM
  const isPM = cleaned.includes("PM");
  const isAM = cleaned.includes("AM");
  const cleanDigits = cleaned.replace(/[A-Z]/g, "").trim();

  const parts = cleanDigits.split(/[:.]/);
  if (parts.length < 2) return "";

  let hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || minutes < 0 || minutes > 59) return "";

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/**
 * Splits combined time range like "08:30 - 10:30" or "8:30am to 10:30am"
 */
export function splitTimeRange(raw: string): { start: string; end: string } {
  if (!raw) return { start: "", end: "" };
  const parts = raw.split(/[-–—]|(?:\s+to\s+)/i);
  if (parts.length >= 2) {
    return {
      start: normalizeTimeTo24Hr(parts[0]),
      end: normalizeTimeTo24Hr(parts[1]),
    };
  }
  return { start: normalizeTimeTo24Hr(raw), end: "" };
}

/**
 * Extracts raw 2D string grid from Excel workbook
 */
export function extractGridFromExcel(buffer: Buffer): string[][] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  if (!workbook.SheetNames.length) {
    throw new Error("Excel document contains no worksheets.");
  }
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawData: any[][] = XLSX.utils.sheet_to_json(firstSheet, {
    header: 1,
    defval: "",
  });

  return rawData.map((row) =>
    (row || []).map((cell: any) =>
      cell !== null && cell !== undefined ? String(cell).trim() : ""
    )
  );
}

/**
 * Extracts raw 2D string grid from Word (.docx) document tables or text
 */
export async function extractGridFromWord(buffer: Buffer): Promise<string[][]> {
  const { value: html } = await mammoth.convertToHtml({ buffer });
  const rows: string[][] = [];

  // Match all <tr> rows
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;

  while ((trMatch = trRegex.exec(html)) !== null) {
    const rowHtml = trMatch[1];
    const cellRegex = /<(?:td|th)[^>]*>([\s\S]*?)<\/(?:td|th)>/gi;
    const rowCells: string[] = [];
    let tdMatch: RegExpExecArray | null;

    while ((tdMatch = cellRegex.exec(rowHtml)) !== null) {
      // Strip nested HTML tags & decode basic entities
      const text = tdMatch[1]
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/g, " ")
        .replace(/&amp;/g, "&")
        .replace(/\s+/g, " ")
        .trim();
      rowCells.push(text);
    }

    if (rowCells.some((c) => c.length > 0)) {
      rows.push(rowCells);
    }
  }

  // If no HTML tables found in Word doc, fallback to extracting text lines
  if (rows.length === 0) {
    const { value: rawText } = await mammoth.extractRawText({ buffer });
    const lines = rawText
      .split(/\r\n|\n|\r/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    for (const line of lines) {
      // Split by tab, comma, or multiple spaces
      const cells = line.split(/\t|,| {2,}/).map((c) => c.trim());
      if (cells.length > 1) {
        rows.push(cells);
      }
    }
  }

  if (rows.length === 0) {
    throw new Error(
      "Could not detect tabular timetable data or schedule lines in this Word document."
    );
  }

  return rows;
}

/**
 * Analyzes the 2D grid, identifies column positions, and parses rows into ParsedTimetableRow[]
 */
export function parseGridToTimetableRows(grid: string[][]): ParsedTimetableRow[] {
  if (grid.length < 2) {
    throw new Error("Document must contain at least a header row and one schedule entry.");
  }

  // Find header row (the first row containing course/facilitator/day keywords)
  let headerRowIdx = -1;
  let codeIdx = -1;
  let nameIdx = -1;
  let facIdx = -1;
  let dayIdx = -1;
  let startIdx = -1;
  let endIdx = -1;
  let timeCombinedIdx = -1;
  let venueIdx = -1;
  let progIdx = -1;
  let levelIdx = -1;

  for (let r = 0; r < Math.min(10, grid.length); r++) {
    const row = grid[r].map((c) => c.toLowerCase().replace(/[^a-z0-9]/g, ""));
    const cIdx = row.findIndex((h) => h.includes("coursecode") || h === "code" || h === "course");
    const fIdx = row.findIndex(
      (h) =>
        h.includes("facilitator") ||
        h.includes("lecturer") ||
        h.includes("instructor") ||
        h.includes("teacher") ||
        h.includes("staff")
    );
    const dIdx = row.findIndex((h) => h.includes("day") || h === "dayofweek");

    if (cIdx !== -1 && (fIdx !== -1 || dIdx !== -1)) {
      headerRowIdx = r;
      codeIdx = cIdx;
      facIdx = fIdx;
      dayIdx = dIdx;
      nameIdx = row.findIndex(
        (h) => h.includes("coursename") || h.includes("title") || (h.includes("name") && h !== "facilitatorname")
      );
      venueIdx = row.findIndex(
        (h) => h.includes("venue") || h.includes("room") || h.includes("hall") || h.includes("location")
      );
      progIdx = row.findIndex(
        (h) => h.includes("programme") || h.includes("program") || h.includes("dept") || h.includes("department")
      );
      levelIdx = row.findIndex(
        (h) => h.includes("level") || h.includes("year") || h.includes("class")
      );

      // Check for separate start/end time vs single combined time column
      // Use precise patterns to avoid false matches (e.g. "leadfacilitator" contains "to")
      const sIdx = row.findIndex(
        (h) => h.includes("starttime") || h === "start" || h.includes("begin") || h === "from"
      );
      const eIdx = row.findIndex(
        (h) => h.includes("endtime") || h === "end" || h.includes("finish") || h === "to" || h.includes("stoptime")
      );
      if (sIdx !== -1 && eIdx !== -1 && sIdx !== eIdx) {
        startIdx = sIdx;
        endIdx = eIdx;
      } else {
        timeCombinedIdx = row.findIndex(
          (h) => h.includes("time") || h.includes("period") || h.includes("hours") || h.includes("slot")
        );
      }
      break;
    }
  }

  if (headerRowIdx === -1 || codeIdx === -1 || facIdx === -1 || dayIdx === -1) {
    throw new Error(
      "Could not detect required timetable headers. Document must contain Course Code, Facilitator/Lecturer, and Day of Week columns."
    );
  }

  const parsedRows: ParsedTimetableRow[] = [];

  for (let r = headerRowIdx + 1; r < grid.length; r++) {
    const row = grid[r];
    if (!row || row.length === 0) continue;

    const courseCode = row[codeIdx]?.trim() || "";
    const facilitatorName = row[facIdx]?.trim() || "";
    const rawDay = row[dayIdx]?.trim() || "";
    if (!courseCode || !facilitatorName || !rawDay) continue;

    let startTime = "";
    let endTime = "";

    if (startIdx !== -1 && endIdx !== -1) {
      startTime = normalizeTimeTo24Hr(row[startIdx] || "");
      endTime = normalizeTimeTo24Hr(row[endIdx] || "");
    } else if (timeCombinedIdx !== -1) {
      const split = splitTimeRange(row[timeCombinedIdx] || "");
      startTime = split.start;
      endTime = split.end;
    }

    const courseName = nameIdx !== -1 ? row[nameIdx]?.trim() : undefined;
    const venue = venueIdx !== -1 ? row[venueIdx]?.trim() : "Main Lecture Hall";
    const programme = progIdx !== -1 ? row[progIdx]?.trim() : undefined;
    const level = levelIdx !== -1 ? row[levelIdx]?.trim() : undefined;

    parsedRows.push({
      courseCode,
      courseName,
      facilitatorName,
      dayOfWeek: rawDay,
      startTime,
      endTime,
      venue: venue || "Main Lecture Hall",
      programme,
      level,
    });
  }

  return parsedRows;
}

/**
 * Universal intake processor for external timetable files (Word, Excel, or CSV).
 * Automatically populates Programmes, Courses, and Facilitators if they don't already exist!
 */
export async function processUniversalTimetableFile(params: {
  buffer: Buffer;
  fileName: string;
  versionId: string;
  userId?: string;
}): Promise<UniversalImportResult> {
  const { buffer, fileName, versionId, userId } = params;
  const ext = fileName.toLowerCase().split(".").pop() || "";

  let grid: string[][];
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    grid = extractGridFromExcel(buffer);
  } else if (ext === "docx") {
    grid = await extractGridFromWord(buffer);
  } else {
    throw new Error(`Unsupported file type: .${ext}. Please upload a Word (.docx) or Excel (.xlsx, .xls, .csv) document.`);
  }

  const parsedRows = parseGridToTimetableRows(grid);
  if (parsedRows.length === 0) {
    throw new Error("No timetable schedule entries found in the uploaded document.");
  }

  const version = await prisma.timetableVersion.findUnique({
    where: { id: versionId },
    include: {
      timetable: {
        include: {
          programme: true,
          programmeLevel: true,
          academicPeriod: true,
        },
      },
    },
  });

  if (!version) {
    throw new Error("Target timetable version not found.");
  }

  if (version.status === "PUBLISHED" || version.status === "SUPERSEDED") {
    throw new Error("Published timetable versions are frozen. Create a draft revision to import.");
  }

  // Pre-fetch & cache existing entities for auto-population
  const existingCourses = await prisma.course.findMany();
  const existingFacilitators = await prisma.facilitator.findMany();
  const existingProgrammes = await prisma.programme.findMany();

  const courseMap = new Map<string, (typeof existingCourses)[0]>();
  for (const c of existingCourses) {
    courseMap.set(c.code.toUpperCase().replace(/\s+/g, ""), c);
  }

  const facilitatorMap = new Map<string, (typeof existingFacilitators)[0]>();
  for (const f of existingFacilitators) {
    facilitatorMap.set(f.name.toLowerCase().trim(), f);
  }

  const programmeMap = new Map<string, (typeof existingProgrammes)[0]>();
  for (const p of existingProgrammes) {
    programmeMap.set(p.name.toLowerCase().trim(), p);
    programmeMap.set(p.code.toUpperCase().trim(), p);
  }

  const programmesCreated: string[] = [];
  const coursesCreated: string[] = [];
  const facilitatorsCreated: string[] = [];
  const errors: string[] = [];
  const allConflicts: SchedulingConflict[] = [];

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < parsedRows.length; i++) {
    const row = parsedRows[i];
    const rowNum = i + 1;

    // 1. Validate Day
    const normalizedDayInput = row.dayOfWeek.trim().toUpperCase();
    const validDay = VALID_DAYS_MAP[normalizedDayInput];
    if (!validDay) {
      errors.push(`Row ${rowNum}: Invalid day of week "${row.dayOfWeek}".`);
      skipped++;
      continue;
    }

    // 2. Validate Time
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(row.startTime) || !timeRegex.test(row.endTime)) {
      errors.push(`Row ${rowNum} (${row.courseCode}): Invalid or unparseable time format (${row.startTime || "none"} - ${row.endTime || "none"}). Expected HH:mm.`);
      skipped++;
      continue;
    }

    // 3. Auto-populate Programme (if row specified one and it's new)
    if (row.programme?.trim()) {
      const progClean = row.programme.trim();
      const progKey = progClean.toLowerCase();
      if (!programmeMap.has(progKey)) {
        const generatedCode = progClean.split(" ").map((w) => w[0]).join("").toUpperCase().slice(0, 8) || "PROG";
        const newProg = await prisma.programme.create({
          data: {
            code: generatedCode,
            name: progClean,
            description: `Auto-created from external timetable: ${fileName}`,
          },
        });
        programmeMap.set(progKey, newProg);
        programmeMap.set(newProg.code.toUpperCase(), newProg);
        programmesCreated.push(`${newProg.code} - ${newProg.name}`);
      }
    }

    // 4. Auto-populate Course (if new)
    const cleanCourseCode = row.courseCode.trim().toUpperCase().replace(/\s+/g, "");
    let course = courseMap.get(cleanCourseCode);
    if (!course) {
      course = await prisma.course.create({
        data: {
          code: cleanCourseCode,
          name: row.courseName?.trim() || `Course ${cleanCourseCode}`,
          creditHours: 3,
        },
      });
      courseMap.set(cleanCourseCode, course);
      coursesCreated.push(`${course.code}: ${course.name}`);
    }

    // 5. Auto-populate Facilitator (Lead Facilitator from the timetable)
    const cleanFacName = row.facilitatorName.trim();
    const facKey = cleanFacName.toLowerCase();
    let facilitator = facilitatorMap.get(facKey);
    if (!facilitator) {
      facilitator = await prisma.facilitator.create({
        data: {
          name: cleanFacName,
          department: "Academic Department",
        },
      });
      facilitatorMap.set(facKey, facilitator);
      facilitatorsCreated.push(facilitator.name);
    }

    // 6. Conflict Detection
    const candidate: CandidateEntry = {
      timetableVersionId: versionId,
      courseId: course.id,
      facilitatorId: facilitator.id,
      dayOfWeek: validDay,
      startTime: row.startTime,
      endTime: row.endTime,
      venue: row.venue.trim(),
    };

    const conflicts = await detectSchedulingConflicts(candidate);
    if (conflicts.length > 0) {
      allConflicts.push(...conflicts);
      errors.push(`Row ${rowNum} (${cleanCourseCode} on ${validDay}): ${conflicts[0].message}`);
      skipped++;
      continue;
    }

    // 7. Insert Entry
    await prisma.timetableEntry.create({
      data: candidate,
    });
    imported++;
  }

  // Update version status to DRAFT if entries added
  if (imported > 0 && version.status === "VALIDATED") {
    await prisma.timetableVersion.update({
      where: { id: version.id },
      data: { status: "DRAFT" },
    });
  }

  // Record audit log
  if (imported > 0) {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        timetableId: version.timetableId,
        action: "IMPORT_EXTERNAL_FILE",
        entityType: "VERSION",
        entityId: versionId,
        details: JSON.stringify({
          fileName,
          imported,
          skipped,
          coursesCreated: coursesCreated.length,
          facilitatorsCreated: facilitatorsCreated.length,
          programmesCreated: programmesCreated.length,
        }),
      },
    });
  }

  return {
    success: true,
    imported,
    skipped,
    programmesCreated,
    coursesCreated,
    facilitatorsCreated,
    errors,
    conflicts: allConflicts,
  };
}

/**
 * Normalizes user or row level string to levelCode and friendly levelName
 */
export function normalizeLevel(raw?: string): { levelCode: string; levelName: string } {
  if (!raw) return { levelCode: "100", levelName: "Level 100" };
  const cleaned = raw.trim();
  const digitMatch = cleaned.match(/\d+/);
  if (digitMatch) {
    const code = digitMatch[0];
    return { levelCode: code, levelName: `Level ${code}` };
  }
  const code = cleaned.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 8) || "100";
  return { levelCode: code, levelName: cleaned };
}

/**
 * Extracts a friendly academic programme name from a timetable filename
 */
export function cleanDerivedProgrammeName(fileName: string): string {
  const withoutExt = fileName.replace(/\.[^/.]+$/, "");
  const spaced = withoutExt.replace(/[_\-.]+/g, " ");
  const cleaned = spaced
    .replace(/\b(timetable|schedule|draft|final|v\d+|version|official|intake|lecture|academic|file)\b/gi, "")
    .trim();
  return cleaned || "General Academic Programme";
}

/**
 * Standalone Timetable Intake Processor:
 * Ingests external Word (.docx) or Excel (.xlsx, .xls, .csv) documents directly.
 * Automatically creates Programmes, Levels, Timetables, Versions, Courses, and Lead Facilitators,
 * populates the schedule entries, and optionally publishes them immediately so they appear
 * on the Lecture Calendar and Live Attendance Tracker without requiring manual creation beforehand.
 */
export async function processStandaloneTimetableIntake(
  params: StandaloneIntakeParams
): Promise<StandaloneIntakeResult> {
  const {
    buffer,
    fileName,
    userId,
    academicPeriodId,
    defaultProgrammeName,
    defaultLevelCode,
    autoPublish = true,
  } = params;

  const ext = fileName.toLowerCase().split(".").pop() || "";

  let grid: string[][];
  if (ext === "xlsx" || ext === "xls" || ext === "csv") {
    grid = extractGridFromExcel(buffer);
  } else if (ext === "docx") {
    grid = await extractGridFromWord(buffer);
  } else {
    throw new Error(
      `Unsupported file type: .${ext}. Please upload a Word (.docx) or Excel (.xlsx, .xls, .csv) document.`
    );
  }

  const parsedRows = parseGridToTimetableRows(grid);
  if (parsedRows.length === 0) {
    throw new Error("No timetable schedule entries found in the uploaded document.");
  }

  // 1. Resolve Academic Period
  let period: any = null;
  if (academicPeriodId) {
    period = await prisma.academicPeriod.findUnique({
      where: { id: academicPeriodId },
    });
    if (!period) {
      throw new Error("Specified academic period not found.");
    }
  } else {
    period = await prisma.academicPeriod.findFirst({
      where: { isCurrent: true },
    });
    if (!period) {
      period = await prisma.academicPeriod.findFirst({
        orderBy: { createdAt: "desc" },
      });
    }
    if (!period) {
      period = await prisma.academicPeriod.create({
        data: {
          academicYear: "2025/2026",
          semester: "Semester 1",
          startDate: new Date(),
          endDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
          isCurrent: true,
        },
      });
    }
  }

  // 2. Pre-fetch existing entities to cache and minimize DB lookups
  const existingProgrammes = await prisma.programme.findMany({
    include: { levels: true },
  });
  const existingCourses = await prisma.course.findMany();
  const existingFacilitators = await prisma.facilitator.findMany();

  const progMapByName = new Map<string, (typeof existingProgrammes)[0]>();
  const progMapByCode = new Map<string, (typeof existingProgrammes)[0]>();
  for (const p of existingProgrammes) {
    progMapByName.set(p.name.toLowerCase().trim(), p);
    progMapByCode.set(p.code.toUpperCase().trim(), p);
  }

  const courseMap = new Map<string, (typeof existingCourses)[0]>();
  for (const c of existingCourses) {
    courseMap.set(c.code.toUpperCase().replace(/\s+/g, ""), c);
  }

  const facilitatorMap = new Map<string, (typeof existingFacilitators)[0]>();
  for (const f of existingFacilitators) {
    facilitatorMap.set(f.name.toLowerCase().trim(), f);
  }

  const programmesCreated: string[] = [];
  const coursesCreated: string[] = [];
  const facilitatorsCreated: string[] = [];
  const errors: string[] = [];
  const allConflicts: SchedulingConflict[] = [];
  const timetablesSummary: StandaloneTimetableRecord[] = [];

  const derivedFallbackProgName = cleanDerivedProgrammeName(fileName);

  // 3. Group parsed rows by Programme & Level
  interface GroupedCohort {
    programmeName: string;
    levelCode: string;
    levelName: string;
    rows: ParsedTimetableRow[];
  }

  const cohortGroups = new Map<string, GroupedCohort>();

  for (const row of parsedRows) {
    const rawProg =
      row.programme?.trim() ||
      defaultProgrammeName?.trim() ||
      derivedFallbackProgName;
    const rawLevel = row.level?.trim() || defaultLevelCode?.trim();
    const { levelCode, levelName } = normalizeLevel(rawLevel);

    const groupKey = `${rawProg.toLowerCase()}:::${levelCode}`;
    if (!cohortGroups.has(groupKey)) {
      cohortGroups.set(groupKey, {
        programmeName: rawProg,
        levelCode,
        levelName,
        rows: [],
      });
    }
    cohortGroups.get(groupKey)!.rows.push(row);
  }

  let totalImported = 0;
  let totalSkipped = 0;

  // 4. Process each cohort group: ensure Programme, Level, Timetable & Version exist
  for (const group of cohortGroups.values()) {
    // 4a. Find or create Programme
    const progKey = group.programmeName.toLowerCase().trim();
    let programme = progMapByName.get(progKey);

    if (!programme) {
      // Generate clean unique code
      const words = group.programmeName.split(/\s+/).filter(Boolean);
      let baseCode = words
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 8);
      if (baseCode.length < 2) {
        baseCode =
          group.programmeName
            .toUpperCase()
            .replace(/[^A-Z0-9]/g, "")
            .slice(0, 6) || "PROG";
      }

      let code = baseCode;
      let counter = 1;
      while (
        progMapByCode.has(code) ||
        (await prisma.programme.findUnique({ where: { code } }))
      ) {
        counter++;
        code = `${baseCode.slice(0, 5)}${counter}`;
      }

      const createdProg = await prisma.programme.create({
        data: {
          code,
          name: group.programmeName,
          description: `Auto-created from external timetable intake: ${fileName}`,
        },
        include: { levels: true },
      });

      programme = createdProg;
      progMapByName.set(progKey, createdProg);
      progMapByCode.set(createdProg.code.toUpperCase(), createdProg);
      programmesCreated.push(`${createdProg.code} - ${createdProg.name}`);
    }

    // 4b. Find or create ProgrammeLevel
    let level = programme.levels.find(
      (l) => l.levelCode.toLowerCase() === group.levelCode.toLowerCase()
    );

    if (!level) {
      const createdLevel = await prisma.programmeLevel.create({
        data: {
          programmeId: programme.id,
          levelCode: group.levelCode,
          levelName: group.levelName,
          sortOrder: parseInt(group.levelCode, 10) || 1,
        },
      });
      programme.levels.push(createdLevel);
      level = createdLevel;
    }

    // 4c. Find or create Timetable record
    let timetable = await prisma.timetable.findUnique({
      where: {
        programmeId_programmeLevelId_academicPeriodId: {
          programmeId: programme.id,
          programmeLevelId: level.id,
          academicPeriodId: period.id,
        },
      },
      include: {
        versions: {
          orderBy: { versionNumber: "desc" },
        },
      },
    });

    if (!timetable) {
      timetable = await prisma.timetable.create({
        data: {
          programmeId: programme.id,
          programmeLevelId: level.id,
          academicPeriodId: period.id,
          status: "DRAFT",
        },
        include: {
          versions: {
            orderBy: { versionNumber: "desc" },
          },
        },
      });
    }

    // 4d. Find or create a draft TimetableVersion
    let targetVersion = timetable.versions.find((v) => v.status === "DRAFT");
    if (!targetVersion) {
      const nextVer = (timetable.versions[0]?.versionNumber || 0) + 1;
      targetVersion = await prisma.timetableVersion.create({
        data: {
          timetableId: timetable.id,
          versionNumber: nextVer,
          status: "DRAFT",
          notes: `Imported from ${fileName}`,
        },
      });
    }

    let cohortImported = 0;

    // 4e. Process rows for this cohort
    for (let i = 0; i < group.rows.length; i++) {
      const row = group.rows[i];
      const rowNum = i + 1;

      // Validate Day
      const normalizedDay = row.dayOfWeek.trim().toUpperCase();
      const validDay = VALID_DAYS_MAP[normalizedDay];
      if (!validDay) {
        errors.push(
          `Row ${rowNum} (${row.courseCode}): Invalid day of week "${row.dayOfWeek}".`
        );
        totalSkipped++;
        continue;
      }

      // Validate Time
      const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
      if (!timeRegex.test(row.startTime) || !timeRegex.test(row.endTime)) {
        errors.push(
          `Row ${rowNum} (${row.courseCode}): Invalid time format (${row.startTime || "none"} - ${row.endTime || "none"}). Expected HH:mm.`
        );
        totalSkipped++;
        continue;
      }

      // Auto-populate Course
      const cleanCourseCode = row.courseCode
        .trim()
        .toUpperCase()
        .replace(/\s+/g, "");
      let course = courseMap.get(cleanCourseCode);
      if (!course) {
        course = await prisma.course.create({
          data: {
            code: cleanCourseCode,
            name: row.courseName?.trim() || `Course ${cleanCourseCode}`,
            creditHours: 3,
          },
        });
        courseMap.set(cleanCourseCode, course);
        coursesCreated.push(`${course.code}: ${course.name}`);
      }

      // Auto-populate Facilitator (Lead Facilitator from timetable document)
      const cleanFacName = row.facilitatorName.trim();
      const facKey = cleanFacName.toLowerCase();
      let facilitator = facilitatorMap.get(facKey);
      if (!facilitator) {
        facilitator = await prisma.facilitator.create({
          data: {
            name: cleanFacName,
            department: programme.name || "Academic Department",
          },
        });
        facilitatorMap.set(facKey, facilitator);
        facilitatorsCreated.push(facilitator.name);
      }

      // Conflict Detection
      const candidate: CandidateEntry = {
        timetableVersionId: targetVersion.id,
        courseId: course.id,
        facilitatorId: facilitator.id,
        dayOfWeek: validDay,
        startTime: row.startTime,
        endTime: row.endTime,
        venue: row.venue.trim(),
      };

      const conflicts = await detectSchedulingConflicts(candidate);
      if (conflicts.length > 0) {
        allConflicts.push(...conflicts);
        errors.push(
          `Row ${rowNum} (${cleanCourseCode} on ${validDay}): ${conflicts[0].message}`
        );
        totalSkipped++;
        continue;
      }

      // Insert TimetableEntry
      await prisma.timetableEntry.create({
        data: candidate,
      });

      cohortImported++;
      totalImported++;
    }

    let isPublished = false;

    // 4f. Automatically publish if requested and entries exist
    if (autoPublish && cohortImported > 0) {
      const pubRes = await publishTimetableVersion(
        targetVersion.id,
        `Auto-published from intake document: ${fileName}`,
        userId
      );
      if (pubRes.success) {
        isPublished = true;
      } else {
        errors.push(
          `Timetable for ${programme.name} (${level.levelName}) created as DRAFT. Note: ${pubRes.error || "validation conflict"}`
        );
      }
    }

    timetablesSummary.push({
      timetableId: timetable.id,
      versionId: targetVersion.id,
      versionNumber: targetVersion.versionNumber,
      programmeName: programme.name,
      programmeCode: programme.code,
      levelName: level.levelName,
      levelCode: level.levelCode,
      entriesCount: cohortImported,
      published: isPublished,
    });
  }

  // 5. Institutional Audit Log
  if (totalImported > 0) {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        timetableId: timetablesSummary[0]?.timetableId || null,
        action: "STANDALONE_TIMETABLE_INTAKE",
        entityType: "TIMETABLE",
        entityId: timetablesSummary[0]?.timetableId || "batch",
        details: JSON.stringify({
          fileName,
          totalImported,
          totalSkipped,
          programmesCreated: programmesCreated.length,
          coursesCreated: coursesCreated.length,
          facilitatorsCreated: facilitatorsCreated.length,
          cohortsCount: timetablesSummary.length,
          autoPublish,
        }),
      },
    });
  }

  return {
    success: true,
    imported: totalImported,
    skipped: totalSkipped,
    programmesCreated,
    coursesCreated,
    facilitatorsCreated,
    timetablesCreated: timetablesSummary,
    errors,
    conflicts: allConflicts,
    academicPeriodName: `${period.academicYear} — ${period.semester}`,
    published: autoPublish && timetablesSummary.some((t) => t.published),
  };
}
