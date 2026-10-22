import { prisma } from "@/lib/db/prisma";
import { getCurrentUser } from "@/lib/auth/session";
import { Calendar, UserCircle } from "lucide-react";

export async function AdminHeader() {
  const [currentUser, currentPeriod] = await Promise.all([
    getCurrentUser(),
    prisma.academicPeriod.findFirst({
      where: { isCurrent: true },
    }),
  ]);

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between shrink-0 shadow-xs">
      {/* Active Academic Period Badge */}
      <div className="flex items-center space-x-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Academic Session:
        </span>
        {currentPeriod ? (
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>
              {currentPeriod.academicYear} — {currentPeriod.semester}
            </span>
          </div>
        ) : (
          <div className="inline-flex items-center px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200 text-xs">
            No Active Academic Period Configured
          </div>
        )}
      </div>

      {/* User Information */}
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 text-right">
          <div>
            <p className="text-sm font-semibold text-slate-800 leading-none">
              {currentUser?.fullName || "Administrator"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">{currentUser?.email || "admin@university.edu"}</p>
          </div>
          <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
            <UserCircle className="w-6 h-6 text-blue-600" />
          </div>
        </div>
      </div>
    </header>
  );
}
