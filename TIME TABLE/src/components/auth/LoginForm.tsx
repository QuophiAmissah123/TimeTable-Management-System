"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginAction } from "@/app/actions/auth";
import { Clock, Lock, Mail, AlertTriangle, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@university.edu");
  const [password, setPassword] = useState("Admin123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("email", email);
    formData.append("password", password);

    const res = await loginAction(null, formData);
    setLoading(false);

    if (!res.success) {
      setError(res.error || "Authentication failed");
      return;
    }

    router.push("/admin");
    router.refresh();
  }

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center mx-auto mb-3 shadow-lg shadow-blue-500/20">
          <Clock className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
          Administrator Sign In
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Sign in to create, validate, and publish academic timetables.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Email Address
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
            Password
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full text-sm rounded-lg border border-slate-300 py-2.5 pl-10 pr-3 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shadow-md shadow-blue-500/20 transition-all flex items-center justify-center space-x-2 disabled:opacity-50 mt-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Portal</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      {/* Development Quick Credentials */}
      <div className="mt-6 pt-5 border-t border-slate-100 bg-slate-50 p-3.5 rounded-xl text-xs text-slate-600">
        <p className="font-semibold text-slate-800 mb-1">Default Seed Credentials:</p>
        <p className="font-mono text-[11px] text-slate-600">
          admin@university.edu / Admin123!
        </p>
      </div>

      <div className="mt-4 text-center">
        <Link
          href="/timetables"
          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
        >
          &larr; Return to Public Timetable Viewer
        </Link>
      </div>
    </div>
  );
}
