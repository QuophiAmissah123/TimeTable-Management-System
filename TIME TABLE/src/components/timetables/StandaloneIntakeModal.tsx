"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  FileUp,
  Download,
  CheckCircle2,
  X,
  FileSpreadsheet,
  AlertCircle,
  FileText,
  Clock,
  MapPin,
  User,
  BookOpen,
  Sparkles,
  Layers,
  Calendar,
  Radio,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { importStandaloneTimetableAction } from "@/app/actions/timetables";
import Link from "next/link";

interface AcademicPeriod {
  id: string;
  academicYear: string;
  semester: string;
  isCurrent: boolean;
}

interface StandaloneIntakeModalProps {
  periods: AcademicPeriod[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StandaloneIntakeModal({
  periods,
  isOpen,
  onClose,
  onSuccess,
}: StandaloneIntakeModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [selectedPeriodId, setSelectedPeriodId] = useState(
    periods.find((p) => p.isCurrent)?.id || periods[0]?.id || ""
  );
  const [defaultProgrammeName, setDefaultProgrammeName] = useState("");
  const [defaultLevelCode, setDefaultLevelCode] = useState("100");
  const [autoPublish, setAutoPublish] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    programmesCreated: string[];
    coursesCreated: string[];
    facilitatorsCreated: string[];
    timetablesCreated: Array<{
      timetableId: string;
      versionId: string;
      programmeName: string;
      programmeCode: string;
      levelName: string;
      levelCode: string;
      entriesCount: number;
      published: boolean;
    }>;
    errors: string[];
    published: boolean;
    academicPeriodName: string;
  } | null>(null);

  if (!isOpen) return null;

  const sampleCsvContent = `Programme,Level,Course Code,Course Name,Lead Facilitator,Day of Week,Start Time,End Time,Venue
BSc Computer Science,Level 100,CS101,Introduction to Programming,Dr. Kwame Mensah,MONDAY,08:30,10:30,LH 101
BSc Computer Science,Level 100,CS102,Data Structures & Algorithms,Prof. Ama Serwaa,TUESDAY,10:30,12:30,Computer Lab 1
BSc Computer Science,Level 100,MATH101,Calculus for Computer Science,Dr. K. Antwi,WEDNESDAY,13:00,15:00,Auditorium B
BSc Computer Science,Level 100,CS103,Computer Architecture,Ing. Michael Owusu,THURSDAY,08:30,10:30,LH 102
BSc Computer Science,Level 100,CS104,Database Fundamentals,Dr. Abena Kwarteng,FRIDAY,14:00,16:00,Computer Lab 2`;

  const downloadSampleTemplate = () => {
    const blob = new Blob([sampleCsvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "external_timetable_intake_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (selectedFile: File) => {
    setParseError(null);
    setResult(null);

    const ext = selectedFile.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "docx", "csv"].includes(ext || "")) {
      setParseError(
        "Unsupported file type. Please upload a Word document (.docx) or Excel spreadsheet (.xlsx, .xls, .csv)."
      );
      return;
    }

    setFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setParseError("Please select a Word or Excel timetable file to upload.");
      return;
    }

    setLoading(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (selectedPeriodId) {
        formData.append("academicPeriodId", selectedPeriodId);
      }
      if (defaultProgrammeName.trim()) {
        formData.append("defaultProgrammeName", defaultProgrammeName.trim());
      }
      if (defaultLevelCode.trim()) {
        formData.append("defaultLevelCode", defaultLevelCode.trim());
      }
      formData.append("autoPublish", autoPublish ? "true" : "false");

      const res = await importStandaloneTimetableAction(formData);

      if (!res.success) {
        setParseError(res.error || "Failed to intake timetable file.");
      } else {
        setResult(res as any);
        if (onSuccess) {
          onSuccess();
        }
      }
    } catch (err: any) {
      setParseError(err.message || "An unexpected error occurred during intake.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-slate-50 to-white">
          <div className="flex items-center space-x-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileUp className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                External Timetable Intake
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-semibold bg-emerald-100 text-emerald-800">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Auto-Setup
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Ingest Word (.docx) or Excel (.xlsx, .csv) documents to auto-create courses, facilitators, and timetable schedules.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Success Screen */}
          {result ? (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start space-x-3">
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold">
                    Timetable Intake & Schedule Setup Complete!
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Successfully ingested <strong>{result.imported}</strong> class sessions across{" "}
                    <strong>{result.timetablesCreated.length}</strong> academic cohort timetable(s) for{" "}
                    <strong>{result.academicPeriodName}</strong>.
                  </p>
                </div>
              </div>

              {/* Created Entities Overview */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-blue-600">{result.imported}</div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                    Sessions Added
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-indigo-600">
                    {result.programmesCreated.length}
                  </div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                    New Programmes
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-violet-600">
                    {result.coursesCreated.length}
                  </div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                    Courses Auto-Added
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <div className="text-2xl font-bold text-emerald-600">
                    {result.facilitatorsCreated.length}
                  </div>
                  <div className="text-2xs font-semibold uppercase tracking-wider text-slate-500 mt-0.5">
                    Lead Facilitators
                  </div>
                </div>
              </div>

              {/* Timetables Status */}
              <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Target Timetables & Status
                </div>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {result.timetablesCreated.map((t, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-slate-900">{t.programmeName}</span>
                        <span className="text-slate-500">({t.levelName})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-slate-600 font-mono text-2xs">
                          {t.entriesCount} classes
                        </span>
                        {t.published ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-emerald-100 text-emerald-700">
                            PUBLISHED (Live)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-2xs font-bold bg-amber-100 text-amber-700">
                            DRAFT
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Auto-Created Entities Badges */}
              {(result.programmesCreated.length > 0 ||
                result.coursesCreated.length > 0 ||
                result.facilitatorsCreated.length > 0) && (
                <div className="p-4 bg-blue-50/60 rounded-xl border border-blue-200 text-xs space-y-2">
                  <div className="font-bold text-blue-900">
                    Auto-Populated Institutional Entities:
                  </div>
                  {result.programmesCreated.length > 0 && (
                    <div className="text-blue-800">
                      <strong>Programmes:</strong> {result.programmesCreated.join(", ")}
                    </div>
                  )}
                  {result.coursesCreated.length > 0 && (
                    <div className="text-blue-800">
                      <strong>Courses:</strong> {result.coursesCreated.join(", ")}
                    </div>
                  )}
                  {result.facilitatorsCreated.length > 0 && (
                    <div className="text-blue-800">
                      <strong>Lead Facilitators:</strong> {result.facilitatorsCreated.join(", ")}
                    </div>
                  )}
                </div>
              )}

              {/* Skipped / Warnings */}
              {result.errors.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
                  <div className="font-semibold text-amber-950">
                    Skipped Rows / Conflicts ({result.skipped}):
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-2xs max-h-24 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Navigation Actions */}
              <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100">
                <Link
                  href="/admin/calendar"
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Calendar className="w-4 h-4" />
                  <span>View in Lecture Calendar</span>
                </Link>

                <Link
                  href="/admin/attendance"
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors"
                >
                  <Radio className="w-4 h-4" />
                  <span>Track Live Attendance</span>
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.refresh();
                  }}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          ) : (
            /* Upload & Intake Form */
            <form onSubmit={handleIntakeSubmit} className="space-y-5">
              {/* Error Alert */}
              {parseError && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex-1 font-medium">{parseError}</div>
                </div>
              )}

              {/* Academic Period Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Academic Period
                </label>
                <select
                  value={selectedPeriodId}
                  onChange={(e) => setSelectedPeriodId(e.target.value)}
                  className="w-full text-sm rounded-xl border border-slate-300 py-2.5 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  {periods.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.academicYear} — {p.semester} {p.isCurrent ? "★ Active Period" : ""}
                    </option>
                  ))}
                </select>
                <p className="text-2xs text-slate-500 mt-1">
                  The schedule entries will be registered for this academic period.
                </p>
              </div>

              {/* Drag & Drop File Zone */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Timetable Document File
                </label>
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-blue-500 bg-blue-50/70"
                      : file
                      ? "border-emerald-400 bg-emerald-50/40"
                      : "border-slate-300 hover:border-slate-400 bg-slate-50/50 hover:bg-slate-50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.docx,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleFileSelect(e.target.files[0]);
                      }
                    }}
                  />

                  {file ? (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                        {file.name.endsWith(".docx") ? (
                          <FileText className="w-6 h-6" />
                        ) : (
                          <FileSpreadsheet className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800">{file.name}</span>
                        <p className="text-xs text-slate-500">
                          {(file.size / 1024).toFixed(1)} KB — Ready to intake
                        </p>
                      </div>
                      <span className="inline-block text-xs text-blue-600 hover:underline font-semibold">
                        Click or drag another file to replace
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-full bg-blue-100/70 text-blue-600 flex items-center justify-center mx-auto">
                        <FileUp className="w-6 h-6" />
                      </div>
                      <div>
                        <span className="text-sm font-bold text-slate-800">
                          Click to browse or drag and drop timetable file
                        </span>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Accepts Microsoft Word (.docx), Excel (.xlsx, .xls), or CSV (.csv)
                        </p>
                      </div>
                      <div className="flex items-center justify-center gap-2 pt-1">
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-2xs rounded-md font-semibold">
                          .DOCX Word
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-2xs rounded-md font-semibold">
                          .XLSX Excel
                        </span>
                        <span className="px-2 py-0.5 bg-slate-200 text-slate-800 text-2xs rounded-md font-semibold">
                          .CSV
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Publish Toggle */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="autoPublish"
                  checked={autoPublish}
                  onChange={(e) => setAutoPublish(e.target.checked)}
                  className="mt-0.5 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
                />
                <label htmlFor="autoPublish" className="text-xs text-slate-700 cursor-pointer">
                  <span className="font-bold block text-slate-900">
                    Publish immediately for Lecture Calendar & Live Tracking
                  </span>
                  Imported timetable entries will be active right away so they appear on the calendar and allow starting live attendance sessions immediately.
                </label>
              </div>

              {/* Advanced / Optional Fallback Settings */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center justify-between w-full text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors py-1"
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Optional Fallbacks (if document rows omit Programme or Level)
                  </span>
                  {showAdvanced ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {showAdvanced && (
                  <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 mt-2 space-y-3 animate-in fade-in duration-150">
                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Default Programme Name (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. BSc Computer Science (auto-derived from file if blank)"
                        value={defaultProgrammeName}
                        onChange={(e) => setDefaultProgrammeName(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-2xs font-bold uppercase tracking-wider text-slate-600 mb-1">
                        Default Level Code (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 100, 200, 300, 400"
                        value={defaultLevelCode}
                        onChange={(e) => setDefaultLevelCode(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-300 py-2 px-3 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Template Download & Help */}
              <div className="flex items-center justify-between text-2xs text-slate-500 pt-2 border-t border-slate-100">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                  Missing programmes, courses & facilitators are auto-created.
                </span>
                <button
                  type="button"
                  onClick={downloadSampleTemplate}
                  className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 font-semibold"
                >
                  <Download className="w-3 h-3" />
                  <span>Download Sample Format</span>
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="inline-flex items-center space-x-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 transition-all disabled:opacity-50 disabled:pointer-events-none"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Ingesting & Setting Up Timetable...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Process & Ingest Timetable</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
