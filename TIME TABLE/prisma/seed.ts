import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seeding for College Academic Timetable System...");

  // 1. Clean existing records in correct referential order
  await prisma.auditLog.deleteMany();
  await prisma.timetableEntry.deleteMany();
  await prisma.timetableVersion.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.course.deleteMany();
  await prisma.facilitator.deleteMany();
  await prisma.programmeLevel.deleteMany();
  await prisma.programme.deleteMany();
  await prisma.academicPeriod.deleteMany();
  await prisma.user.deleteMany();

  console.log("🧹 Cleaned existing records.");

  // 2. Seed Users
  const passwordHash = await bcrypt.hash("Admin123!", 10);
  const adminUser = await prisma.user.create({
    data: {
      email: "admin@university.edu",
      fullName: "System Administrator",
      passwordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  const viewerUser = await prisma.user.create({
    data: {
      email: "viewer@university.edu",
      fullName: "Academic Viewer",
      passwordHash: await bcrypt.hash("Viewer123!", 10),
      role: "VIEWER",
      isActive: true,
    },
  });

  console.log(`👤 Created users: ${adminUser.email}, ${viewerUser.email}`);

  // 3. Seed Academic Periods
  const currentPeriod = await prisma.academicPeriod.create({
    data: {
      academicYear: "2025/2026",
      semester: "Semester 1",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2025-12-20"),
      isCurrent: true,
    },
  });

  const nextPeriod = await prisma.academicPeriod.create({
    data: {
      academicYear: "2025/2026",
      semester: "Semester 2",
      startDate: new Date("2026-01-15"),
      endDate: new Date("2026-05-30"),
      isCurrent: false,
    },
  });

  console.log(`📅 Created academic periods: ${currentPeriod.academicYear} ${currentPeriod.semester} (Active)`);

  // 4. Seed Programmes & Levels
  const bscCs = await prisma.programme.create({
    data: {
      code: "BSC-CS",
      name: "BSc Computer Science",
      description: "Undergraduate degree in computer science, software engineering, and computational theory.",
      isActive: true,
      levels: {
        create: [
          { levelCode: "100", levelName: "Level 100 / First Year", sortOrder: 1, isActive: true },
          { levelCode: "200", levelName: "Level 200 / Second Year", sortOrder: 2, isActive: true },
          { levelCode: "300", levelName: "Level 300 / Third Year", sortOrder: 3, isActive: true },
          { levelCode: "400", levelName: "Level 400 / Final Year", sortOrder: 4, isActive: true },
        ],
      },
    },
    include: { levels: true },
  });

  const bscIt = await prisma.programme.create({
    data: {
      code: "BSC-IT",
      name: "BSc Information Technology",
      description: "Undergraduate degree focusing on enterprise network infrastructure, systems administration, and IT solutions.",
      isActive: true,
      levels: {
        create: [
          { levelCode: "100", levelName: "Level 100 / First Year", sortOrder: 1, isActive: true },
          { levelCode: "200", levelName: "Level 200 / Second Year", sortOrder: 2, isActive: true },
          { levelCode: "300", levelName: "Level 300 / Third Year", sortOrder: 3, isActive: true },
          { levelCode: "400", levelName: "Level 400 / Final Year", sortOrder: 4, isActive: true },
        ],
      },
    },
    include: { levels: true },
  });

  const bbaAcc = await prisma.programme.create({
    data: {
      code: "BBA-ACC",
      name: "BBA Accounting",
      description: "Bachelor of Business Administration specializing in Accounting, Auditing, and Corporate Finance.",
      isActive: true,
      levels: {
        create: [
          { levelCode: "100", levelName: "Level 100 / First Year", sortOrder: 1, isActive: true },
          { levelCode: "200", levelName: "Level 200 / Second Year", sortOrder: 2, isActive: true },
        ],
      },
    },
    include: { levels: true },
  });

  console.log(`🎓 Created programmes: ${bscCs.code}, ${bscIt.code}, ${bbaAcc.code}`);

  // 5. Seed Facilitators
  const drMensah = await prisma.facilitator.create({
    data: {
      name: "Dr. Kwame Mensah",
      email: "kwame.mensah@university.edu",
      phone: "+233 24 100 2001",
      department: "Computer Science",
      isActive: true,
    },
  });

  const profOsei = await prisma.facilitator.create({
    data: {
      name: "Prof. Abena Osei",
      email: "abena.osei@university.edu",
      phone: "+233 20 200 3002",
      department: "Computer Science",
      isActive: true,
    },
  });

  const drDarko = await prisma.facilitator.create({
    data: {
      name: "Dr. Emmanuel Darko",
      email: "emmanuel.darko@university.edu",
      phone: "+233 27 300 4003",
      department: "Mathematics",
      isActive: true,
    },
  });

  const drAppiah = await prisma.facilitator.create({
    data: {
      name: "Dr. Sarah Appiah",
      email: "sarah.appiah@university.edu",
      phone: "+233 50 400 5004",
      department: "Computer Science",
      isActive: true,
    },
  });

  const mrBoateng = await prisma.facilitator.create({
    data: {
      name: "Mr. Felix Boateng",
      email: "felix.boateng@university.edu",
      phone: "+233 54 500 6005",
      department: "Information Technology",
      isActive: true,
    },
  });

  const mrsAnsah = await prisma.facilitator.create({
    data: {
      name: "Mrs. Grace Ansah",
      email: "grace.ansah@university.edu",
      phone: "+233 26 600 7006",
      department: "Languages & Communication",
      isActive: true,
    },
  });

  console.log("👨‍🏫 Created academic facilitators.");

  // 6. Seed Courses
  const cs101 = await prisma.course.create({
    data: {
      code: "CS101",
      name: "Introduction to Computer Science & Programming",
      creditHours: 3,
      description: "Fundamental programming constructs, control flow, problem solving, and Python fundamentals.",
      isActive: true,
    },
  });

  const cs103 = await prisma.course.create({
    data: {
      code: "CS103",
      name: "Discrete Mathematics for Computing",
      creditHours: 3,
      description: "Set theory, propositional logic, relations, combinatorics, and graph theory.",
      isActive: true,
    },
  });

  const cs105 = await prisma.course.create({
    data: {
      code: "CS105",
      name: "Digital Electronics & Logic Design",
      creditHours: 3,
      description: "Boolean algebra, logic gates, combinational and sequential circuit design.",
      isActive: true,
    },
  });

  const math101 = await prisma.course.create({
    data: {
      code: "MATH101",
      name: "Calculus I",
      creditHours: 3,
      description: "Differential calculus, limits, continuity, and applications of derivatives.",
      isActive: true,
    },
  });

  const eng101 = await prisma.course.create({
    data: {
      code: "ENG101",
      name: "Academic Writing & Communication",
      creditHours: 2,
      description: "Academic essay structuring, technical referencing, and formal communication skills.",
      isActive: true,
    },
  });

  const cs201 = await prisma.course.create({
    data: {
      code: "CS201",
      name: "Data Structures & Algorithms",
      creditHours: 3,
      description: "Arrays, linked lists, trees, hash maps, sorting algorithms, and complexity analysis.",
      isActive: true,
    },
  });

  console.log("📚 Created academic courses.");

  // 7. Seed Sample Published Timetable: BSc Computer Science Level 100
  const csL100 = bscCs.levels.find((l) => l.levelCode === "100")!;

  const timetable = await prisma.timetable.create({
    data: {
      programmeId: bscCs.id,
      programmeLevelId: csL100.id,
      academicPeriodId: currentPeriod.id,
      status: "PUBLISHED",
    },
  });

  const publishedVersion = await prisma.timetableVersion.create({
    data: {
      timetableId: timetable.id,
      versionNumber: 1,
      status: "PUBLISHED",
      notes: "Official Semester 1 Academic Timetable for First Year Computer Science",
      publishedAt: new Date(),
      publishedById: adminUser.id,
      entries: {
        create: [
          {
            courseId: cs101.id,
            facilitatorId: drMensah.id,
            dayOfWeek: "MONDAY",
            startTime: "08:30",
            endTime: "10:30",
            venue: "Great Hall Lecture Annex 1",
          },
          {
            courseId: math101.id,
            facilitatorId: drDarko.id,
            dayOfWeek: "MONDAY",
            startTime: "11:00",
            endTime: "13:00",
            venue: "Science Block Room 204",
          },
          {
            courseId: cs105.id,
            facilitatorId: drAppiah.id,
            dayOfWeek: "TUESDAY",
            startTime: "09:00",
            endTime: "11:00",
            venue: "Computer Lab 1",
          },
          {
            courseId: eng101.id,
            facilitatorId: mrsAnsah.id,
            dayOfWeek: "WEDNESDAY",
            startTime: "10:00",
            endTime: "12:00",
            venue: "Language Lab LH-2",
          },
          {
            courseId: cs103.id,
            facilitatorId: drMensah.id,
            dayOfWeek: "WEDNESDAY",
            startTime: "13:00",
            endTime: "15:00",
            venue: "Lecture Theatre A",
          },
          {
            courseId: cs101.id,
            facilitatorId: drMensah.id,
            dayOfWeek: "THURSDAY",
            startTime: "08:30",
            endTime: "11:30",
            venue: "Computer Lab 2 (Practical)",
          },
          {
            courseId: math101.id,
            facilitatorId: drDarko.id,
            dayOfWeek: "FRIDAY",
            startTime: "09:00",
            endTime: "11:00",
            venue: "Seminar Room B (Tutorial)",
          },
        ],
      },
    },
  });

  // Link published version ID to parent Timetable
  await prisma.timetable.update({
    where: { id: timetable.id },
    data: { currentPublishedVersionId: publishedVersion.id },
  });

  // Create Audit Log
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      timetableId: timetable.id,
      action: "PUBLISH_TIMETABLE",
      entityType: "TIMETABLE",
      entityId: timetable.id,
      details: JSON.stringify({
        programme: bscCs.name,
        level: csL100.levelName,
        period: `${currentPeriod.academicYear} ${currentPeriod.semester}`,
        version: 1,
        entriesCount: 7,
      }),
    },
  });

  console.log(`✅ Successfully published sample timetable for ${bscCs.code} Level 100 with 7 sessions!`);
  console.log("🚀 Database seed finished successfully.");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
