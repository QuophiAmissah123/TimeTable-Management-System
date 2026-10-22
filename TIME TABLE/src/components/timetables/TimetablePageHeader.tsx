"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  FileUp,
  Plus,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { StandaloneIntakeModal } from "./StandaloneIntakeModal";

interface AcademicPeriod {
  id: string;
  academicYear: string;
  semester: string;
  isCurrent: boolean;
}

interface TimetablePageHeaderProps {
  periods: AcademicPeriod[];
}

export function TimetablePageHeader({ periods }: TimetablePageHeaderProps) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <span>Timetable Ingestion & Schedules</span>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
              <Sparkles className="w-3 h-3 mr-1 text-blue-600" />
              Word & Excel Intake
            </span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Accept and intake external timetables, auto-populate courses & facilitators, and track class delivery on the calendar.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/admin/calendar"
            className="inline-flex items-center space-x-2 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold shadow-2xs transition-all"
          >
            <Calendar className="w-4 h-4 text-blue-600" />
            <span>Lecture Calendar</span>
          </Link>

          <button
            type="button"
            id="open-standalone-intake-modal"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <FileUp className="w-4 h-4" />
            <span>Intake Timetable (Word / Excel)</span>
          </button>

          <Link
            href="/admin/timetables/new"
            className="inline-flex items-center space-x-1.5 px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-semibold transition-all"
            title="Manual timetable setup"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Manual</span>
          </Link>
        </div>
      </div>

      <StandaloneIntakeModal
        periods={periods}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}
