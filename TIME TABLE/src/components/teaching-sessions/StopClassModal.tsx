"use client";

import { useState, useEffect } from "react";
import { formatDurationSeconds } from "@/lib/services/session-service";
import { Clock, X, CheckCircle, UserCheck, Users, UserCog } from "lucide-react";

interface StopClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (
    notes: string,
    studentsPresent?: number | null,
    facilitatorPresent?: string | null
  ) => Promise<void>;
  loading: boolean;
  classData: {
    courseCode: string;
    courseName: string;
    facilitatorName: string; // Scheduled Lead Facilitator
    venue: string;
    scheduledTime: string;
    startedAt: string | Date;
  } | null;
  availableFacilitators?: Array<{ id: string; name: string }>;
}

export function StopClassModal({
  isOpen,
  onClose,
  onConfirm,
  loading,
  classData,
  availableFacilitators = [],
}: StopClassModalProps) {
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [studentsPresent, setStudentsPresent] = useState<string>("");
  const [facilitatorPresent, setFacilitatorPresent] = useState<string>("");

  // Live elapsed counter derived strictly from the saved start timestamp
  useEffect(() => {
    if (!isOpen || !classData?.startedAt) return;

    const startTime = new Date(classData.startedAt).getTime();

    const updateTimer = () => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - startTime) / 1000));
      setElapsedSeconds(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [isOpen, classData?.startedAt]);

  // Pre-fill Facilitator Present with the official Lead Facilitator from the timetable
  useEffect(() => {
    if (isOpen && classData) {
      setNotes("");
      setStudentsPresent("");
      setFacilitatorPresent(classData.facilitatorName || "");
    }
  }, [isOpen, classData]);

  if (!isOpen || !classData) return null;

  const presentNum = studentsPresent.trim() !== "" ? parseInt(studentsPresent, 10) : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onConfirm(notes, presentNum, facilitatorPresent.trim() || classData?.facilitatorName);
  }

  const startDateObj = new Date(classData.startedAt);
  const formattedStartTime = startDateObj.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Stop Teaching Session</h3>
              <p className="text-xs text-slate-400">Confirm end of instruction & record attendance</p>
            </div>
          </div>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Real-time Elapsed Duration Card */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-0.5">
            <span className="text-[11px] font-semibold tracking-wider text-slate-500 uppercase">
              Current Recorded Duration
            </span>
            <div className="text-3xl font-extrabold tracking-tight text-slate-900 font-mono">
              {formatDurationSeconds(elapsedSeconds)}
            </div>
            <p className="text-xs text-slate-500">
              Server start time:{" "}
              <span className="font-medium text-slate-700">{formattedStartTime}</span>
            </p>
          </div>

          {/* Session Overview Details */}
          <div className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-xs">
            <div className="px-4 py-2 flex justify-between bg-white">
              <span className="text-slate-500 font-medium">Course:</span>
              <span className="font-bold text-slate-800 text-right">
                {classData.courseCode} — {classData.courseName}
              </span>
            </div>
            <div className="px-4 py-2 flex justify-between bg-white">
              <span className="text-slate-500 font-medium">Scheduled Time & Venue:</span>
              <span className="text-slate-700 text-right font-medium">
                {classData.scheduledTime} &bull; {classData.venue}
              </span>
            </div>
          </div>

          {/* Facilitator Section: Lead Facilitator vs Facilitator Present */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Lead Facilitator (Timetable):</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                {classData.facilitatorName}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center space-x-1.5">
                <UserCog className="w-3.5 h-3.5 text-blue-600" />
                <span>Facilitator Present for Class</span>
              </label>
              <input
                type="text"
                list="facilitator-options"
                value={facilitatorPresent}
                onChange={(e) => setFacilitatorPresent(e.target.value)}
                placeholder="Type or select attending lecturer..."
                disabled={loading}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
              />
              <datalist id="facilitator-options">
                {availableFacilitators.map((f) => (
                  <option key={f.id} value={f.name} />
                ))}
              </datalist>
              <p className="text-[11px] text-slate-500 mt-1">
                Defaults to the scheduled lead facilitator. Type or select if a substitute or colleague taught this class.
              </p>
            </div>
          </div>

          {/* Manual Student Attendance Headcount - Students Present Only */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-2">
            <div className="flex items-center space-x-2 text-blue-900">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold uppercase tracking-wider">
                Student Attendance (Students Present)
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Number of Students Present
              </label>
              <input
                type="number"
                min="0"
                step="1"
                value={studentsPresent}
                onChange={(e) => setStudentsPresent(e.target.value)}
                placeholder="e.g. 45"
                disabled={loading}
                className="w-full text-xs font-medium rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
              />
            </div>
            <p className="text-[11px] text-slate-500">
              Enter the manually counted number of students present in this session.
            </p>
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Session Observations / Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Topic covered, lab exercises..."
              rows={2}
              disabled={loading}
              className="w-full text-xs rounded-xl border border-slate-300 px-3.5 py-2 text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-blue-500 placeholder:text-slate-400"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-1">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md shadow-rose-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting End Time...</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>Confirm & Stop Class</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
