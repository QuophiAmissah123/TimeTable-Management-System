import { prisma } from "@/lib/db/prisma";
import Link from "next/link";
import {
  GraduationCap,
  BookOpen,
  Users,
  CalendarDays,
  Plus,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  UserCheck,
  CalendarClock,
  Calendar,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const [
    programmeCount,
    courseCount,
    facilitatorCount,
    activePeriod,
    timetables,
    publishedCount,
    draftCount,
    activeSessionCount,
    completedSessionCount,
    scheduledVersions,
  ] = await Promise.all([
    prisma.programme.count({ where: { isActive: true } }),
    prisma.course.count({ where: { isActive: true } }),
    prisma.facilitator.count({ where: { isActive: true } }),
    prisma.academicPeriod.findFirst({ where: { isCurrent: true } }),
    prisma.timetable.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
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
    prisma.timetable.count({ where: { status: "PUBLISHED" } }),
    prisma.timetable.count({ where: { status: "DRAFT" } }),
    prisma.teachingSession.count({ where: { status: "IN_PROGRESS" } }),
    prisma.teachingSession.count({ where: { status: "COMPLETED" } }),
    prisma.timetableVersion.findMany({
      where: {
        scheduledPublishAt: { not: null },
        status: { notIn: ["PUBLISHED", "SUPERSEDED"] },
      },
      orderBy: { scheduledPublishAt: "asc" },
      include: {
        timetable: {
          include: {
            programme: true,
            programmeLevel: true,
            academicPeriod: true,
          },
        },
        _count: { select: { entries: true } },
      },
    }),
  ]);

  const kpis = [
    {
      title: "Active Programmes",
      value: programmeCount,
      subtitle: "Offered academic tracks",
      icon: GraduationCap,
      color: "text-blue-600 bg-blue-50 border-blue-200",
    },
    {
      title: "Registered Courses",
      value: courseCount,
      subtitle: "Active syllabus units",
      icon: BookOpen,
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      title: "Academic Facilitators",
      value: facilitatorCount,
      subtitle: "Lecturers & instructors",
      icon: Users,
      color: "text-indigo-600 bg-indigo-50 border-indigo-200",
    },
    {
      title: "Timetable Schedules",
      value: `${publishedCount} / ${publishedCount + draftCount}`,
      subtitle: `${publishedCount} Published, ${draftCount} Drafts`,
      icon: CalendarDays,
      color: "text-purple-600 bg-purple-50 border-purple-200",
    },
    {
      title: "Teaching Sessions",
      value: `${activeSessionCount} Live / ${completedSessionCount}`,
      subtitle: `${activeSessionCount} In-Progress, ${completedSessionCount} Completed`,
      icon: UserCheck,
      color: "text-teal-600 bg-teal-50 border-teal-200",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Institutional Dashboard
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Real-time overview of academic schedules, curriculum units, and resource allocation.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/admin/calendar"
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-2xs transition-all"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Lecture Calendar</span>
          </Link>
          <Link
            href="/admin/attendance"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 shadow-sm transition-all"
          >
            <UserCheck className="w-4 h-4" />
            <span>Class Tracker</span>
            {activeSessionCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-800 text-white">
                {activeSessionCount} live
              </span>
            )}
          </Link>
          <Link
            href="/admin/timetables/new"
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Intake Timetable</span>
          </Link>
        </div>
      </div>

      {/* Active Academic Period Announcement Banner */}
      <div className="p-5 rounded-xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center shrink-0 border border-white/20">
            <Sparkles className="w-6 h-6 text-yellow-300" />
          </div>
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-200">
              Current Academic Session
            </span>
            <h3 className="text-lg font-bold text-white leading-tight">
              {activePeriod
                ? `${activePeriod.academicYear} — ${activePeriod.semester}`
                : "No Active Session Configured"}
            </h3>
            <p className="text-xs text-blue-200 mt-0.5">
              All conflict detection algorithms and timetable publishing resolve against this period.
            </p>
          </div>
        </div>
        <Link
          href="/admin/academic-periods"
          className="inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium border border-white/20 transition-all self-start sm:self-auto"
        >
          <span>Manage Periods</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {kpis.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <div
              key={idx}
              className="p-5 rounded-xl bg-white border border-slate-200 shadow-xs flex items-center space-x-4 hover:border-slate-300 transition-all"
            >
              <div
                className={`w-12 h-12 rounded-xl border flex items-center justify-center shrink-0 ${kpi.color}`}
              >
                <Icon className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500 truncate">{kpi.title}</p>
                <p className="text-xl font-bold text-slate-900 tracking-tight mt-0.5">
                  {kpi.value}
                </p>
                <p className="text-xs text-slate-400 truncate mt-0.5">{kpi.subtitle}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Scheduled Timetable Auto-Activations Alert */}
      {scheduledVersions.length > 0 && (
        <div className="rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-300/80 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                <CalendarClock className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  Scheduled Timetable Auto-Activations
                </h4>
                <p className="text-xs text-slate-500">
                  {scheduledVersions.length} {scheduledVersions.length === 1 ? "version is" : "versions are"} scheduled to automatically publish
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
              Active Monitoring
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            {scheduledVersions.map((sv) => (
              <div
                key={sv.id}
                className="bg-white rounded-xl p-4 border border-amber-200 shadow-2xs flex items-center justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-xs text-slate-900 truncate">
                      {sv.timetable.programme.name}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-sm text-[10px] font-bold bg-slate-100 text-slate-700">
                      v{sv.versionNumber}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {sv.timetable.programmeLevel.levelName} • {sv._count.entries} sessions
                  </div>
                  <div className="flex items-center space-x-1.5 text-xs text-amber-800 font-semibold mt-2">
                    <Clock className="w-3.5 h-3.5 text-amber-600" />
                    <span>
                      {sv.scheduledPublishAt
                        ? new Date(sv.scheduledPublishAt).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Pending"}
                    </span>
                  </div>
                </div>

                <Link
                  href={`/admin/timetables/${sv.timetableId}`}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 text-xs font-semibold transition-colors shrink-0 ml-3"
                >
                  <span>Manage</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Updated Timetables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base text-slate-900">
              Recently Updated Timetables
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Drafts and published timetable versions across departments.
            </p>
          </div>
          <Link
            href="/admin/timetables"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center space-x-1"
          >
            <span>View All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {timetables.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center mb-3">
              <CalendarDays className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-slate-700">No Timetables Found</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by creating your first academic timetable for a programme and level.
            </p>
            <Link
              href="/admin/timetables/new"
              className="mt-4 inline-flex items-center space-x-2 px-3.5 py-2 rounded-lg bg-blue-600 text-white text-xs font-medium hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Create Timetable</span>
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-6">Programme & Level</th>
                  <th className="py-3 px-6">Academic Period</th>
                  <th className="py-3 px-6">Status & Version</th>
                  <th className="py-3 px-6">Sessions</th>
                  <th className="py-3 px-6">Last Updated</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {timetables.map((t) => {
                  const latestVersion = t.versions[0];
                  const isPublished = t.status === "PUBLISHED";
                  return (
                    <tr key={t.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-4 px-6 font-medium text-slate-900">
                        <div className="font-semibold text-slate-900">{t.programme.name}</div>
                        <div className="text-xs text-slate-500 font-normal">
                          {t.programme.code} — {t.programmeLevel.levelName}
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className="font-medium">{t.academicPeriod.academicYear}</span>
                        <div className="text-xs text-slate-400">{t.academicPeriod.semester}</div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center space-x-2">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              isPublished
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {isPublished ? (
                              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
                            ) : (
                              <Clock className="w-3 h-3 mr-1 text-amber-600" />
                            )}
                            {isPublished ? "PUBLISHED" : "DRAFT"}
                          </span>
                          <span className="text-xs text-slate-400">
                            v{latestVersion?.versionNumber || 1}
                          </span>
                        </div>
                        {latestVersion?.scheduledPublishAt && (
                          <div className="flex items-center space-x-1 text-[11px] text-amber-700 font-medium mt-1">
                            <CalendarClock className="w-3 h-3 text-amber-600 shrink-0" />
                            <span>
                              Auto-pub: {new Date(latestVersion.scheduledPublishAt).toLocaleDateString(undefined, {
                                month: "short",
                                day: "numeric",
                              })}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6 font-semibold text-slate-700">
                        {latestVersion?._count?.entries || 0} classes
                      </td>
                      <td className="py-4 px-6 text-xs text-slate-500">
                        {new Date(t.updatedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Link
                            href={`/admin/timetables/${t.id}`}
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                          >
                            <span>Studio</span>
                            <ArrowRight className="w-3 h-3" />
                          </Link>
                          {isPublished && (
                            <Link
                              href={`/timetables?programme=${t.programmeId}&level=${t.programmeLevelId}&period=${t.academicPeriodId}`}
                              target="_blank"
                              className="p-1.5 rounded-md text-emerald-600 hover:bg-emerald-50 transition-colors"
                              title="View Public Schedule"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Administrative Task Shortcuts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Link
          href="/admin/courses"
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <BookOpen className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-600 transition-colors" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 mt-4">Curriculum Courses</h4>
          <p className="text-xs text-slate-500 mt-1">
            Configure course codes, credit hours, and syllabus descriptions.
          </p>
        </Link>

        <Link
          href="/admin/facilitators"
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-indigo-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Users className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 transition-colors" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 mt-4">Faculty Facilitators</h4>
          <p className="text-xs text-slate-500 mt-1">
            Manage lecturer assignments, department affiliations, and contact info.
          </p>
        </Link>

        <Link
          href="/admin/programmes"
          className="p-5 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <GraduationCap className="w-5 h-5" />
            </div>
            <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 transition-colors" />
          </div>
          <h4 className="font-bold text-sm text-slate-900 mt-4">Programmes & Levels</h4>
          <p className="text-xs text-slate-500 mt-1">
            Define academic tracks, degrees, and student cohort year levels.
          </p>
        </Link>
      </div>
    </div>
  );
}
