"use client";

import { useState, useEffect } from "react";
import {
  startClassSessionAction,
  stopClassSessionAction,
  getTodayScheduledClassesAction,
} from "@/app/actions/teaching-sessions";
import { formatDurationSeconds, formatDateKey } from "@/lib/services/session-service";
import { StopClassModal } from "./StopClassModal";
import {
  Clock,
  Play,
  Square,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Users,
  MapPin,
  Sparkles,
  Info,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

interface LiveClassTrackerProps {
  initialClasses: any[];
  initialDate: string;
  facilitators?: Array<{ id: string; name: string }>;
}

export function LiveClassTracker({
  initialClasses,
  initialDate,
  facilitators = [],
}: LiveClassTrackerProps) {
  const [selectedDate, setSelectedDate] = useState<string>(initialDate);
  const [classes, setClasses] = useState<any[]>(initialClasses);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modal State for Stopping a Session
  const [stopModalData, setStopModalData] = useState<{
    sessionId: string;
    courseCode: string;
    courseName: string;
    facilitatorName: string;
    venue: string;
    scheduledTime: string;
    startedAt: string;
  } | null>(null);

  // Ticker state to force re-render every second for live elapsed timers
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  async function loadClassesForDate(dateStr: string) {
    setLoading(true);
    setErrorMessage(null);
    const res = await getTodayScheduledClassesAction(dateStr);
    setLoading(false);
    if (res.success && res.data) {
      setClasses(res.data);
    } else {
      setErrorMessage(res.error || "Failed to load scheduled classes");
    }
  }

  async function handleDateChange(newDate: string) {
    setSelectedDate(newDate);
    await loadClassesForDate(newDate);
  }

  async function handleStartClass(entryId: string) {
    setActionLoadingId(entryId);
    setErrorMessage(null);
    setSuccessMessage(null);

    const res = await startClassSessionAction(entryId, selectedDate);
    setActionLoadingId(null);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to start class session");
      return;
    }

    setSuccessMessage("Class session started successfully! Live timer running.");
    await loadClassesForDate(selectedDate);
  }

  function openStopModal(item: any) {
    const session = item.activeSession;
    if (!session) return;

    setStopModalData({
      sessionId: session.id,
      courseCode: item.entry.course.code,
      courseName: item.entry.course.name,
      facilitatorName: item.entry.facilitator.name,
      venue: item.entry.venue,
      scheduledTime: `${item.entry.startTime} - ${item.entry.endTime}`,
      startedAt: session.startedAt,
    });
  }

  async function handleConfirmStop(
    notes: string,
    studentsPresent?: number | null,
    facilitatorPresent?: string | null
  ) {
    if (!stopModalData) return;
    setLoading(true);
    const res = await stopClassSessionAction(
      stopModalData.sessionId,
      notes,
      studentsPresent,
      facilitatorPresent
    );
    setLoading(false);

    if (!res.success) {
      setErrorMessage(res.error || "Failed to stop class session");
      return;
    }

    setStopModalData(null);
    setSuccessMessage("Class session completed and attendance recorded successfully.");
    await loadClassesForDate(selectedDate);
  }

  const todayStr = formatDateKey(new Date());
  const isToday = selectedDate === todayStr;

  return (
    <div className="space-y-6">
      {/* Date Bar & Controls */}
      <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            <span>Scheduled Classes & Teaching Sessions</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time classroom presence recording and teaching-session duration tracking.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => handleDateChange(todayStr)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              isToday
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            Today
          </button>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Date:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => handleDateChange(e.target.value)}
              className="text-xs rounded-lg border border-slate-300 px-3 py-1.5 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={() => loadClassesForDate(selectedDate)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Refresh schedule"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Operator Verification Disclaimer */}
      <div className="p-4 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs flex items-start space-x-3 shadow-xs">
        <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold text-white">
            Authorized Institutional Operator Recording
          </p>
          <p className="text-slate-400 leading-relaxed">
            Attendance and session durations are officially recorded by authorized institutional operators based on classroom monitoring. The system does not independently verify biometric identity or continuous physical presence.
          </p>
        </div>
      </div>

      {/* Notification Banners */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-500 hover:text-rose-700 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-500 hover:text-emerald-700 font-bold ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Classes List */}
      {classes.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500">
          <Clock className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-sm text-slate-800">
            No Published Classes Scheduled for {selectedDate}
          </p>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            Timetable entries only appear when an official timetable version is in PUBLISHED status.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {classes.map((item) => {
            const entry = item.entry;
            const timetable = entry.timetableVersion?.timetable;
            const activeSession = item.activeSession;
            const completedSession = item.completedSession;
            const displayStatus = item.displayStatus;

            // Compute live elapsed duration derived from saved server timestamp
            let liveElapsedSeconds = 0;
            if (activeSession) {
              const startMs = new Date(activeSession.startedAt).getTime();
              const nowMs = Date.now();
              liveElapsedSeconds = Math.max(0, Math.floor((nowMs - startMs) / 1000));
            }

            return (
              <div
                key={entry.id}
                className={`p-6 rounded-2xl border transition-all ${
                  displayStatus === "IN_PROGRESS"
                    ? "bg-blue-50/40 border-blue-300 ring-2 ring-blue-500/20 shadow-md"
                    : displayStatus === "COMPLETED"
                    ? "bg-white border-slate-200 shadow-xs"
                    : "bg-white border-slate-200 hover:border-slate-300 shadow-xs"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                  {/* Left: Class Information */}
                  <div className="space-y-3 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 text-white">
                        {entry.course.code}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {entry.course.name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                        {timetable?.programme?.code} &bull; {timetable?.programmeLevel?.levelCode}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-600">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-900 block">
                            {entry.facilitator.name}
                          </span>
                          <span className="text-slate-400 block text-[11px]">
                            Lead Facilitator (Timetable)
                          </span>
                          {completedSession?.facilitatorPresent &&
                            completedSession.facilitatorPresent !== entry.facilitator.name && (
                              <span className="text-emerald-700 font-bold block text-[11px] mt-0.5">
                                Present: {completedSession.facilitatorPresent}
                              </span>
                            )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-purple-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-900">
                            {entry.startTime} – {entry.endTime}
                          </span>
                          <span className="text-slate-400 block text-[11px]">
                            Scheduled Slot
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-semibold text-slate-900">
                            {entry.venue}
                          </span>
                          <span className="text-slate-400 block text-[11px]">
                            Assigned Venue
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Review Warning if Flagged */}
                    {completedSession?.flaggedForReview && (
                      <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Flagged for Review: </span>
                          <span>{completedSession.reviewReason}</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Right: Status Indicator & Action Controls */}
                  <div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-between gap-4 border-t lg:border-t-0 pt-4 lg:pt-0">
                    {/* Status Badges */}
                    <div>
                      {displayStatus === "IN_PROGRESS" && (
                        <div className="flex items-center space-x-2">
                          <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-600"></span>
                          </span>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-700 border border-blue-200">
                            IN PROGRESS
                          </span>
                        </div>
                      )}

                      {displayStatus === "COMPLETED" && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>COMPLETED</span>
                        </span>
                      )}

                      {displayStatus === "REQUIRES_REVIEW" && (
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>REQUIRES REVIEW</span>
                        </span>
                      )}

                      {displayStatus === "SCHEDULED" && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          SCHEDULED
                        </span>
                      )}
                    </div>

                    {/* Live Counter or Recorded Duration */}
                    <div>
                      {displayStatus === "IN_PROGRESS" && (
                        <div className="text-right">
                          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                            Live Elapsed Duration
                          </span>
                          <span className="text-2xl font-black font-mono text-blue-700 tracking-tight">
                            {formatDurationSeconds(liveElapsedSeconds)}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            Started: {new Date(activeSession.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      )}

                      {(displayStatus === "COMPLETED" || displayStatus === "REQUIRES_REVIEW") && completedSession && (
                        <div className="text-right text-xs">
                          <span className="text-[11px] text-slate-400 block font-medium">
                            Recorded Teaching Time
                          </span>
                          <span className="font-bold text-slate-800 font-mono text-base">
                            {formatDurationSeconds(completedSession.durationSeconds || 0)}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {Math.round((completedSession.durationSeconds || 0) / 60)} minutes
                          </span>
                          {completedSession.studentsPresent !== null && completedSession.studentsPresent !== undefined && (
                            <div className="mt-1.5 inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              <Users className="w-3 h-3 text-blue-500" />
                              <span>
                                {completedSession.studentsPresent} students present
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Start / Stop Action Buttons */}
                    <div>
                      {displayStatus === "SCHEDULED" && (
                        <button
                          type="button"
                          disabled={actionLoadingId === entry.id}
                          onClick={() => handleStartClass(entry.id)}
                          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
                        >
                          {actionLoadingId === entry.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Play className="w-3.5 h-3.5 fill-current" />
                          )}
                          <span>Start Class</span>
                        </button>
                      )}

                      {displayStatus === "IN_PROGRESS" && (
                        <button
                          type="button"
                          onClick={() => openStopModal(item)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center space-x-2"
                        >
                          <Square className="w-3.5 h-3.5 fill-current" />
                          <span>Stop Class</span>
                        </button>
                      )}

                      {(displayStatus === "COMPLETED" || displayStatus === "REQUIRES_REVIEW") && (
                        <div className="text-xs text-slate-400 font-medium">
                          Session Finished &bull; Locked
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Stop Class Confirmation Modal */}
      <StopClassModal
        isOpen={Boolean(stopModalData)}
        onClose={() => setStopModalData(null)}
        onConfirm={handleConfirmStop}
        loading={loading}
        classData={stopModalData}
        availableFacilitators={facilitators}
      />
    </div>
  );
}
