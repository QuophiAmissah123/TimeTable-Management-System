import Link from "next/link";
import { Clock, ShieldCheck, ArrowRight, CalendarDays, Users, BookOpen } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col justify-between font-sans">
      {/* Navbar */}
      <header className="border-b border-slate-800 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight leading-tight">
                Academic Timetable System
              </h1>
              <p className="text-xs text-slate-400">Institutional Scheduling Portal</p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link
              href="/timetables"
              className="text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              Public Schedule
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/30 transition-all"
            >
              <span>Admin Portal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-20 text-center space-y-8">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-blue-950/80 border border-blue-800 text-blue-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-blue-400" />
          <span>Official University Timetable Management</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Precision Academic Scheduling & Timetable Publishing
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Manage courses, cohort year levels, faculty facilitators, and lecture venues with hard server-enforced conflict detection and immutable version snapshots.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/timetables"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <CalendarDays className="w-4 h-4" />
            <span>View Public Timetables</span>
          </Link>
          <Link
            href="/login"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-sm transition-all flex items-center justify-center space-x-2"
          >
            <span>Administrator Login</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-16 text-left">
          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4">
              <CalendarDays className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Conflict Engine</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mathematical overlap detection prevents lecturer double-booking, cohort collisions, and venue clashes.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Immutable Versioning</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Published schedules are frozen. Modifications automatically branch into new version drafts.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-800/60 border border-slate-800 space-y-2">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center mb-4">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-white">Print & PDF Ready</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Formatted for crisp A4 landscape printing and mobile-responsive day-by-day views.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        College Academic Timetable System &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
}
