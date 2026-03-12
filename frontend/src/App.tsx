import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import AdminDashboard from './pages/dashboard/AdminDashboard';
import TeacherDashboard from './pages/dashboard/TeacherDashboard';
import ParentDashboard from './pages/dashboard/ParentDashboard';
import StudentDashboard from './pages/dashboard/StudentDashboard';
import CounselorDashboard from './pages/dashboard/CounselorDashboard';
import StudentsPage from './pages/students/StudentsPage';
import StudentProfile from './pages/students/StudentProfile';
import GradesPage from './pages/grades/GradesPage';
import AttendancePage from './pages/attendance/AttendancePage';
import FeesPage from './pages/fees/FeesPage';
import WellbeingPage from './pages/wellbeing/WellbeingPage';
import MessagesPage from './pages/messages/MessagesPage';
import AnnouncementsPage from './pages/announcements/AnnouncementsPage';
import AnalyticsPage from './pages/analytics/AnalyticsPage';
import AlertsPage from './pages/alerts/AlertsPage';
import CalendarPage from './pages/calendar/CalendarPage';

function DashboardRouter() {
  const { user } = useAuth();
  if (!user) return null;
  switch (user.role) {
    case 'admin': return <AdminDashboard />;
    case 'teacher': return <TeacherDashboard />;
    case 'parent': return <ParentDashboard />;
    case 'student': return <StudentDashboard />;
    case 'counselor': return <CounselorDashboard />;
    default: return <Navigate to="/login" />;
  }
}

function ProtectedRoutes() {
  const { user, isLoading } = useAuth();
  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-slate-500 text-sm">Loading SWAM-MIS...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardRouter />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/grades" element={<GradesPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/fees" element={<FeesPage />} />
        <Route path="/wellbeing" element={<WellbeingPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/analytics" element={<AnalyticsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginGuard />} />
          <Route path="/*" element={<ProtectedRoutes />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

function LoginGuard() {
  const { user, isLoading } = useAuth();
  if (isLoading) return null;
  if (user) return <Navigate to="/" replace />;
  return <Login />;
}
