"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Search, X, AlertTriangle, Mail, Phone } from "lucide-react";
import {
  createFacilitatorAction,
  toggleFacilitatorStatusAction,
} from "@/app/actions/facilitators";

interface Facilitator {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  department?: string | null;
  isActive: boolean;
  _count?: { entries: number };
}

export function FacilitatorsManager({
  facilitators,
}: {
  facilitators: Facilitator[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");

  const filtered = facilitators.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.department && f.department.toLowerCase().includes(search.toLowerCase()))
  );

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("name", name);
    if (email) formData.append("email", email);
    if (phone) formData.append("phone", phone);
    if (department) formData.append("department", department);

    const res = await createFacilitatorAction(formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Failed to create facilitator");
      return;
    }

    setName("");
    setEmail("");
    setPhone("");
    setDepartment("");
    setIsModalOpen(false);
    router.refresh();
  }

  async function handleToggleStatus(id: string) {
    setLoading(true);
    const res = await toggleFacilitatorStatusAction(id);
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
            Facilitator Management
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Maintain academic teaching staff, contact details, and department affiliations.
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
          <span>New Facilitator</span>
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by lecturer name or department..."
          className="w-full text-sm rounded-lg border border-slate-300 py-2.5 pl-10 pr-4 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-xs"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <th className="py-3 px-6">Facilitator Name</th>
              <th className="py-3 px-6">Department</th>
              <th className="py-3 px-6">Contact Info</th>
              <th className="py-3 px-6">Scheduled Classes</th>
              <th className="py-3 px-6">Status</th>
              <th className="py-3 px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-xs text-slate-400">
                  No facilitators found matching your query.
                </td>
              </tr>
            ) : (
              filtered.map((f) => (
                <tr key={f.id} className="hover:bg-slate-50/70 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">
                    {f.name}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600">
                    {f.department || "General Faculty"}
                  </td>
                  <td className="py-4 px-6 text-xs text-slate-600">
                    {f.email && (
                      <div className="flex items-center space-x-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        <span>{f.email}</span>
                      </div>
                    )}
                    {f.phone && (
                      <div className="flex items-center space-x-1.5 mt-0.5 text-slate-500">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        <span>{f.phone}</span>
                      </div>
                    )}
                    {!f.email && !f.phone && "—"}
                  </td>
                  <td className="py-4 px-6 font-semibold text-slate-700">
                    {f._count?.entries || 0}
                  </td>
                  <td className="py-4 px-6">
                    {f.isActive ? (
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
                      onClick={() => handleToggleStatus(f.id)}
                      disabled={loading}
                      className="text-xs font-semibold text-slate-600 hover:text-slate-900 hover:underline disabled:opacity-50"
                    >
                      {f.isActive ? "Deactivate" : "Activate"}
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
              <h3 className="text-lg font-bold text-slate-900">
                New Facilitator / Lecturer
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
                  Full Name with Title
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Kwame Mensah, Prof. Sarah Appiah"
                  required
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science, Mathematics, Languages"
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. lecturer@university.edu"
                  className="w-full text-sm rounded-lg border border-slate-300 py-2 px-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Phone Number (Optional)
                </label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +233 24 123 4567"
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
                  {loading ? "Saving..." : "Add Facilitator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
