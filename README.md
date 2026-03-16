# Academic Monitoring System

A full-stack Student Well-Being and Academic Monitoring Information System (SWAM-MIS) for schools.

This project provides role-based dashboards and workflows for administrators, teachers, counselors, parents, and students. It combines academic performance, attendance, wellbeing tracking, fees, communication, and early warning insights in one platform.

## Highlights

- Role-based authentication and authorization (admin, teacher, counselor, parent, student)
- Student lifecycle management (profiles, class assignment, status)
- Academic tracking (subjects, grades, term-level performance)
- Attendance recording with analytics-ready data
- Fee management and payment records
- Wellbeing and behavior reporting for student support teams
- Notifications, announcements, and messaging
- Early warning and at-risk insights
- Seeded demo data for quick local evaluation

## System Architecture

- Frontend: React + TypeScript + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite (auto-created and seeded on first run)
- Auth: JWT-based API authentication

Local development flow:

1. Frontend runs on http://localhost:5173
2. Backend runs on http://localhost:5000
3. Frontend proxies /api requests to backend via Vite dev proxy

## Repository Structure

```text
.
|-- backend/
|   |-- src/
|   |   |-- database/
|   |   |-- middleware/
|   |   `-- routes/
|   `-- package.json
|-- frontend/
|   |-- src/
|   |   |-- components/
|   |   |-- contexts/
|   |   |-- pages/
|   |   |-- services/
|   |   `-- types/
|   `-- package.json
`-- package.json
```

## Prerequisites

- Node.js 18+ (recommended)
- npm 9+ (recommended)
- Git

## Quick Start

### 1) Clone and enter the project

```bash
git clone https://github.com/balirwaalvin/academic-monitoring-system.git
cd academic-monitoring-system
```

### 2) Install dependencies

Install root dependencies (for one-command startup):

```bash
npm install
```

Install application dependencies:

```bash
npm --prefix frontend install
npm --prefix backend install
```

### 3) Configure environment

Create a .env file inside backend/ with the following values:

```env
PORT=5000
JWT_SECRET=replace_with_a_strong_secret
JWT_EXPIRES_IN=7d
DB_PATH=./school.db
```

Notes:

- If DB_PATH is relative, it resolves from the backend process working directory.
- On first run, the backend creates schema and seed data automatically.

### 4) Run both servers with one command

From the repository root:

```bash
npm run dev
```

This command starts:

- Frontend on http://localhost:5173
- Backend on http://localhost:5000

## Available Scripts

From repository root:

- npm run dev: Start frontend and backend concurrently
- npm run dev:frontend: Start frontend only
- npm run dev:backend: Start backend only

From frontend/:

- npm run dev: Start Vite development server
- npm run build: Type-check and build production bundle
- npm run preview: Preview production build

From backend/:

- npm run dev: Start API with nodemon
- npm start: Start API with node

## Default Demo Login

The seed creates sample users with password:

- password123

Example accounts:

- Admin: admin@school.edu
- Teacher: sarah.namaganda@school.edu
- Counselor: counselor@school.edu
- Parent: james.mugisha@gmail.com
- Student: emma.namukasa@student.edu

## API Health Check

- http://localhost:5000/api/health

Expected response includes:

- status
- system
- version
- timestamp

## Security Notes

- Change JWT_SECRET before any shared deployment
- Rotate all seeded credentials in non-local environments
- Restrict CORS origins for deployed frontend domains

## Troubleshooting

### PowerShell blocks npm (Windows)

If you see an error related to npm.ps1 and execution policy:

- Use this command as a quick workaround:

```powershell
npm.cmd run dev
```

- Or allow local script execution for your user profile:

```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

Then reopen the terminal and retry.

### Port conflict

If 5173 or 5000 is already in use:

- stop the existing process
- or change PORT in backend/.env
- and update frontend Vite proxy target if backend port changes

## Deployment Guidance

This repository is currently optimized for local development and demo workflows.

For production, recommended next steps:

- move secrets to managed environment variables
- replace SQLite with managed Postgres/MySQL for multi-user scale
- add API request validation and rate limiting
- add CI checks (lint, test, build)
- serve frontend static assets behind a reverse proxy

## License

No license file is currently included.
If this project is to be shared publicly, add a LICENSE file with your preferred terms.
