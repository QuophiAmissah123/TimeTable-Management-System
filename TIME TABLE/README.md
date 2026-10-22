# College Academic Timetable System

A production-ready, full-stack Academic Timetable Management and Publishing portal built with **Next.js 16 (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM** (SQLite / PostgreSQL ready).

---

## 🚀 Quick Start (Easiest Way on Windows)

### Option 1: One-Click Launcher (No PowerShell errors)
Simply **double-click** the file:
```
run.bat
```
This launcher automatically:
- Checks the database and Prisma client
- Automatically opens your web browser to `http://localhost:3000`
- Runs the server bypassing any Windows PowerShell script execution policy blocks (`npm.ps1`)

---

### Option 2: Running via Terminal / Command Prompt

If you are using **PowerShell** on Windows and see `npm.ps1 cannot be loaded because running scripts is disabled on this system`:
Use `npm.cmd` instead of `npm`, or run:

```powershell
# Using cmd wrapper:
npm.cmd run dev

# Or set PowerShell execution policy for current process:
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
npm run dev
```

The portal will be running at:
- **Public Schedule Viewer**: [http://localhost:3000/timetables](http://localhost:3000/timetables)
- **Administrator Login**: [http://localhost:3000/login](http://localhost:3000/login)
- **Home Landing Page**: [http://localhost:3000](http://localhost:3000)

---

## 🔑 Default Login Credentials

| Role | Email | Password | Access |
| :--- | :--- | :--- | :--- |
| **System Administrator** | `admin@university.edu` | `Admin123!` | Full control: create, edit, validate, publish timetables, manage entities |
| **Academic Viewer** | `viewer@university.edu` | `Viewer123!` | Read-only viewing and verified schedule exports |

---

## 🛠 Features & Architecture

### 1. Hard Conflict Detection Engine (`src/lib/conflict/conflict-engine.ts`)
- **Facilitator Double-Booking**: Prevents an instructor from being assigned to multiple sessions simultaneously.
- **Venue Collision**: Prevents two courses from occupying the same hall or lab at the same time.
- **Programme/Cohort Overlap**: Prevents students in the same programme and level from having concurrent lectures.
- **Adjacent Sessions Allowed**: Back-to-back classes (e.g. 08:00–10:00 and 10:00–12:00) are recognized as non-conflicting.

### 2. Immutable Timetable Versioning
- **Draft Status**: Editable timetable workspace with live collision warnings.
- **Validated Status**: Confirmed conflict-free state.
- **Published Status**: Frozen, public-facing official schedule.
- **Branching Draft Revisions**: Any updates to an existing published timetable automatically branch into a new version draft (e.g., Version 2), ensuring zero disruption to viewers until explicitly republished.

### 3. Student & Public Timetable Viewer (`/timetables`)
- **Filterable by**: Academic Period, Programme (e.g. BSc Computer Science, BSc IT, BBA Accounting), and Cohort Level (100, 200, 300, 400).
- **View Modes**:
  - Interactive **Weekly Schedule Grid** (time-slot matrix from 07:00 to 20:00)
  - Detailed **Day-by-Day Agenda List**
- **Print & PDF Support**: Tailored CSS for clean A4 landscape physical printing and digital PDF generation (`window.print()`).

### 4. Administrator Studio (`/admin/timetables/[id]`)
- Interactive scheduling modal with real-time feedback.
- Quick session add/edit/delete with instant conflict prevention.
- Version history audit trail with publisher attribution.

### 5. Academic Domain Management
- **Academic Periods**: Academic year (e.g., `2025/2026`) and Semester (`Semester 1`, `Semester 2`), with active period flag.
- **Programmes & Levels**: Multi-year degree pathways (Level 100 to 400).
- **Courses**: Code, course title, and credit hours.
- **Facilitators**: Name, department, email, and contact info.

---

## 🧪 Automated Testing

Run the automated test suite covering conflict intervals and validation logic:

```bash
# Double-click:
run-tests.bat

# Or in terminal:
npm.cmd test
```

All 14 unit tests verify:
- Time string conversions and mathematical overlap intervals
- Exact overlaps, partial overlaps, and nested intervals
- Back-to-back classes non-conflict rules
- Zod schema validation rules (minimum duration, time sequence)

---

## 🗄 Database Management

- **Reset/Reseed Demo Data**: Double click `reseed-database.bat` or run:
  ```bash
  npm.cmd run db:seed
  ```
- **Sync Schema**:
  ```bash
  npm.cmd run db:push
  ```
