import { prisma } from "@/lib/db/prisma";
import { TimetableIntakeHub } from "@/components/timetables/TimetableIntakeHub";

export const dynamic = "force-dynamic";

export default async function NewTimetablePage() {
  const [programmes, periods] = await Promise.all([
    prisma.programme.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      include: {
        levels: {
          where: { isActive: true },
          orderBy: { sortOrder: "asc" },
        },
      },
    }),
    prisma.academicPeriod.findMany({
      orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Timetable Setup & Intake
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          Intake official Word/Excel timetable documents automatically or initialize a manual schedule shell.
        </p>
      </div>

      <TimetableIntakeHub programmes={programmes} periods={periods} />
    </div>
  );
}
