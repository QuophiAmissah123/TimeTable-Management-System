"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CalendarDays,
  List,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Sparkles,
  Edit2,
  Trash2,
  X,
  Share2,
  ExternalLink,
  ChevronDown,
  CalendarClock,
  FileSpreadsheet,
  Calendar,
  Download,
  UserCheck,
} from "lucide-react";
import { ScheduleActivationModal } from "./ScheduleActivationModal";
import { CsvImportModal } from "./CsvImportModal";
import {
  saveTimetableEntryAction,
  deleteTimetableEntryAction,
  validateTimetableVersionAction,
  publishTimetableVersionAction,
  createDraftRevisionAction,
} from "@/app/actions/timetables";

const DAYS_OF_WEEK = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
];

const TIME_SLOTS = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
];

interface Entry {
  id: string;
  courseId: string;
  facilitatorId: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  venue: string;
  course: { id: string; code: string; name: string; creditHours: number };
  facilitator: { id: string; name: string; department?: string | null };
}

interface Version {
  id: string;
  versionNumber: number;
  status: string;
  notes?: string | null;
  publishedAt?: Date | string | null;
  scheduledPublishAt?: Date | string | null;
  scheduledById?: string | null;
  entries: Entry[];
}

interface TimetableStudioProps {
  timetable: {
    id: string;
    status: string;
    programmeId: string;
    programmeLevelId: string;
    academicPeriodId: string;
    programme: { code: string; name: string };
    programmeLevel: { levelCode: string; levelName: string };
    academicPeriod: { academicYear: string; semester: string };
    versions: Version[];
  };
  courses: Array<{ id: string; code: string; name: string }>;
  facilitators: Array<{ id: string; name: string; department?: string | null }>;
}

