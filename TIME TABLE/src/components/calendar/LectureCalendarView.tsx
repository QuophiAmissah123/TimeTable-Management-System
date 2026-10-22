"use client";

import { useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Calendar as CalendarIcon,
  Clock,
  MapPin,
  Users,
  Download,
  Share2,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle2,
  PlayCircle,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";
import { generateGoogleCalendarUrl, TimetableEntryCalendarItem } from "@/lib/calendar/ical-generator";

const DAYS_OF_WEEK = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
const HOURS = ["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];

interface CalendarEntryItem {
  id: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
  course: { id: string; code: string; name: string };
  facilitator: { id: string; name: string; department?: string | null };
  timetableVersion: {
    timetable: {
      id: string;
      programme: { id: string; code: string; name: string };
      programmeLevel: { id: string; levelCode: string; levelName: string };
      academicPeriod: { id: string; academicYear: string; semester: string };
    };
  };
  activeSession?: any | null;
  completedToday?: boolean;
}

interface LectureCalendarViewProps {
  entries: CalendarEntryItem[];
  programmes: Array<{ id: string; code: string; name: string }>;
  facilitators: Array<{ id: string; name: string }>;
  academicPeriodName: string;
}

export function LectureCalendarView({
  entries,
  programmes,
  facilitators,
  academicPeriodName,
}: LectureCalendarViewProps) {
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string>("all");
  const [selectedFacilitatorId, setSelectedFacilitatorId] = useState<string>("all");
  const [selectedDay, setSelectedDay] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"grid" | "agenda">("grid");
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Filter entries
  const filteredEntries = entries.filter((e) => {
    if (selectedProgrammeId !== "all" && e.timetableVersion.timetable.programme.id !== selectedProgrammeId) {
      return false;
    }
    if (selectedFacilitatorId !== "all" && e.facilitator.id !== selectedFacilitatorId) {
      return false;
    }
    if (selectedDay !== "all" && e.dayOfWeek !== selectedDay) {
      return false;
    }
    return true;
  });

  const getCalendarExportUrl = () => {
    const params = new URLSearchParams();
    if (selectedProgrammeId !== "all") params.set("programmeId", selectedProgrammeId);
    if (selectedFacilitatorId !== "all") params.set("facilitatorId", selectedFacilitatorId);
    return `/api/calendar/export?${params.toString()}`;
  };

  const handleCopySubscriptionUrl = () => {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${getCalendarExportUrl()}`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  // Group by day for agenda view
  const entriesByDay: Record<string, CalendarEntryItem[]> = {};
  for (const day of DAYS_OF_WEEK) {
    entriesByDay[day] = filteredEntries
      .filter((e) => e.dayOfWeek === day)
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Calendar Sync Actions */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Institutional Calendar & Attendance Feed</span>
          </div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Lecture Schedule & Calendar Sync
          </h2>
          <p className="text-xs text-slate-300 max-w-xl">
            Real-time lecture calendar for <strong>{academicPeriodName}</strong>. Sync scheduled sessions directly with Google Calendar, Apple Calendar, and Microsoft Outlook.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleCopySubscriptionUrl}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors"
            title="Copy URL for Google Calendar or Apple Calendar subscription"
          >
            {copiedUrl ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">URL Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Calendar Feed</span>
              </>
            )}
          </button>

          <a
            href={getCalendarExportUrl()}
            download="lectures-calendar.ics"
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-md shadow-blue-600/30 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download .ics Calendar</span>
          </a>
        </div>
      </div>

      {/* Filter Toolbar & View Toggle */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 min-w-[180px]">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedProgrammeId}
              onChange={(e) => setSelectedProgrammeId(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="all">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[180px]">
            <select
              value={selectedFacilitatorId}
              onChange={(e) => setSelectedFacilitatorId(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="all">All Lecturers / Facilitators</option>
              {facilitators.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div className="min-w-[140px]">
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(e.target.value)}
              className="text-xs font-medium rounded-lg border border-slate-300 bg-white text-slate-800 py-1.5 px-2.5 focus:ring-2 focus:ring-blue-500 w-full"
            >
              <option value="all">All Days (Mon–Sat)</option>
              {DAYS_OF_WEEK.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {(selectedProgrammeId !== "all" || selectedFacilitatorId !== "all" || selectedDay !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedProgrammeId("all");
                setSelectedFacilitatorId("all");
                setSelectedDay("all");
              }}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline px-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        {/* View Toggles & Result Count */}
        <div className="flex items-center space-x-3 justify-between sm:justify-end">
          <span className="text-xs text-slate-500 font-medium">
            {filteredEntries.length} {filteredEntries.length === 1 ? "lecture" : "lectures"} found
          </span>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("agenda")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === "agenda"
                  ? "bg-white text-slate-900 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Day-by-Day Agenda</span>
            </button>
          </div>
        </div>
      </div>

      {/* Grid View Mode */}
      {viewMode === "grid" && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-28 border-r border-slate-200">
                    Day
                  </th>
                  <th className="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">
                    Scheduled Lectures & Venues
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {DAYS_OF_WEEK.map((day) => {
                  const dayEntries = entriesByDay[day] || [];
                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-center align-top border-r border-slate-200 bg-slate-50/30">
                        <span className="font-extrabold text-xs text-slate-900 uppercase tracking-wider block">
                          {day}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium block mt-0.5">
                          {dayEntries.length} {dayEntries.length === 1 ? "session" : "sessions"}
                        </span>
                      </td>

                      <td className="py-4 px-6 align-top">
                        {dayEntries.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2">
                            No lectures scheduled for {day.toLowerCase()}
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dayEntries.map((e) => {
                              const googleUrl = generateGoogleCalendarUrl(e as TimetableEntryCalendarItem);
                              const isLive = Boolean(e.activeSession);

                              return (
                                <div
                                  key={e.id}
                                  className={`p-3.5 rounded-xl border text-xs flex flex-col justify-between transition-all group ${
                                    isLive
                                      ? "bg-blue-50/50 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
                                      : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-2xs"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                                        {e.course.code}
                                      </span>
                                      {isLive ? (
                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 animate-pulse">
                                          <PlayCircle className="w-3 h-3" />
                                          <span>LIVE NOW</span>
                                        </span>
                                      ) : e.completedToday ? (
                                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                                          <CheckCircle2 className="w-3 h-3" />
                                          <span>COMPLETED</span>
                                        </span>
                                      ) : (
                                        <span className="text-[11px] font-mono text-slate-500 font-semibold">
                                          {e.startTime} – {e.endTime}
                                        </span>
                                      )}
                                    </div>

                                    <h4 className="font-bold text-slate-900 leading-snug line-clamp-1">
                                      {e.course.name}
                                    </h4>

                                    <div className="mt-2 space-y-1 text-slate-600 text-[11px]">
                                      <div className="flex items-center space-x-1.5">
                                        <Users className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{e.facilitator.name}</span>
                                      </div>
                                      <div className="flex items-center space-x-1.5">
                                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                                        <span className="truncate">{e.venue}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                    <span className="text-[10px] text-slate-400 font-medium">
                                      {e.timetableVersion.timetable.programme.code}
                                    </span>
                                    <a
                                      href={googleUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center space-x-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                      title="Add this recurring lecture to Google Calendar"
                                    >
                                      <span>+ Google Cal</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  </div>
                                </div>
                              );
                            })}
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
      )}

      {/* Agenda View Mode */}
      {viewMode === "agenda" && (
        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const dayEntries = entriesByDay[day] || [];
            if (dayEntries.length === 0) return null;

            return (
              <div key={day} className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="px-6 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CalendarIcon className="w-4 h-4 text-blue-600" />
                    <h3 className="font-extrabold text-sm text-slate-900 uppercase tracking-wide">
                      {day}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 font-semibold">
                    {dayEntries.length} {dayEntries.length === 1 ? "lecture" : "lectures"}
                  </span>
                </div>

                <div className="divide-y divide-slate-100">
                  {dayEntries.map((e) => {
                    const googleUrl = generateGoogleCalendarUrl(e as TimetableEntryCalendarItem);
                    const isLive = Boolean(e.activeSession);

                    return (
                      <div
                        key={e.id}
                        className={`p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors ${
                          isLive ? "bg-blue-50/30" : "hover:bg-slate-50/60"
                        }`}
                      >
                        <div className="flex items-start space-x-4 min-w-0">
                          <div className="text-center shrink-0 w-24 p-2 rounded-xl bg-slate-100 border border-slate-200">
                            <span className="text-xs font-black text-slate-900 block font-mono">
                              {e.startTime}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium block">
                              to {e.endTime}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-slate-900 text-white">
                                {e.course.code}
                              </span>
                              <h4 className="font-bold text-sm text-slate-900">
                                {e.course.name}
                              </h4>
                              {isLive && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700 animate-pulse">
                                  LIVE NOW
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 mt-1">
                              <span className="flex items-center space-x-1">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>{e.facilitator.name}</span>
                              </span>
                              <span className="flex items-center space-x-1">
                                <MapPin className="w-3.5 h-3.5 text-slate-400" />
                                <span>{e.venue}</span>
                              </span>
                              <span className="text-slate-400 font-medium">
                                {e.timetableVersion.timetable.programme.name} (Level{" "}
                                {e.timetableVersion.timetable.programmeLevel.levelCode})
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                          <Link
                            href="/admin/attendance"
                            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-colors"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
                            <span>Track</span>
                          </Link>

                          <a
                            href={googleUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                          >
                            <span>+ Google Cal</span>
                            <ExternalLink className="w-3 h-3 text-slate-400" />
                          </a>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
