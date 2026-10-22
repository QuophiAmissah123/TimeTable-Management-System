"use client";

import { useState } from "react";
import { LiveClassTracker } from "./LiveClassTracker";
import { SessionReportManager } from "./SessionReportManager";
import { PlayCircle, FileText, Clock, BarChart3 } from "lucide-react";

interface AttendancePageManagerProps {
  initialClasses: any[];
  initialSessions: any[];
  initialDate: string;
  facilitators: any[];
  programmes: any[];
}

export function AttendancePageManager({
  initialClasses,
  initialSessions,
  initialDate,
  facilitators,
  programmes,
}: AttendancePageManagerProps) {
  const [activeTab, setActiveTab] = useState<"tracker" | "reports">("tracker");

  const inProgressCount = initialClasses.filter(
    (c) => c.displayStatus === "IN_PROGRESS"
  ).length;

  return (
    <div className="space-y-6">
      {/* Tab Switcher */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          type="button"
          onClick={() => setActiveTab("tracker")}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors ${
            activeTab === "tracker"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <PlayCircle className="w-4 h-4" />
          <span>Live Class Tracker</span>
          {inProgressCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-700">
              {inProgressCount} Active
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("reports")}
          className={`flex items-center space-x-2 px-5 py-3 border-b-2 font-bold text-xs transition-colors ${
            activeTab === "reports"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Attendance & Duration Reports</span>
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "tracker" ? (
        <LiveClassTracker
          initialClasses={initialClasses}
          initialDate={initialDate}
          facilitators={facilitators}
        />
      ) : (
        <SessionReportManager
          initialSessions={initialSessions}
          facilitators={facilitators}
          programmes={programmes}
        />
      )}
    </div>
  );
}
