"use client";

import { useState } from "react";
import {
  CalendarClock,
  Clock,
  X,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import {
  scheduleVersionPublicationAction,
  cancelScheduledPublicationAction,
} from "@/app/actions/timetables";

interface ScheduleActivationModalProps {
  versionId: string;
  versionNumber: number;
  currentSchedule?: Date | string | null;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function ScheduleActivationModal({
  versionId,
  versionNumber,
  currentSchedule,
  onClose,
  onSuccess,
}: ScheduleActivationModalProps) {
  // Convert current schedule to local datetime-local format if present
  const getInitialDateTime = () => {
    if (currentSchedule) {
      const d = new Date(currentSchedule);
      if (!isNaN(d.getTime())) {
        const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
        return local.toISOString().slice(0, 16);
      }
    }
    // Default to tomorrow 08:00 AM
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);
    const local = new Date(tomorrow.getTime() - tomorrow.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 16);
  };

  const [scheduledAt, setScheduledAt] = useState(getInitialDateTime());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflicts, setConflicts] = useState<any[]>([]);

  // Calculate minimum datetime allowed (now)
  const nowLocal = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  const applyPreset = (preset: "1hour" | "tomorrow" | "monday") => {
    const target = new Date();
    if (preset === "1hour") {
      target.setHours(target.getHours() + 1);
    } else if (preset === "tomorrow") {
      target.setDate(target.getDate() + 1);
      target.setHours(8, 0, 0, 0);
    } else if (preset === "monday") {
      const day = target.getDay();
      const distance = (8 - day) % 7 || 7;
      target.setDate(target.getDate() + distance);
      target.setHours(8, 0, 0, 0);
    }
    const local = new Date(target.getTime() - target.getTimezoneOffset() * 60000);
    setScheduledAt(local.toISOString().slice(0, 16));
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduledAt) {
      setError("Please select a date and time.");
      return;
    }

    setLoading(true);
    setError(null);
    setConflicts([]);

    try {
      const res = await scheduleVersionPublicationAction(versionId, scheduledAt);
      setLoading(false);

      if (!res.success) {
        if (res.conflicts && res.conflicts.length > 0) {
          setConflicts(res.conflicts);
          setError("Cannot schedule: Scheduling conflicts must be resolved first.");
        } else {
          setError(res.error || "Failed to schedule publication.");
        }
        return;
      }

      onSuccess(
        `Timetable Version v${versionNumber} scheduled for auto-activation at ${new Date(
          scheduledAt
        ).toLocaleString()}`
      );
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  const handleCancelSchedule = async () => {
    if (!confirm("Are you sure you want to cancel the scheduled auto-activation?")) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await cancelScheduledPublicationAction(versionId);
      setLoading(false);

      if (!res.success) {
        setError(res.error || "Failed to cancel scheduled publication.");
        return;
      }

      onSuccess(`Auto-activation schedule for Version v${versionNumber} cancelled.`);
      onClose();
    } catch (err: any) {
      setLoading(false);
      setError(err.message || "An unexpected error occurred.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <CalendarClock className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight">
                Schedule Timetable Auto-Activation
              </h3>
              <p className="text-xs text-slate-300">
                Target: Version v{versionNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Information Notice */}
          <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-100 flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="text-xs text-indigo-900 leading-relaxed">
              <span className="font-semibold block text-indigo-950 mb-0.5">
                Automated Future Activation
              </span>
              When the selected date and time arrives, the system will automatically promote
              Version v{versionNumber} to <strong>PUBLISHED</strong>, superseding previous versions
              and making it the official active timetable.
            </div>
          </div>

          {/* Current Schedule Banner if already scheduled */}
          {currentSchedule && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-amber-900">
                    Currently Scheduled
                  </div>
                  <div className="text-xs text-amber-800">
                    {new Date(currentSchedule).toLocaleString(undefined, {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelSchedule}
                disabled={loading}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-amber-300 text-red-600 hover:bg-red-50 text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Cancel Schedule</span>
              </button>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSchedule} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                Activation Date & Time
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                min={nowLocal}
                onChange={(e) => setScheduledAt(e.target.value)}
                required
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm font-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 shadow-2xs"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1.5">
                Quick Presets
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => applyPreset("1hour")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  +1 Hour
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("tomorrow")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Tomorrow 8:00 AM
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset("monday")}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-colors"
                >
                  Next Monday 8:00 AM
                </button>
              </div>
            </div>

            {/* Conflict / General Errors */}
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">{error}</span>
                  {conflicts.length > 0 && (
                    <ul className="mt-1 list-disc list-inside space-y-0.5 text-red-700">
                      {conflicts.slice(0, 3).map((c, i) => (
                        <li key={i}>{c.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Modal Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={loading}
                className="inline-flex items-center space-x-2 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-600/20 transition-all disabled:opacity-50"
              >
                <CalendarClock className="w-4 h-4" />
                <span>{loading ? "Scheduling..." : currentSchedule ? "Update Schedule" : "Confirm Schedule"}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
