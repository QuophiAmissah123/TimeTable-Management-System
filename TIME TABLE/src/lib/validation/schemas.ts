import { z } from "zod";

export const DayOfWeekEnum = z.enum([
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
]);

export type DayOfWeek = z.infer<typeof DayOfWeekEnum>;

export const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

// Helper function to convert "HH:mm" to minutes since midnight
export function timeToMinutes(timeStr: string): number {
  const [hours, minutes] = timeStr.split(":").map(Number);
  return hours * 60 + minutes;
}

// -------------------------------------------------------------
// ACADEMIC PERIOD SCHEMA
// -------------------------------------------------------------
export const academicPeriodSchema = z.object({
  academicYear: z
    .string()
    .trim()
    .min(4, "Academic year is required (e.g. 2025/2026)")
    .regex(/^\d{4}(\/\d{4})?$/, "Academic year format should be YYYY or YYYY/YYYY (e.g. 2025/2026)"),
  semester: z
    .string()
    .trim()
    .min(1, "Semester is required (e.g. Semester 1)"),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  isCurrent: z.boolean().default(false),
});

export type AcademicPeriodInput = z.infer<typeof academicPeriodSchema>;

// -------------------------------------------------------------
// PROGRAMME & LEVELS SCHEMA
// -------------------------------------------------------------
export const programmeSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Programme code must be at least 2 characters")
    .max(20, "Programme code cannot exceed 20 characters")
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, "Programme name must be at least 2 characters")
    .max(150, "Programme name cannot exceed 150 characters"),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type ProgrammeInput = z.infer<typeof programmeSchema>;

export const programmeLevelSchema = z.object({
  programmeId: z.string().min(1, "Programme ID is required"),
  levelCode: z
    .string()
    .trim()
    .min(1, "Level code is required (e.g. 100, 200, 300)"),
  levelName: z
    .string()
    .trim()
    .min(1, "Level name is required (e.g. Level 100 / First Year)"),
  sortOrder: z.coerce.number().int().min(1).default(1),
  isActive: z.boolean().default(true),
});

export type ProgrammeLevelInput = z.infer<typeof programmeLevelSchema>;

// -------------------------------------------------------------
// COURSE SCHEMA
// -------------------------------------------------------------
export const courseSchema = z.object({
  code: z
    .string()
    .trim()
    .min(2, "Course code must be at least 2 characters")
    .max(20, "Course code cannot exceed 20 characters")
    .toUpperCase(),
  name: z
    .string()
    .trim()
    .min(2, "Course name must be at least 2 characters")
    .max(150, "Course name cannot exceed 150 characters"),
  creditHours: z.coerce.number().int().min(1).max(12).default(3),
  description: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type CourseInput = z.infer<typeof courseSchema>;

// -------------------------------------------------------------
// FACILITATOR SCHEMA
// -------------------------------------------------------------
export const facilitatorSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Facilitator name must be at least 2 characters")
    .max(120, "Facilitator name cannot exceed 120 characters"),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .nullable(),
  phone: z.string().trim().optional().nullable(),
  department: z.string().trim().optional().nullable(),
  isActive: z.boolean().default(true),
});

export type FacilitatorInput = z.infer<typeof facilitatorSchema>;

// -------------------------------------------------------------
// TIMETABLE CREATION & ENTRY SCHEMAS
// -------------------------------------------------------------
export const timetableCreateSchema = z.object({
  programmeId: z.string().min(1, "Programme is required"),
  programmeLevelId: z.string().min(1, "Programme level is required"),
  academicPeriodId: z.string().min(1, "Academic period is required"),
});

export type TimetableCreateInput = z.infer<typeof timetableCreateSchema>;

export const timetableEntrySchema = z
  .object({
    timetableVersionId: z.string().min(1, "Timetable version is required"),
    courseId: z.string().min(1, "Course is required"),
    facilitatorId: z.string().min(1, "Facilitator is required"),
    dayOfWeek: DayOfWeekEnum,
    startTime: z
      .string()
      .regex(timeRegex, "Start time must be in HH:mm format (e.g. 08:30)"),
    endTime: z
      .string()
      .regex(timeRegex, "End time must be in HH:mm format (e.g. 10:30)"),
    venue: z
      .string()
      .trim()
      .min(1, "Venue is required")
      .max(80, "Venue cannot exceed 80 characters"),
  })
  .refine(
    (data) => timeToMinutes(data.endTime) > timeToMinutes(data.startTime),
    {
      message: "End time must be strictly after start time",
      path: ["endTime"],
    }
  )
  .refine(
    (data) => timeToMinutes(data.endTime) - timeToMinutes(data.startTime) >= 30,
    {
      message: "Session duration must be at least 30 minutes",
      path: ["endTime"],
    }
  );

export type TimetableEntryInput = z.infer<typeof timetableEntrySchema>;

// -------------------------------------------------------------
// PUBLICATION SCHEMA
// -------------------------------------------------------------
export const publishVersionSchema = z.object({
  timetableId: z.string().min(1, "Timetable ID is required"),
  versionId: z.string().min(1, "Version ID is required"),
  notes: z.string().trim().optional().nullable(),
});

export type PublishVersionInput = z.infer<typeof publishVersionSchema>;

// -------------------------------------------------------------
// AUTHENTICATION SCHEMA
// -------------------------------------------------------------
export const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;
