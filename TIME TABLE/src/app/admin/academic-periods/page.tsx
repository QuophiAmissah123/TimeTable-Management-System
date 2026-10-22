import { prisma } from "@/lib/db/prisma";
import { AcademicPeriodsManager } from "@/components/academic-periods/AcademicPeriodsManager";

export const dynamic = "force-dynamic";

export default async function AcademicPeriodsPage() {
  const periods = await prisma.academicPeriod.findMany({
    orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
    include: {
      _count: {
        select: { timetables: true },
      },
    },
  });

  return <AcademicPeriodsManager periods={periods as any} />;
}
