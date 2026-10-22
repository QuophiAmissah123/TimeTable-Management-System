"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GraduationCap,
  Plus,
  X,
  AlertTriangle,
  Layers,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  createProgrammeAction,
  toggleProgrammeStatusAction,
  addProgrammeLevelAction,
} from "@/app/actions/programmes";

interface ProgrammeLevel {
  id: string;
  levelCode: string;
  levelName: string;
  sortOrder: number;
}

interface Programme {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  levels: ProgrammeLevel[];
  _count?: { timetables: number };
}

export function ProgrammesManager({ programmes }: { programmes: Programme[] }) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [levelModalProg, setLevelModalProg] = useState<Programme | null>(null);

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Programme Form Fields
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  // Level Form Fields
  const [newLevelCode, setNewLevelCode] = useState("");
  const [newLevelName, setNewLevelName] = useState("");
  const [newSortOrder, setNewSortOrder] = useState(1);

  async function handleCreateProgramme(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("code", code);
    formData.append("name", name);
    if (description) formData.append("description", description);

    const res = await createProgrammeAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create programme");
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
    const res = await toggleProgrammeStatusAction(id);
    setLoading(false);

    if (!res.success) {
      alert(res.error || "Failed to toggle status");
      return;
    }
    router.refresh();
  }

  async function handleAddLevel(e: React.FormEvent) {
    e.preventDefault();
    if (!levelModalProg) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("levelCode", newLevelCode);
    formData.append("levelName", newLevelName);
    formData.append("sortOrder", String(newSortOrder));

    const res = await addProgrammeLevelAction(levelModalProg.id, formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to add level");
      return;
    }

    setNewLevelCode("");
    setNewLevelName("");
    setLevelModalProg(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Programme Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Create and maintain academic programmes, degree schemes, and year levels.
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
          <span>New Programme</span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-3 px-6">Code & Name</th>
              <th className="py-3 px-6">Description</th>
              <th className="py-3 px-6">Configured Levels</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {programmes.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                <td className="py-4 px-6 font-medium text-slate-900">
                  <div className="font-bold text-slate-900">{p.name}</div>
                  <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">
                    {p.code}
                  </div>
                </td>
                <td className="py-4 px-6 text-xs text-slate-500 max-w-xs truncate">
                  {p.description || "—"}
                </td>
                <td className="py-4 px-6">
                  <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                    {p.levels.map((lvl) => (
                      <span
                        key={lvl.id}
                        className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-medium border border-slate-200"
                        title={lvl.levelName}
                      >
                        {lvl.levelCode}
                      </span>
                    ))}
                    <button
                      onClick={() => setLevelModalProg(p)}
                      className="p-1 rounded-md text-blue-600 hover:bg-blue-50 text-xs"
                      title="Manage Levels"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
                <td className="py-4 px-6">
                  {p.isActive ? (
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
                    onClick={() => handleToggleStatus(p.id)}
                    disabled={loading}
                    className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
                  >
                    {p.isActive ? "Deactivate" : "Activate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Programme Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <h3 className="text-lg font-bold text-slate-900">
                New Academic Programme
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

            <form onSubmit={handleCreateProgramme} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Programme Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. BSC-CS, BBA-ACC"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 uppercase focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Programme Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. BSc Computer Science"
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
                  placeholder="Curriculum overview and objectives"
                  rows={3}
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="p-3 bg-blue-50 rounded-lg text-xs text-blue-700 border border-blue-100">
                ℹ️ Standard year levels (Level 100, 200, 300, 400) will be automatically created. You can customize them anytime.
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
                  {loading ? "Creating..." : "Create Programme"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Level Modal */}
      {levelModalProg && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Manage Levels: {levelModalProg.code}
                </h3>
                <p className="text-xs text-slate-500">
                  Add custom cohorts or postgraduate levels.
                </p>
              </div>
              <button
                onClick={() => setLevelModalProg(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddLevel} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Level Code
                </label>
                <input
                  type="text"
                  value={newLevelCode}
                  onChange={(e) => setNewLevelCode(e.target.value)}
                  placeholder="e.g. 500, MSc, PhD"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Level Title
                </label>
                <input
                  type="text"
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  placeholder="e.g. Level 500 / Postgrad"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setLevelModalProg(null)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-xs"
                >
                  {loading ? "Adding..." : "Add Level"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
