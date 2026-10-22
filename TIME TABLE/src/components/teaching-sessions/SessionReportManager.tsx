"use client";

import { useState } from "react";
import {
  getTeachingSessionsReportAction,
  exportTeachingSessionsCsvAction,
  updateSessionStudentAttendanceAction,
} from "@/app/actions/teaching-sessions";
import { formatDurationSeconds } from "@/lib/services/session-service";
import {
  FileSpreadsheet,
  Filter,
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Download,
  Calendar,
  Layers,
  RefreshCw,
  X,
  Edit2,
  Save,
  UserCog,
} from "lucide-react";

interface SessionReportManagerProps {
  initialSessions: any[];
  facilitators: any[];
  programmes: any[];
}

export function SessionReportManager({
  initialSessions,
  facilitators,
  programmes,
}: SessionReportManagerProps) {
  const [sessions, setSessions] = useState<any[]>(initialSessions);
  const [loading, setLoading] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [selectedFacilitator, setSelectedFacilitator] = useState<string>("ALL");
  const [selectedProgramme, setSelectedProgramme] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  // Edit Headcount & Facilitator Present Modal State
  const [editingSession, setEditingSession] = useState<any | null>(null);
  const [editPresent, setEditPresent] = useState<string>("");
  const [editFacilitatorPresent, setEditFacilitatorPresent] = useState<string>("");
  const [updatingAttendance, setUpdatingAttendance] = useState<boolean>(false);

  async function handleFilter(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setLoading(true);

    const res = await getTeachingSessionsReportAction({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      facilitatorId: selectedFacilitator,
      programmeId: selectedProgramme,
      status: selectedStatus,
    });

    setLoading(false);
    if (res.success && res.data) {
      setSessions(res.data);
    }
  }

  async function handleExportCsv() {
    setExporting(true);
    const res = await exportTeachingSessionsCsvAction({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      facilitatorId: selectedFacilitator,
      programmeId: selectedProgramme,
      status: selectedStatus,
    });
    setExporting(false);

    if (res.success && res.csv) {
      // Trigger client-side file download
      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", res.filename || "teaching-sessions-report.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      alert(res.error || "Failed to export report");
    }
  }

  function openEditAttendance(session: any) {
    setEditingSession(session);
    setEditPresent(
      session.studentsPresent !== null && session.studentsPresent !== undefined
        ? String(session.studentsPresent)
        : ""
    );
    setEditFacilitatorPresent(
      session.facilitatorPresent || session.timetableEntry?.facilitator?.name || ""
    );
  }

  async function handleSaveAttendance(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSession) return;

    const present = parseInt(editPresent, 10);
    if (isNaN(present) || present < 0) {
      alert("Please enter a valid non-negative number for students present.");
      return;
    }

    setUpdatingAttendance(true);
    const res = await updateSessionStudentAttendanceAction(
      editingSession.id,
      present,
      editFacilitatorPresent.trim() || null
    );
    setUpdatingAttendance(false);

    if (res.success) {
      setSessions((prev) =>
        prev.map((s) =>
          s.id === editingSession.id
            ? {
                ...s,
                studentsPresent: present,
                facilitatorPresent: editFacilitatorPresent.trim() || s.facilitatorPresent,
              }
            : s
        )
      );
      setEditingSession(null);
    } else {
      alert(res.error || "Failed to update attendance");
    }
  }

  // Calculate Summary Metrics
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === "COMPLETED");
  const inProgressSessions = sessions.filter((s) => s.status === "IN_PROGRESS");
  const reviewSessions = sessions.filter((s) => s.flaggedForReview);

  const totalTeachingSeconds = completedSessions.reduce(
    (acc, curr) => acc + (curr.durationSeconds || 0),
    0
  );
  const totalHours = Math.floor(totalTeachingSeconds / 3600);
  const totalRemainingMinutes = Math.floor((totalTeachingSeconds % 3600) / 60);

  const totalStudentsPresent = completedSessions.reduce(
    (acc, curr) => acc + (curr.studentsPresent || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Sessions
            </span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-slate-900">{totalSessions}</div>
          <p className="text-xs text-slate-400">All filtered occurrences</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Teaching Time
            </span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-700">
            {totalHours}h {totalRemainingMinutes}m
          </div>
          <p className="text-xs text-slate-400">Recorded instruction time</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Total Student Count
            </span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-extrabold text-blue-700">
            {totalStudentsPresent.toLocaleString()}
          </div>
          <p className="text-xs text-slate-400">Total student attendance counted</p>
        </div>

        <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-semibold uppercase tracking-wider">
              Requires Review
            </span>
            <AlertCircle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-extrabold text-amber-700">
            {reviewSessions.length}
          </div>
          <p className="text-xs text-slate-400">Duration exceeded threshold</p>
        </div>
      </div>

      {/* Filter & Export Bar */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs">
        <form onSubmit={handleFilter} className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lecturer / Facilitator
            </label>
            <select
              value={selectedFacilitator}
              onChange={(e) => setSelectedFacilitator(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Lecturers</option>
              {facilitators.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Programme
            </label>
            <select
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} - {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full text-xs rounded-lg border border-slate-300 px-3 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="REQUIRES_REVIEW">Requires Review</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
            >
              <Filter className="w-3.5 h-3.5" />
              <span>{loading ? "Filtering..." : "Filter"}</span>
            </button>

            <button
              type="button"
              disabled={exporting}
              onClick={handleExportCsv}
              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors flex items-center justify-center space-x-1.5 shadow-xs disabled:opacity-50"
              title="Export filtered records to Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{exporting ? "..." : "Excel/CSV"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Sessions Records Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              Teaching Attendance & Duration Audit Log
            </h3>
            <p className="text-xs text-slate-400">
              Showing {sessions.length} recorded session occurrence(s)
            </p>
          </div>
        </div>

        {sessions.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            No teaching session records found matching the specified filters.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Course & Programme</th>
                  <th className="px-4 py-3">Lead Facilitator</th>
                  <th className="px-4 py-3">Facilitator Present</th>
                  <th className="px-4 py-3">Scheduled Slot</th>
                  <th className="px-4 py-3">Recorded Time</th>
                  <th className="px-4 py-3 text-right">Duration</th>
                  <th className="px-4 py-3 text-center">Students Present</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sessions.map((session) => {
                  const entry = session.timetableEntry;
                  const timetable = entry?.timetableVersion?.timetable;
                  const course = entry?.course;
                  const facilitator = entry?.facilitator;

                  const durationSec = session.durationSeconds || 0;
                  const formattedDuration = formatDurationSeconds(durationSec);
                  const durationMins = Math.round(durationSec / 60);

                  const startTimeFormatted = session.startedAt
                    ? new Date(session.startedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "--:--";

                  const endTimeFormatted = session.endedAt
                    ? new Date(session.endedAt).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "In Progress";

                  const hasStudentData =
                    session.studentsPresent !== null && session.studentsPresent !== undefined;

                  const facilitatorPresentName =
                    session.facilitatorPresent || facilitator?.name;
                  const isSubstitute =
                    session.facilitatorPresent &&
                    session.facilitatorPresent.toLowerCase().trim() !==
                      facilitator?.name.toLowerCase().trim();

                  return (
                    <tr
                      key={session.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        session.flaggedForReview ? "bg-amber-50/30" : ""
                      }`}
                    >
                      <td className="px-4 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                        {session.sessionDate}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">{course?.code}</div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          {course?.name}
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium">
                          {timetable?.programme?.code} &bull; {timetable?.programmeLevel?.levelCode}
                        </span>
                      </td>

                      {/* Lead Facilitator from Timetable */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {facilitator?.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {facilitator?.department || "Faculty"}
                        </div>
                      </td>

                      {/* Facilitator Present */}
                      <td className="px-4 py-3.5">
                        <div className="font-semibold text-slate-900">
                          {facilitatorPresentName}
                        </div>
                        {isSubstitute && (
                          <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                            Substitute / Colleague
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="font-medium text-slate-800">
                          {entry?.dayOfWeek}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {entry?.startTime} - {entry?.endTime} ({entry?.venue})
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="text-slate-800 font-mono text-[11px]">
                          {startTimeFormatted} &rarr; {endTimeFormatted}
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="font-extrabold font-mono text-slate-900 text-xs">
                          {formattedDuration}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {durationMins} mins
                        </div>
                      </td>

                      {/* Student Attendance Count Column - Students Present Only */}
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {hasStudentData ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="font-bold text-slate-800 flex items-center space-x-1">
                              <Users className="w-3.5 h-3.5 text-blue-600 inline mr-1" />
                              <span>{session.studentsPresent} students</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => openEditAttendance(session)}
                              className="mt-0.5 text-[10px] text-slate-400 hover:text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => openEditAttendance(session)}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors"
                          >
                            + Record Count
                          </button>
                        )}
                      </td>

                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {session.status === "IN_PROGRESS" && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            IN PROGRESS
                          </span>
                        )}
                        {session.status === "COMPLETED" && !session.flaggedForReview && (
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            COMPLETED
                          </span>
                        )}
                        {session.flaggedForReview && (
                          <span
                            className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200"
                            title={session.reviewReason || "Flagged for review"}
                          >
                            REVIEW REQUIRED
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3.5">
                        <div className="text-slate-700 font-medium text-[11px]">
                          {session.startedBy?.fullName || "Operator"}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Authorized Staff
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

      {/* Edit Student Headcount & Facilitator Present Modal */}
      {editingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Users className="w-5 h-5 text-blue-400" />
                <div>
                  <h4 className="font-bold text-sm">Update Attendance & Facilitator</h4>
                  <p className="text-[11px] text-slate-400">
                    {editingSession.timetableEntry?.course?.code} &bull; {editingSession.sessionDate}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAttendance} className="p-6 space-y-4">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs">
                <span className="text-slate-500 font-medium">Scheduled Lead Facilitator: </span>
                <span className="font-bold text-slate-800">
                  {editingSession.timetableEntry?.facilitator?.name}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5">
                  <UserCog className="w-3.5 h-3.5 text-blue-600" />
                  <span>Facilitator Present for Class</span>
                </label>
                <input
                  type="text"
                  list="report-facilitator-list"
                  value={editFacilitatorPresent}
                  onChange={(e) => setEditFacilitatorPresent(e.target.value)}
                  placeholder="Type or select attending lecturer..."
                  className="w-full text-xs font-medium rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <datalist id="report-facilitator-list">
                  {facilitators.map((f) => (
                    <option key={f.id} value={f.name} />
                  ))}
                </datalist>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Type or select if a substitute or guest lecturer taught this session.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Number of Students Present
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={editPresent}
                  onChange={(e) => setEditPresent(e.target.value)}
                  placeholder="e.g. 45"
                  className="w-full text-xs font-medium rounded-xl border border-slate-300 px-3.5 py-2.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingSession(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingAttendance}
                  className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{updatingAttendance ? "Saving..." : "Save Record"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
