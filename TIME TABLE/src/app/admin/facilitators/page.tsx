import { prisma } from "@/lib/db/prisma";
import { FacilitatorsManager } from "@/components/facilitators/FacilitatorsManager";

export const dynamic = "force-dynamic";

export default async function FacilitatorsPage() {
  const facilitators = await prisma.facilitator.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });

  return <FacilitatorsManager facilitators={facilitators as any} />;
}
