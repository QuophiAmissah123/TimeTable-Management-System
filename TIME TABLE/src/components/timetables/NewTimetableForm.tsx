"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createTimetableAction } from "@/app/actions/timetables";
import { CalendarDays, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface Programme {
  id: string;
  code: string;
  name: string;
  levels: Array<{ id: string; levelCode: string; levelName: string }>;
}

interface AcademicPeriod {
  id: string;
  academicYear: string;
  semester: string;
  isCurrent: boolean;
}

export function NewTimetableForm({
  programmes,
  periods,
}: {
  programmes: Programme[];
  periods: AcademicPeriod[];
}) {
  const router = useRouter();
  const [selectedProgrammeId, setSelectedProgrammeId] = useState(
    programmes[0]?.id || ""
  );
  const [selectedLevelId, setSelectedLevelId] = useState(
    programmes[0]?.levels[0]?.id || ""
  );
  const [selectedPeriodId, setSelectedPeriodId] = useState(
    periods.find((p) => p.isCurrent)?.id || periods[0]?.id || ""
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeProgramme = programmes.find((p) => p.id === selectedProgrammeId);
  const availableLevels = activeProgramme?.levels || [];

  function handleProgrammeChange(newProgId: string) {
    setSelectedProgrammeId(newProgId);
    const prog = programmes.find((p) => p.id === newProgId);
    if (prog && prog.levels.length > 0) {
      setSelectedLevelId(prog.levels[0].id);
    } else {
      setSelectedLevelId("");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("programmeId", selectedProgrammeId);
    formData.append("programmeLevelId", selectedLevelId);
    formData.append("academicPeriodId", selectedPeriodId);

    const res = await createTimetableAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create timetable");
      return;
    }

    if (res.data?.id) {
      router.push(`/admin/timetables/${res.data.id}`);
    } else {
      router.push("/admin/timetables");
    }
  }

  return (
    <div className="max-w-2xl bg-white p-8 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex items-center space-x-3 pb-6 border-b border-slate-100">
        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
          <CalendarDays className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Create Academic Timetable
          </h3>
          <p className="text-xs text-slate-500">
            Initialize an official timetable draft for a programme cohort.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-start space-x-2">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 mt-6">
        {/* Programme Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            1. Select Academic Programme
          </label>
          <select
            value={selectedProgrammeId}
            onChange={(e) => handleProgrammeChange(e.target.value)}
            required
            className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code} — {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Level Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            2. Select Student Cohort Level
          </label>
          <select
            value={selectedLevelId}
            onChange={(e) => setSelectedLevelId(e.target.value)}
            required
            disabled={availableLevels.length === 0}
            className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100"
          >
            {availableLevels.map((lvl) => (
              <option key={lvl.id} value={lvl.id}>
                {lvl.levelName} ({lvl.levelCode})
              </option>
            ))}
          </select>
          {availableLevels.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              This programme has no levels configured. Add levels first in Programme Management.
            </p>
          )}
        </div>

        {/* Academic Period Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
            3. Select Academic Session / Period
          </label>
          <select
            value={selectedPeriodId}
            onChange={(e) => setSelectedPeriodId(e.target.value)}
            required
            className="w-full text-sm rounded-lg border border-slate-300 py-2.5 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.academicYear} {p.semester} {p.isCurrent ? "★ (Active Session)" : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <Link
            href="/admin/timetables"
            className="text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={loading || availableLevels.length === 0}
            className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing...</span>
              </>
            ) : (
              <>
                <span>Initialize Timetable Draft</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
