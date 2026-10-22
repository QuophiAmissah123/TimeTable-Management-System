"use client";

import { useState, useRef } from "react";
import {
  FileUp,
  Download,
  AlertTriangle,
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
} from "lucide-react";
import { importTimetableUniversalFileAction } from "@/app/actions/timetables";

interface CsvImportModalProps {
  versionId: string;
  versionNumber: number;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export function CsvImportModal({
  versionId,
  versionNumber,
  onClose,
  onSuccess,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{
    imported: number;
    skipped: number;
    programmesCreated: string[];
    coursesCreated: string[];
    facilitatorsCreated: string[];
    errors: string[];
  } | null>(null);

  const sampleCsvContent = `Programme,Level,Course Code,Course Name,Facilitator Name,Day of Week,Start Time,End Time,Venue
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
    link.setAttribute("download", `timetable_import_template.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (selectedFile: File) => {
    setParseError(null);
    setImportResult(null);

    const ext = selectedFile.name.toLowerCase().split(".").pop();
    if (!["xlsx", "xls", "docx", "csv"].includes(ext || "")) {
      setParseError(
        "Unsupported file type. Please upload a Word document (.docx) or an Excel spreadsheet (.xlsx, .xls, .csv)."
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

  const handleImport = async () => {
    if (!file) return;

    setLoading(true);
    setParseError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await importTimetableUniversalFileAction(versionId, formData);
      setLoading(false);

      if (!res.success) {
        setParseError(res.error || "Failed to process external timetable document.");
        return;
      }

      setImportResult({
        imported: res.imported || 0,
        skipped: res.skipped || 0,
        programmesCreated: res.programmesCreated || [],
        coursesCreated: res.coursesCreated || [],
        facilitatorsCreated: res.facilitatorsCreated || [],
        errors: res.errors || [],
      });

      if ((res.imported || 0) > 0) {
        onSuccess(
          `Document intake successful: ${res.imported} class sessions scheduled in Version v${versionNumber}.`
        );
      }
    } catch (err: any) {
      setLoading(false);
      setParseError(err.message || "An unexpected error occurred during document intake.");
    }
  };

  const isWord = file?.name.toLowerCase().endsWith(".docx");
  const isExcel =
    file?.name.toLowerCase().endsWith(".xlsx") ||
    file?.name.toLowerCase().endsWith(".xls") ||
    file?.name.toLowerCase().endsWith(".csv");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <FileSpreadsheet className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-white leading-tight">
                Intake External Timetable (Word / Excel)
              </h3>
              <p className="text-xs text-blue-200">
                Upload official Word (.docx) or Excel (.xlsx, .csv) timetable documents
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* File Format Guidance & Auto-Population Notice */}
          <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 space-y-2">
            <div className="flex items-center space-x-2 font-bold text-blue-900">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Smart Intake & Auto-Population Engine</span>
            </div>
            <p className="text-slate-600 leading-relaxed">
              Upload an external timetable directly from the academic board. The system will automatically:
            </p>
            <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium pl-1">
              <li>Record the official <strong>Lead Facilitator</strong> from the document.</li>
              <li>Auto-create new <strong>Programmes</strong>, <strong>Courses</strong>, and <strong>Facilitators</strong> if they do not exist yet.</li>
              <li>Detect scheduling clashes (room conflicts & lecturer double-bookings) before adding.</li>
            </ul>
          </div>

          {/* Drag & Drop Upload Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
                : file
                ? "border-emerald-300 bg-emerald-50/20"
                : "border-slate-300 hover:border-blue-400 bg-slate-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.docx,.csv"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelect(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="flex flex-col items-center space-y-2">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  file
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-blue-100 text-blue-600"
                }`}
              >
                {isWord ? (
                  <FileText className="w-6 h-6" />
                ) : (
                  <FileSpreadsheet className="w-6 h-6" />
                )}
              </div>

              {file ? (
                <div>
                  <p className="text-sm font-bold text-slate-800">{file.name}</p>
                  <p className="text-xs text-slate-500">
                    {(file.size / 1024).toFixed(1)} KB &bull; Click or drag to replace
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Drop your Word (.docx) or Excel (.xlsx, .csv) file here
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    or click to browse from your computer
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Parse or Conflict Errors */}
          {parseError && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Document Error: </span>
                <p className="leading-relaxed">{parseError}</p>
              </div>
            </div>
          )}

          {/* Import Results Summary */}
          {importResult && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-slate-900">
                    Intake Completed
                  </span>
                </div>
                <span className="text-emerald-700 font-bold bg-emerald-100 px-2.5 py-0.5 rounded-full">
                  {importResult.imported} Sessions Scheduled
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-1">
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[11px] text-slate-500">Programmes Created</span>
                  <span className="font-extrabold text-slate-800">
                    {importResult.programmesCreated.length}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[11px] text-slate-500">Courses Created</span>
                  <span className="font-extrabold text-slate-800">
                    {importResult.coursesCreated.length}
                  </span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-slate-200">
                  <span className="block text-[11px] text-slate-500">Facilitators Created</span>
                  <span className="font-extrabold text-slate-800">
                    {importResult.facilitatorsCreated.length}
                  </span>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-amber-900 text-[11px] space-y-1 max-h-32 overflow-y-auto">
                  <span className="font-bold block">
                    Skipped Entries ({importResult.skipped}):
                  </span>
                  {importResult.errors.map((err, idx) => (
                    <p key={idx}>&bull; {err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Template Download Option */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={downloadSampleTemplate}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center space-x-1 hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Reference Template (CSV)</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            disabled={!file || loading}
            onClick={handleImport}
            className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all flex items-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processing Document...</span>
              </>
            ) : (
              <>
                <FileUp className="w-4 h-4" />
                <span>Process & Ingest Timetable</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// Export alias for universal compatibility
export const TimetableFileImportModal = CsvImportModal;
