import { prisma } from "@/lib/db/prisma";
import { CoursesManager } from "@/components/courses/CoursesManager";

export const dynamic = "force-dynamic";

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { code: "asc" },
    include: {
      _count: {
        select: { entries: true },
      },
    },
  });

  return <CoursesManager courses={courses as any} />;
}