export function TimetableStudio({
  timetable,
  courses,
  facilitators,
}: TimetableStudioProps) {
  const router = useRouter();
  const [selectedVersionId, setSelectedVersionId] = useState(
    timetable.versions[0]?.id || ""
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false);
  const [publishNotes, setPublishNotes] = useState("");
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
  const [isCsvModalOpen, setIsCsvModalOpen] = useState(false);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [conflictErrors, setConflictErrors] = useState<any[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [formCourseId, setFormCourseId] = useState("");
  const [formFacilitatorId, setFormFacilitatorId] = useState("");
  const [formDay, setFormDay] = useState("MONDAY");
  const [formStartTime, setFormStartTime] = useState("08:30");
  const [formEndTime, setFormEndTime] = useState("10:30");
  const [formVenue, setFormVenue] = useState("");

  const currentVersion =
    timetable.versions.find((v) => v.id === selectedVersionId) ||
    timetable.versions[0];

  const isImmutable =
    currentVersion?.status === "PUBLISHED" ||
    currentVersion?.status === "SUPERSEDED";

  function openCreateModal(defaultDay = "MONDAY", defaultStart = "08:30") {
    setEditingEntry(null);
    setFormCourseId(courses[0]?.id || "");
    setFormFacilitatorId(facilitators[0]?.id || "");
    setFormDay(defaultDay);
    setFormStartTime(defaultStart);
    setFormEndTime("10:30");
    setFormVenue("");
    setConflictErrors([]);
    setIsModalOpen(true);
  }

  function openEditModal(entry: Entry) {
    setEditingEntry(entry);
    setFormCourseId(entry.courseId);
    setFormFacilitatorId(entry.facilitatorId);
    setFormDay(entry.dayOfWeek);
    setFormStartTime(entry.startTime);
    setFormEndTime(entry.endTime);
    setFormVenue(entry.venue);
    setConflictErrors([]);
    setIsModalOpen(true);
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setConflictErrors([]);
    setSuccessMessage(null);

    const payload = {
      id: editingEntry?.id,
      timetableVersionId: currentVersion.id,
      courseId: formCourseId,
      facilitatorId: formFacilitatorId,
      dayOfWeek: formDay,
      startTime: formStartTime,
      endTime: formEndTime,
      venue: formVenue,
    };

    const res = await saveTimetableEntryAction(payload);
    setLoading(false);

    if (!res.success) {
      if (res.conflicts) {
        setConflictErrors(res.conflicts);
      } else {
        alert(res.error || "Failed to save session");
      }
      return;
    }

    setIsModalOpen(false);
    setSuccessMessage("Session saved successfully.");
    router.refresh();
  }

  async function handleDeleteEntry(entryId: string) {
    if (!confirm("Are you sure you want to delete this session?")) return;
    setLoading(true);
    const res = await deleteTimetableEntryAction(entryId);
    setLoading(false);

    if (!res.success) {
      alert(res.error || "Failed to delete session");
      return;
    }
    router.refresh();
  }

  async function handleValidateVersion() {
    setLoading(true);
    setConflictErrors([]);
    setSuccessMessage(null);

    const res = await validateTimetableVersionAction(currentVersion.id);
    setLoading(false);

    if (!res.success) {
      if (res.conflicts) {
        setConflictErrors(res.conflicts);
      } else {
        alert(res.error || "Validation failed");
      }
      return;
    }

    setSuccessMessage("Schedule validated! Zero conflicts detected.");
    router.refresh();
  }

  async function handlePublishVersion() {
    setLoading(true);
    setConflictErrors([]);

    const res = await publishTimetableVersionAction(
      currentVersion.id,
      publishNotes
    );
    setLoading(false);

    if (!res.success) {
      if (res.conflicts) {
        setConflictErrors(res.conflicts);
      } else {
        alert(res.error || "Publication failed");
      }
      return;
    }

    setIsPublishModalOpen(false);
    setSuccessMessage("Timetable officially published!");
    router.refresh();
  }

  async function handleBranchDraft() {
    if (
      !confirm(
        "Branching will create a new editable DRAFT revision copied from the current version. Continue?"
      )
    )
      return;

    setLoading(true);
    const res = await createDraftRevisionAction(timetable.id);
    setLoading(false);

    if (!res.success) {
      alert(res.error || "Failed to create draft revision");
      return;
    }

    if (res.data) {
      setSelectedVersionId(res.data.id);
    }
    router.refresh();
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="space-y-6">
      {/* Official Printable Header (Visible ONLY on print) */}
      <div className="hidden print:block p-4 border-b-2 border-slate-900 text-center mb-6">
        <h1 className="text-2xl font-bold uppercase tracking-wider">
          College Academic Timetable
        </h1>
        <p className="text-sm font-semibold mt-1">
          {timetable.programme.name} ({timetable.programme.code}) —{" "}
          {timetable.programmeLevel.levelName}
        </p>
        <p className="text-xs text-slate-600 mt-0.5">
          Academic Session: {timetable.academicPeriod.academicYear} |{" "}
          {timetable.academicPeriod.semester} | Version:{" "}
          {currentVersion?.versionNumber} | Status: {currentVersion?.status}
        </p>
      </div>

      {/* Studio Header Toolbar (Hidden during print) */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4 no-print">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                {timetable.programme.code}
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {timetable.programmeLevel.levelName}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-0.5">
              {timetable.programme.name}
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              📅 {timetable.academicPeriod.academicYear} —{" "}
              {timetable.academicPeriod.semester}
            </p>
          </div>

          {/* Version Selector & Status Badge */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
              <label className="text-xs font-semibold text-slate-500 pl-2">
                Version:
              </label>
              <select
                value={selectedVersionId}
                onChange={(e) => setSelectedVersionId(e.target.value)}
                className="text-xs font-bold bg-transparent border-0 focus:ring-0 text-slate-800 pr-3 cursor-pointer"
              >
                {timetable.versions.map((v) => (
                  <option key={v.id} value={v.id}>
                    v{v.versionNumber} ({v.status})
                  </option>
                ))}
              </select>
            </div>

            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                currentVersion?.status === "PUBLISHED"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : currentVersion?.status === "VALIDATED"
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : currentVersion?.status === "SUPERSEDED"
                  ? "bg-slate-100 text-slate-600 border border-slate-300"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {currentVersion?.status === "PUBLISHED" && (
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
              )}
              {currentVersion?.status}
            </span>

            {currentVersion?.scheduledPublishAt && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                <CalendarClock className="w-3.5 h-3.5 mr-1 text-amber-700" />
                Scheduled
              </span>
            )}
          </div>
        </div>

        {/* Scheduled Auto-Activation Notice Banner */}
        {currentVersion?.scheduledPublishAt && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-3 text-xs text-amber-900">
            <div className="flex items-center space-x-2.5">
              <CalendarClock className="w-4 h-4 text-amber-600 shrink-0" />
              <span>
                <strong>Auto-Activation Scheduled:</strong> This version is configured to automatically publish on{" "}
                <span className="font-semibold underline">
                  {new Date(currentVersion.scheduledPublishAt).toLocaleString(undefined, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>.
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsScheduleModalOpen(true)}
              className="px-3 py-1 rounded-lg bg-white border border-amber-300 font-semibold text-amber-800 hover:bg-amber-100 shadow-2xs transition-colors"
            >
              Manage Schedule
            </button>
          </div>
        )}

        {/* Action Controls */}
        <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          {/* View Toggles */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "grid"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly Grid</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("list")}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === "list"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Day-by-Day List</span>
            </button>
          </div>

          {/* Management Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Print / A4 PDF</span>
            </button>

            {isImmutable ? (
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`/api/calendar/export?timetableId=${timetable.id}`}
                  download={`${timetable.programme.code.toLowerCase()}-${timetable.programmeLevel.levelCode.toLowerCase()}-calendar.ics`}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold shadow-2xs transition-colors"
                  title="Download .ics Calendar for Google / Apple / Outlook"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Download .ics Calendar</span>
                </a>

                <Link
                  href="/admin/calendar"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <CalendarDays className="w-3.5 h-3.5 text-blue-600" />
                  <span>Lecture Calendar</span>
                </Link>

                <Link
                  href="/admin/attendance"
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold shadow-2xs transition-colors"
                >
                  <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Track Class Attendance</span>
                </Link>

                <button
                  type="button"
                  onClick={handleBranchDraft}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
                  title="Branch a new editable draft revision for manual adjustments"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Branch Revision</span>
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsCsvModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                  title="Upload / Ingest external timetable (Word .docx or Excel .xlsx/.csv)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-white" />
                  <span>Import Timetable (Word / Excel)</span>
                </button>

                <button
                  type="button"
                  onClick={() => openCreateModal()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors"
                >
                  <Plus className="w-3.5 h-3.5 text-slate-500" />
                  <span>Manual Slot Adjustment</span>
                </button>

                <button
                  type="button"
                  onClick={handleValidateVersion}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Validate Schedule</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsScheduleModalOpen(true)}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-semibold transition-colors"
                >
                  <CalendarClock className="w-3.5 h-3.5" />
                  <span>Schedule Activation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPublishModalOpen(true)}
                  disabled={loading}
                  className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Publish Version</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-600 hover:text-emerald-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Conflict Errors Notification Banner */}
      {conflictErrors.length > 0 && (
        <div className="p-5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 shadow-xs space-y-2 no-print">
          <div className="flex items-center space-x-2 font-bold text-sm text-rose-800">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              Scheduling Conflict Detected ({conflictErrors.length}{" "}
              {conflictErrors.length === 1 ? "collision" : "collisions"}):
            </span>
          </div>
          <ul className="list-disc list-inside text-xs space-y-1 pl-2 text-rose-800">
            {conflictErrors.map((c, i) => (
              <li key={i} className="leading-relaxed">
                {c.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Immutability Banner */}
      {isImmutable && (
        <div className="p-4 rounded-xl bg-slate-100 border border-slate-300 text-slate-700 text-xs flex items-center justify-between no-print">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              <strong>Immutable Version:</strong> This timetable version is
              sealed as {currentVersion?.status}. Existing sessions cannot be
              altered. To make modifications, branch a new draft revision.
            </span>
          </div>
          <button
            type="button"
            onClick={handleBranchDraft}
            className="text-xs font-bold text-blue-600 hover:underline shrink-0 ml-4"
          >
            Branch New Draft
          </button>
        </div>
      )}

      {/* Weekly Grid View */}
      {viewMode === "grid" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full border-collapse min-w-[800px] print:min-w-full print-table">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-4 text-left w-36 border-r border-slate-800">
                    Day / Time
                  </th>
                  <th className="py-3 px-4 text-left">Scheduled Course Sessions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {DAYS_OF_WEEK.map((day) => {
                  const dayEntries = (currentVersion?.entries || []).filter(
                    (e) => e.dayOfWeek === day
                  );

                  return (
                    <tr key={day} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 font-bold text-slate-800 bg-slate-50/80 border-r border-slate-200 align-top">
                        <div className="flex items-center justify-between">
                          <span>{day}</span>
                          {!isImmutable && (
                            <button
                              type="button"
                              onClick={() => openCreateModal(day)}
                              className="text-blue-600 hover:text-blue-800 p-1 rounded-md no-print"
                              title={`Add session on ${day}`}
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] font-normal text-slate-400 block mt-0.5">
                          {dayEntries.length}{" "}
                          {dayEntries.length === 1 ? "class" : "classes"}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top">
                        {dayEntries.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2">
                            No classes scheduled for {day.toLowerCase()}.
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {dayEntries.map((entry) => (
                              <div
                                key={entry.id}
                                className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/80 hover:border-blue-400 hover:bg-blue-50/30 transition-all shadow-xs relative group flex flex-col justify-between"
                              >
                                <div>
                                  <div className="flex items-center justify-between mb-1.5">
                                    <span className="font-mono font-bold text-xs text-blue-700 bg-blue-100/70 px-2 py-0.5 rounded-md">
                                      {entry.course.code}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-md">
                                      ⏰ {entry.startTime} – {entry.endTime}
                                    </span>
                                  </div>
                                  <h4 className="font-bold text-xs text-slate-900 leading-tight line-clamp-1">
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

                                {!isImmutable && (
                                  <div className="mt-3 pt-2 border-t border-slate-200 flex items-center justify-end space-x-2 no-print">
                                    <button
                                      type="button"
                                      onClick={() => openEditModal(entry)}
                                      className="text-xs text-slate-600 hover:text-blue-600 p-1 rounded-md"
                                      title="Edit session"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteEntry(entry.id)}
                                      className="text-xs text-slate-600 hover:text-rose-600 p-1 rounded-md"
                                      title="Delete session"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
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
        /* Day-by-Day List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse print-table">
              <thead>
                <tr className="bg-slate-900 text-white text-xs uppercase tracking-wider">
                  <th className="py-3 px-4">Day</th>
                  <th className="py-3 px-4">Time Interval</th>
                  <th className="py-3 px-4">Course</th>
                  <th className="py-3 px-4">Facilitator</th>
                  <th className="py-3 px-4">Venue</th>
                  {!isImmutable && (
                    <th className="py-3 px-4 text-right no-print">Actions</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {(currentVersion?.entries || []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="p-8 text-center text-xs text-slate-400 italic"
                    >
                      No class sessions added to this schedule yet.
                    </td>
                  </tr>
                ) : (
                  (currentVersion?.entries || []).map((entry) => (
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
                      {!isImmutable && (
                        <td className="py-3 px-4 text-right no-print">
                          <div className="flex items-center justify-end space-x-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(entry)}
                              className="text-xs text-slate-600 hover:text-blue-600 p-1 rounded-md"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEntry(entry.id)}
                              className="text-xs text-slate-600 hover:text-rose-600 p-1 rounded-md"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Session Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEntry ? "Edit Class Session" : "Schedule New Session"}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="space-y-4 mt-4">
              {/* Course Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Academic Course
                </label>
                <select
                  value={formCourseId}
                  onChange={(e) => setFormCourseId(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} — {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Facilitator Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Faculty Facilitator
                </label>
                <select
                  value={formFacilitatorId}
                  onChange={(e) => setFormFacilitatorId(e.target.value)}
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {facilitators.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} {f.department ? `(${f.department})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Day of Week */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Day of the Week
                </label>
                <select
                  value={formDay}
                  onChange={(e) => setFormDay(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {DAYS_OF_WEEK.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              {/* Start & End Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Time (HH:mm)
                  </label>
                  <input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    required
                    className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Venue */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Venue / Lecture Room
                </label>
                <input
                  type="text"
                  value={formVenue}
                  onChange={(e) => setFormVenue(e.target.value)}
                  placeholder="e.g. Great Hall Annex 1, Lab 2, Room 304"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Modal Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-xs disabled:opacity-50"
                >
                  {loading ? "Checking Conflicts..." : "Save Session"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Publish Confirmation Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Publish Timetable (v{currentVersion.versionNumber})
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed mb-4">
              Publishing will make this version <strong>immutable</strong> and
              immediately visible on the public student portal. Any previously
              published version will become <strong>superseded</strong>.
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Publication Notes (Optional)
              </label>
              <textarea
                value={publishNotes}
                onChange={(e) => setPublishNotes(e.target.value)}
                placeholder="e.g. Official timetable approved by Academic Board"
                rows={3}
                className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePublishVersion}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 shadow-xs disabled:opacity-50"
              >
                {loading ? "Publishing..." : "Confirm & Publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Schedule Auto-Activation Modal */}
      {isScheduleModalOpen && currentVersion && (
        <ScheduleActivationModal
          versionId={currentVersion.id}
          versionNumber={currentVersion.versionNumber}
          currentSchedule={currentVersion.scheduledPublishAt}
          onClose={() => setIsScheduleModalOpen(false)}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            router.refresh();
          }}
        />
      )}

      {/* CSV Import Modal */}
      {isCsvModalOpen && currentVersion && (
        <CsvImportModal
          versionId={currentVersion.id}
          versionNumber={currentVersion.versionNumber}
          onClose={() => setIsCsvModalOpen(false)}
          onSuccess={(msg) => {
            setSuccessMessage(msg);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
