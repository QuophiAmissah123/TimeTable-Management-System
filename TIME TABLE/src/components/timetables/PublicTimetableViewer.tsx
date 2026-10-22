"use client";

import { useState } from "react";
import {
  CalendarDays,
  List,
  Printer,
  Share2,
  Clock,
  Check,
  CheckCircle2,
  GraduationCap,
  Sparkles,
  Calendar,
} from "lucide-react";

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

interface Entry {
  id: string;
  courseId: string;
  facilitatorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
  course: { code: string; name: string; creditHours: number };
  facilitator: { name: string; department?: string | null };
}

interface Timetable {
  id: string;
  programmeId: string;
  programmeLevelId: string;
  academicPeriodId: string;
  programme: { code: string; name: string };
  programmeLevel: { levelCode: string; levelName: string };
  academicPeriod: { academicYear: string; semester: string };
  versions: Array<{
    id: string;
    versionNumber: number;
    status: string;
    publishedAt?: Date | string | null;
    entries: Entry[];
  }>;
}

export function PublicTimetableViewer({
  timetables,
  programmes,
  periods,
  initialPeriodId,
  initialProgrammeId,
}: {
  timetables: Timetable[];
  programmes: Array<{ id: string; code: string; name: string }>;
  periods: Array<{ id: string; academicYear: string; semester: string; isCurrent: boolean }>;
  initialPeriodId?: string;
  initialProgrammeId?: string;
}) {
  const [selectedPeriodId, setSelectedPeriodId] = useState(
    initialPeriodId || periods.find((p) => p.isCurrent)?.id || periods[0]?.id || ""
  );
  const [selectedProgrammeId, setSelectedProgrammeId] = useState(
    initialProgrammeId || programmes[0]?.id || ""
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [copied, setCopied] = useState(false);

  // Filter timetables matching the selected period & programme
  const matchingTimetables = timetables.filter(
    (t) =>
      t.academicPeriodId === selectedPeriodId &&
      t.programmeId === selectedProgrammeId
  );

  const [selectedTimetableId, setSelectedTimetableId] = useState<string>(
    matchingTimetables[0]?.id || ""
  );

  const activeTimetable =
    matchingTimetables.find((t) => t.id === selectedTimetableId) ||
    matchingTimetables[0];

  const publishedVersion = activeTimetable?.versions[0];
  const entries = publishedVersion?.entries || [];

  function handleShare() {
    if (!activeTimetable) return;
    const url = `${window.location.origin}/timetables?programme=${activeTimetable.programmeId}&level=${activeTimetable.programmeLevelId}&period=${activeTimetable.academicPeriodId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Official Printable Header (Visible ONLY on print) */}
      <div className="hidden print:block p-6 border-b-2 border-slate-900 text-center mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider text-slate-900">
          Official Academic Timetable
        </h1>
        {activeTimetable && (
          <>
            <p className="text-base font-bold mt-1">
              {activeTimetable.programme.name} ({activeTimetable.programme.code}) —{" "}
              {activeTimetable.programmeLevel.levelName}
            </p>
            <p className="text-xs text-slate-600 mt-1">
              Academic Session: {activeTimetable.academicPeriod.academicYear} |{" "}
              {activeTimetable.academicPeriod.semester} | Version:{" "}
              v{publishedVersion?.versionNumber} (Official Board Publication)
            </p>
          </>
        )}
      </div>

      {/* Control & Selector Toolbar (Hidden during print) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              1. Academic Session
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 bg-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.academicYear} {p.semester} {p.isCurrent ? "★ (Active)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              2. Academic Programme
            </label>
            <select
              value={selectedProgrammeId}
              onChange={(e) => {
                setSelectedProgrammeId(e.target.value);
                const nextMatches = timetables.filter(
                  (t) =>
                    t.academicPeriodId === selectedPeriodId &&
                    t.programmeId === e.target.value
                );
                setSelectedTimetableId(nextMatches[0]?.id || "");
              }}
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 bg-white font-medium focus:ring-2 focus:ring-blue-500"
            >
              {programmes.map((prg) => (
                <option key={prg.id} value={prg.id}>
                  {prg.code} — {prg.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              3. Student Cohort Level
            </label>
            <select
              value={activeTimetable?.id || ""}
              onChange={(e) => setSelectedTimetableId(e.target.value)}
              disabled={matchingTimetables.length === 0}
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 bg-white font-medium focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
            >
              {matchingTimetables.length === 0 ? (
                <option value="">No published timetables</option>
              ) : (
                matchingTimetables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.programmeLevel.levelName} ({t.programmeLevel.levelCode})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* View Toggles & Actions */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly Schedule</span>
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Daily List</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTimetable && (
              <a
                href={`/api/calendar/export?timetableId=${activeTimetable.id}`}
                download={`${activeTimetable.programme.code.toLowerCase()}-${activeTimetable.programmeLevel.levelCode.toLowerCase()}-calendar.ics`}
                className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold shadow-2xs transition-colors"
                title="Sync this semester schedule with Google Calendar, Apple Calendar, or Outlook"
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span>Add to Calendar (.ics)</span>
              </a>
            )}

            <button
              onClick={handleShare}
              disabled={!activeTimetable}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>Share Schedule Link</span>
                </>
              )}
            </button>

            <button
              onClick={handlePrint}
              disabled={!activeTimetable}
              className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Schedule Content */}
      {!activeTimetable ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-16 text-center shadow-xs">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">
            No Published Timetable Found
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            There is currently no published timetable for this programme and academic session. Check back later or select another programme.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Active Schedule Metadata Banner (Hidden during print) */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                  {activeTimetable.programme.code}
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs font-semibold text-slate-600">
                  {activeTimetable.programmeLevel.levelName}
                </span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 mt-0.5">
                {activeTimetable.programme.name}
              </h2>
            </div>
            <div className="flex items-center space-x-3">
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                Official Published Schedule (v{publishedVersion?.versionNumber})
              </span>
            </div>
          </div>

          {/* Grid View */}
          {viewMode === "grid" ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full border-collapse min-w-[750px] print:min-w-full print-table">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                      <th className="py-3 px-4 text-left w-36 border-r border-slate-800">
                        Day of Week
                      </th>
                      <th className="py-3 px-4 text-left">
                        Academic Class Sessions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 text-sm">
                    {DAYS_OF_WEEK.map((day) => {
                      const dayEntries = entries.filter((e) => e.dayOfWeek === day);

                      return (
                        <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-4 px-4 font-bold text-slate-800 bg-slate-50/80 border-r border-slate-200 align-top">
                            <span className="block text-sm">{day}</span>
                            <span className="text-[11px] font-normal text-slate-400 mt-0.5 block">
                              {dayEntries.length}{" "}
                              {dayEntries.length === 1 ? "class" : "classes"}
                            </span>
                          </td>

                          <td className="py-4 px-4 align-top">
                            {dayEntries.length === 0 ? (
                              <div className="text-xs text-slate-400 italic py-2">
                                No scheduled classes
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                {dayEntries.map((entry) => (
                                  <div
                                    key={entry.id}
                                    className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 shadow-xs flex flex-col justify-between"
                                  >
                                    <div>
                                      <div className="flex items-center justify-between mb-1.5">
                                        <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                          {entry.course.code}
                                        </span>
                                        <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                          ⏰ {entry.startTime} – {entry.endTime}
                                        </span>
                                      </div>
                                      <h4 className="font-bold text-xs text-slate-900 leading-tight">
                                        {entry.course.name}
                                      </h4>
                                      <p className="text-[11px] text-slate-600 mt-1 flex items-center space-x-1">
                                        <span>👨‍🏫</span>
                                        <span className="font-medium truncate">
                                          {entry.facilitator.name}
                                        </span>
                                      </p>
                                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-1">
                                        <span>📍</span>
                                        <span className="truncate">{entry.venue}</span>
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* Day List View */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse print-table">
                  <thead>
                    <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                      <th className="py-3 px-4">Day</th>
                      <th className="py-3 px-4">Time Interval</th>
                      <th className="py-3 px-4">Course</th>
                      <th className="py-3 px-4">Lecturer / Facilitator</th>
                      <th className="py-3 px-4">Venue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {entries.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="p-8 text-center text-xs text-slate-400 italic"
                        >
                          No class sessions in this schedule.
                        </td>
                      </tr>
                    ) : (
                      entries.map((entry) => (
                        <tr
                          key={entry.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-3 px-4 font-bold text-slate-800">
                            {entry.dayOfWeek}
                          </td>
                          <td className="py-3 px-4 font-mono text-xs font-semibold text-slate-700">
                            {entry.startTime} – {entry.endTime}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md mr-1.5">
                              {entry.course.code}
                            </span>
                            <span className="font-medium text-slate-900 text-xs">
                              {entry.course.name}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-xs font-medium text-slate-700">
                            {entry.facilitator.name}
                          </td>
                          <td className="py-3 px-4 text-xs text-slate-600">
                            📍 {entry.venue}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
