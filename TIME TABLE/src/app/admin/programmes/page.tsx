import { prisma } from "@/lib/db/prisma";
import { ProgrammesManager } from "@/components/programmes/ProgrammesManager";

export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const programmes = await prisma.programme.findMany({
    orderBy: { name: "asc" },
    include: {
      levels: {
        orderBy: { sortOrder: "asc" },
      },
      _count: {
        select: { timetables: true },
      },
    },
  });

  return <ProgrammesManager programmes={programmes as any} />;
}
