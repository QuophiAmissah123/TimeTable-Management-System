import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import {
  CalendarDays,
  Plus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Filter,
  ExternalLink,
  CalendarClock,
  Calendar,
  Download,
} from "lucide-react";

import { TimetablePageHeader } from "@/components/timetables/TimetablePageHeader";

export const dynamic = "force-dynamic";

export default async function TimetablesListPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; programme?: string; status?: string }>;
}) {
  const { period, programme, status } = await searchParams;

  const [periods, programmes, timetables] = await Promise.all([
    prisma.academicPeriod.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.programme.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.timetable.findMany({
      where: {
        ...(period && period !== "all" ? { academicPeriodId: period } : {}),
        ...(programme && programme !== "all" ? { programmeId: programme } : {}),
        ...(status && status !== "all" ? { status } : {}),
      },
      orderBy: [{ updatedAt: "desc" }],
      include: {
        programme: true,
        programmeLevel: true,
        academicPeriod: true,
        versions: {
          orderBy: { versionNumber: "desc" },
          take: 1,
          include: {
            _count: { select: { entries: true } },
          },
        },
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      {/* Header with Direct Word/Excel Intake */}
      <TimetablePageHeader periods={periods} />

      {/* Filter Bar */}
      <div className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Academic Period
            </label>
            <select
              name="period"
              defaultValue={period || "all"}
              className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Academic Periods</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.academicYear} {p.semester} {p.isCurrent ? "★ Active" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Programme
            </label>
            <select
              name="programme"
              defaultValue={programme || "all"}
              className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Programmes</option>
              {programmes.map((prg) => (
                <option key={prg.id} value={prg.id}>
                  {prg.code} — {prg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Publication Status
            </label>
            <select
              name="status"
              defaultValue={status || "all"}
              className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="PUBLISHED">Published Only</option>
              <option value="DRAFT">Drafts Only</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              className="w-full py-2 px-4 rounded-lg bg-slate-800 text-white text-sm font-semibold hover:bg-slate-900 transition-colors flex items-center justify-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>Apply Filters</span>
            </button>
          </div>
        </form>
      </div>

      {/* Timetables Grid */}
      {timetables.length === 0 ? (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center shadow-xs">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">No Timetables Found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            No timetables match your filter criteria. Try resetting the filters or create a new schedule.
          </p>
          <Link
            href="/admin/timetables/new"
            className="mt-4 inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Timetable</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {timetables.map((t) => {
            const latestVersion = t.versions[0];
            const isPublished = t.status === "PUBLISHED";
            return (
              <div
                key={t.id}
                className="bg-white rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-1.5 flex-wrap gap-y-1">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          isPublished
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-amber-50 text-amber-700 border border-amber-200"
                        }`}
                      >
                        {isPublished ? (
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                        ) : (
                          <Clock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        )}
                        {isPublished ? "PUBLISHED" : "DRAFT"}
                      </span>
                      {latestVersion?.scheduledPublishAt && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                          <CalendarClock className="w-3 h-3 mr-1 text-amber-700" />
                          Auto-pub
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      Version {latestVersion?.versionNumber || 1}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-1">
                    {t.programme.name}
                  </h3>
                  <p className="text-xs font-semibold text-blue-600 mt-0.5">
                    {t.programme.code} — {t.programmeLevel.levelName}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                    <span>
                      📅 {t.academicPeriod.academicYear} {t.academicPeriod.semester}
                    </span>
                    <span className="font-semibold text-slate-700">
                      {latestVersion?._count?.entries || 0} Sessions
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <Link
                    href={`/admin/timetables/${t.id}`}
                    className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs"
                  >
                    <span>Studio & Import</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>

                  <div className="flex items-center space-x-2">
                    {isPublished && (
                      <a
                        href={`/api/calendar/export?timetableId=${t.id}`}
                        download={`${t.programme.code.toLowerCase()}-${t.programmeLevel.levelCode.toLowerCase()}-schedule.ics`}
                        className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
                        title="Download .ics Calendar"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-600" />
                        <span>.ics</span>
                      </a>
                    )}

                    {isPublished && (
                      <Link
                        href={`/timetables?programme=${t.programmeId}&level=${t.programmeLevelId}&period=${t.academicPeriodId}`}
                        target="_blank"
                        className="text-xs text-emerald-600 hover:text-emerald-700 font-medium flex items-center space-x-1"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Public</span>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
