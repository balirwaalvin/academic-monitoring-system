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
- Platform: Appwrite (Auth, Databases, Functions-ready service layer)
- Hosting: Appwrite Sites

Local development flow:

1. Frontend runs on http://localhost:5173
2. Frontend connects directly to Appwrite using SDK
3. Data and auth are handled by Appwrite services

## Repository Structure

```text
.
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

### 3) Configure Appwrite environment

Copy frontend/.env.example to frontend/.env and set:

```env
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=your_database_id
```

Collection env values are optional when your Appwrite collection IDs match defaults in frontend/src/services/appwrite.ts.

### 4) Run frontend

From the repository root:

```bash
npm run dev
```

This starts frontend on http://localhost:5173 and uses Appwrite directly.

## Available Scripts

From repository root:

- npm run dev: Start Appwrite-first frontend
- npm run dev:frontend: Start frontend only
- npm run dev:backend: Start legacy backend only
- npm run dev:legacy: Start frontend + legacy backend together

From frontend/:

- npm run dev: Start Vite development server
- npm run build: Type-check and build production bundle
- npm run preview: Preview production build

From backend/ (legacy mode only):

- npm run dev: Start API with nodemon
- npm start: Start API with node

## Default Demo Login

The seed creates sample users with password:

- password123

Example accounts:

- Admin: admin@brevian.ac.ug
- Teacher: sarah.namaganda@brevian.ac.ug
- Counselor: counselor@brevian.ac.ug
- Parent: james.mugisha@gmail.com
- Student: emma.namukasa@brevian.ac.ug

## Appwrite Collections

The frontend service expects these collections by default:

- users
- students
- classes
- subjects
- grades
- attendance
- fees
- fee_payments
- wellbeing_reports
- behavior_records
- messages
- announcements
- notifications
- alerts
- events

If your IDs differ, set the corresponding VITE_APPWRITE_COLLECTION_* values in frontend/.env.

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

If 5173 is already in use:

- stop the existing process
- or run Vite with a different port

## Appwrite Sites Deployment

1. Push this repository to GitHub.
2. In Appwrite Console, create a Site and connect your repository.
3. Set build settings:
- Root directory: frontend
- Install command: npm install
- Build command: npm run build
- Output directory: dist
4. Add Site environment variables from frontend/.env.example.
5. Deploy and assign your custom domain.

For Appwrite Auth to work in browser:

- Add your Site domain to Appwrite platform settings.
- Configure session/cookie domain according to your deployment domain.

## Restore Role Logins (Appwrite)

If login fails because Appwrite Auth users were not created yet, run the bootstrap script once.

1. Create backend/.env with:

```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_COLLECTION_USERS=users
APPWRITE_COLLECTION_STUDENTS=students
APPWRITE_BOOTSTRAP_PASSWORD=password123
```

2. Install backend dependencies:

```bash
npm --prefix backend install
```

3. Run bootstrap:

```bash
npm --prefix backend run bootstrap:appwrite-users
```

The script:

- restores Admin, Teacher, Counselor, Parent accounts
- resets their password to APPWRITE_BOOTSTRAP_PASSWORD
- removes the Student account and student user docs

## Auto Create Appwrite Schema

To avoid creating collections manually in Appwrite Console, run schema provisioning from code.

1. Create backend/.env with:

```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_API_KEY=your_server_api_key
APPWRITE_DATABASE_ID=your_database_id
APPWRITE_DATABASE_NAME=swam_mis

APPWRITE_COLLECTION_USERS=users
APPWRITE_COLLECTION_STUDENTS=students
APPWRITE_COLLECTION_CLASSES=classes
APPWRITE_COLLECTION_SUBJECTS=subjects
APPWRITE_COLLECTION_GRADES=grades
APPWRITE_COLLECTION_ATTENDANCE=attendance
APPWRITE_COLLECTION_FEES=fees
APPWRITE_COLLECTION_FEE_PAYMENTS=fee_payments
APPWRITE_COLLECTION_WELLBEING=wellbeing_reports
APPWRITE_COLLECTION_BEHAVIOR=behavior_records
APPWRITE_COLLECTION_MESSAGES=messages
APPWRITE_COLLECTION_ANNOUNCEMENTS=announcements
APPWRITE_COLLECTION_NOTIFICATIONS=notifications
APPWRITE_COLLECTION_ALERTS=alerts
APPWRITE_COLLECTION_EVENTS=events
```

2. Run:

```bash
npm --prefix backend install
npm --prefix backend run provision:appwrite-schema
```

This command creates the Appwrite database, all required collections, and all core attributes used by the frontend.

## License

No license file is currently included.
If this project is to be shared publicly, add a LICENSE file with your preferred terms.
