"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Search, X, AlertTriangle } from "lucide-react";
import {
  createCourseAction,
  toggleCourseStatusAction,
} from "@/app/actions/courses";

interface Course {
  id: string;
  code: string;
  name: string;
  creditHours: number;
  description?: string | null;
  isActive: boolean;
  _count?: { entries: number };
}

export function CoursesManager({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [creditHours, setCreditHours] = useState(3);
  const [description, setDescription] = useState("");

  const filtered = courses.filter(
    (c) =>
      c.code.toLowerCase().includes(search.toLowerCase()) ||
      c.name.toLowerCase().includes(search.toLowerCase())
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("code", code);
    formData.append("name", name);
    formData.append("creditHours", String(creditHours));
    if (description) formData.append("description", description);

    const res = await createCourseAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create course");
      return;
    }

    setCode("");
    setName("");
    setDescription("");
    setIsModalOpen(false);
    router.refresh();
  }

  async function handleToggleStatus(id: string) {
    setLoading(true);
    const res = await toggleCourseStatusAction(id);
    setLoading(false);

    if (!res.success) {
      alert(res.error || "Failed to toggle status");
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Course Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Maintain unique course codes, curriculum titles, and credit hours.
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
          <span>New Course</span>
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by course code or title..."
          className="w-full text-sm rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-3 px-6">Course Code</th>
              <th className="py-3 px-6">Course Name</th>
              <th className="py-3 px-6">Credit Hours</th>
              <th className="py-3 px-6">Scheduled Classes</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No courses found matching your query.
                </td>
              </tr>
            ) : (
              filtered.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 font-mono font-bold text-blue-600">
                    {c.code}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-900">
                    {c.name}
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-700">
                    {c.creditHours} Credits
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-700">
                    {c._count?.entries || 0}
                  </td>
                  <td className="py-4 px-6">
                    {c.isActive ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button
                      onClick={() => handleToggleStatus(c.id)}
                      disabled={loading}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
                    >
                      {c.isActive ? "Deactivate" : "Activate"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">Add New Course</h3>
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
                  Course Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. CS101, MATH201"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Course Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Introduction to Programming"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Credit Hours
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={creditHours}
                  onChange={(e) => setCreditHours(Number(e.target.value))}
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Syllabus overview and course prerequisites"
                  rows={3}
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
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
                  {loading ? "Saving..." : "Create Course"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
