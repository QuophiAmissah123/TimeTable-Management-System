"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarRange,
  Plus,
  CheckCircle2,
  Calendar,
  X,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  createAcademicPeriodAction,
  setCurrentAcademicPeriodAction,
} from "@/app/actions/academic-periods";

interface Period {
  id: string;
  academicYear: string;
  semester: string;
  startDate?: Date | string | null;
  endDate?: Date | string | null;
  isCurrent: boolean;
  _count?: { timetables: number };
}

export function AcademicPeriodsManager({ periods }: { periods: Period[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [academicYear, setAcademicYear] = useState("2026/2027");
  const [semester, setSemester] = useState("Semester 1");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrent, setIsCurrent] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("academicYear", academicYear);
    formData.append("semester", semester);
    if (startDate) formData.append("startDate", startDate);
    if (endDate) formData.append("endDate", endDate);
    if (isCurrent) formData.append("isCurrent", "true");

    const res = await createAcademicPeriodAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create period");
      return;
    }

    setIsModalOpen(false);
    router.refresh();
  }

  async function handleSetCurrent(id: string) {
    if (!confirm("Set this period as the institution's active session?")) return;
    setLoading(true);
    const res = await setCurrentAcademicPeriodAction(id);
    setLoading(false);

    if (!res.success) {
      alert(res.error || "Failed to set active period");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Academic Periods
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Explicitly manage academic years and semesters. Set the active session for scheduling.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center space-x-2 px-4 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-sm transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Academic Period</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-3 px-6">Academic Year</th>
              <th className="py-3 px-6">Semester</th>
              <th className="py-3 px-6">Date Range</th>
              <th className="py-3 px-6">Session Status</th>
              <th className="py-3 px-6">Timetables</th>
              <th className="py-3 px-6 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {periods.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-6 font-bold text-slate-900">
                  {p.academicYear}
                </td>
                <td className="py-4 px-6 font-medium text-slate-700">
                  {p.semester}
                </td>
                <td className="py-4 px-6 text-xs text-slate-500">
                  {p.startDate ? new Date(p.startDate).toLocaleDateString() : "—"} to{" "}
                  {p.endDate ? new Date(p.endDate).toLocaleDateString() : "—"}
                </td>
                <td className="py-4 px-6">
                  {p.isCurrent ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                      Active Session
                    </span>
                  ) : (
                    <span className="text-xs text-slate-400">Inactive</span>
                  )}
                </td>
                <td className="py-4 px-6 font-semibold text-slate-700">
                  {p._count?.timetables || 0}
                </td>
                <td className="py-4 px-6 text-right">
                  {!p.isCurrent && (
                    <button
                      onClick={() => handleSetCurrent(p.id)}
                      disabled={loading}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 hover:underline disabled:opacity-50"
                    >
                      Set as Active
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                New Academic Period
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Academic Year
                </label>
                <input
                  type="text"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="e.g. 2026/2027"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Semester / Term
                </label>
                <input
                  type="text"
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="e.g. Semester 1, Semester 2"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isCurrent"
                  checked={isCurrent}
                  onChange={(e) => setIsCurrent(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                />
                <label htmlFor="isCurrent" className="text-xs font-medium text-slate-700">
                  Set as current active institutional session
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs disabled:opacity-50"
                >
                  {loading ? "Saving..." : "Create Period"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
