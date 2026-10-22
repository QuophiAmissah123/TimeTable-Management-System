import { requireAdmin } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import {
  getTodayScheduledClasses,
  getTeachingSessionsReport,
  formatDateKey,
} from "@/lib/services/session-service";
import { AttendancePageManager } from "@/components/teaching-sessions/AttendancePageManager";
import { Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  await requireAdmin();

  const todayStr = formatDateKey(new Date());

  const [classesResult, sessionsResult, facilitators, programmes] =
    await Promise.all([
      getTodayScheduledClasses(todayStr),
      getTeachingSessionsReport(),
      prisma.facilitator.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
      prisma.programme.findMany({
        where: { isActive: true },
        orderBy: { name: "asc" },
      }),
    ]);

  const initialClasses = classesResult.success ? classesResult.data || [] : [];
  const initialSessions = sessionsResult.success ? sessionsResult.data || [] : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Lecturer Attendance & Teaching-Time Tracking
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Authorized session recording, live elapsed duration tracking, and institutional attendance reports.
          </p>
        </div>
      </div>

      <AttendancePageManager
        initialClasses={initialClasses}
        initialSessions={initialSessions}
        initialDate={todayStr}
        facilitators={facilitators}
        programmes={programmes}
      />
    </div>
  );
}
