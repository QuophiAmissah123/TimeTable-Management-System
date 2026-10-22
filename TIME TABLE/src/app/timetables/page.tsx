import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import { PublicTimetableViewer } from "@/components/timetables/PublicTimetableViewer";
import { Clock, ShieldCheck, LogIn } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PublicTimetablesPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; programme?: string; level?: string }>;
}) {
  const { period, programme, level } = await searchParams;

  const [timetables, programmes, periods] = await Promise.all([
    prisma.timetable.findMany({
      where: {
        status: "PUBLISHED",
        currentPublishedVersionId: { not: null },
      },
      include: {
        programme: true,
        programmeLevel: true,
        academicPeriod: true,
        versions: {
          where: { status: "PUBLISHED" },
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            entries: {
              include: {
                course: true,
                facilitator: true,
              },
              orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
            },
          },
        },
      },
    }),
    prisma.programme.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, code: true, name: true },
    }),
    prisma.academicPeriod.findMany({
      orderBy: [{ isCurrent: "desc" }, { createdAt: "desc" }],
      select: { id: true, academicYear: true, semester: true, isCurrent: true },
    }),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Public Institutional Header (Hidden during print) */}
      <header className="bg-slate-900 text-white border-b border-slate-800 shadow-md no-print">
        <div className="max-w-7xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-tight">
                Academic Timetable Portal
              </h1>
              <p className="text-xs text-slate-400">
                Official University Timetable & Lecture Schedule
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-1.5 text-xs text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-3 py-1.5 rounded-full">
              <ShieldCheck className="w-4 h-4" />
              <span>Verified Published Records</span>
            </div>
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Admin Login</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <PublicTimetableViewer
          timetables={timetables as any}
          programmes={programmes}
          periods={periods}
          initialPeriodId={period}
          initialProgrammeId={programme}
        />
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500 no-print">
        <p>
          College Academic Timetable System &copy; {new Date().getFullYear()}. All
          rights reserved.
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          Published schedules are verified by the Academic Board. Unofficial alterations are prohibited.
        </p>
      </footer>
    </div>
  );
}
