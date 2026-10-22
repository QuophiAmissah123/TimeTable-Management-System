"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CalendarDays,
  UserCheck,
  GraduationCap,
  BookOpen,
  Users,
  CalendarRange,
  Globe,
  LogOut,
  Clock,
  Calendar,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Timetable Intake", href: "/admin/timetables", icon: CalendarDays },
  { label: "Lecture Calendar", href: "/admin/calendar", icon: Calendar },
  { label: "Class Attendance", href: "/admin/attendance", icon: UserCheck },
  { label: "Programmes", href: "/admin/programmes", icon: GraduationCap },
  { label: "Courses", href: "/admin/courses", icon: BookOpen },
  { label: "Facilitators", href: "/admin/facilitators", icon: Users },
  { label: "Academic Periods", href: "/admin/academic-periods", icon: CalendarRange },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 border-r border-slate-800">
      {/* Institution / Brand Header */}
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
          <Clock className="w-6 h-6" />
        </div>
        <div>
          <h1 className="font-bold text-base tracking-tight leading-tight text-white">
            Academic Timetable
          </h1>
          <p className="text-xs text-slate-400">Institutional Portal</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-4 space-y-1.5 overflow-y-auto custom-scrollbar">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Management
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-6 px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Public Access
        </div>
        <Link
          href="/timetables"
          target="_blank"
          className="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-slate-800 hover:text-emerald-300 transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>Public Viewer Portal</span>
        </Link>
      </nav>

      {/* Logout Footer */}
      <div className="p-4 border-t border-slate-800">
        <form action={async () => { await logoutAction(); }}>
          <button
            type="submit"
            className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
