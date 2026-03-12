import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import clsx from 'clsx';
import {
  LayoutDashboard, Users, BookOpen, CalendarCheck, CreditCard,
  Heart, MessageSquare, Megaphone, BarChart3, AlertTriangle,
  Calendar, LogOut, GraduationCap, Settings, ShieldAlert
} from 'lucide-react';
import type { Role } from '../../types';

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
  roles: Role[];
}

const navItems: NavItem[] = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin', 'teacher', 'parent', 'student', 'counselor'] },
  { to: '/students', label: 'Students', icon: Users, roles: ['admin', 'teacher', 'counselor'] },
  { to: '/grades', label: 'Academic Grades', icon: BookOpen, roles: ['admin', 'teacher', 'parent', 'student'] },
  { to: '/attendance', label: 'Attendance', icon: CalendarCheck, roles: ['admin', 'teacher', 'parent', 'student'] },
  { to: '/fees', label: 'Fee Management', icon: CreditCard, roles: ['admin', 'parent', 'student'] },
  { to: '/wellbeing', label: 'Wellbeing', icon: Heart, roles: ['admin', 'counselor', 'teacher', 'parent'] },
  { to: '/messages', label: 'Messages', icon: MessageSquare, roles: ['admin', 'teacher', 'parent', 'student', 'counselor'] },
  { to: '/announcements', label: 'Announcements', icon: Megaphone, roles: ['admin', 'teacher', 'parent', 'student', 'counselor'] },
  { to: '/analytics', label: 'Analytics', icon: BarChart3, roles: ['admin', 'teacher', 'counselor'] },
  { to: '/alerts', label: 'Early Warnings', icon: ShieldAlert, roles: ['admin', 'teacher', 'counselor', 'parent'] },
  { to: '/calendar', label: 'Calendar', icon: Calendar, roles: ['admin', 'teacher', 'parent', 'student', 'counselor'] },
];

const roleColors: Record<Role, string> = {
  admin: 'bg-purple-100 text-purple-700',
  teacher: 'bg-blue-100 text-blue-700',
  parent: 'bg-green-100 text-green-700',
  student: 'bg-amber-100 text-amber-700',
  counselor: 'bg-rose-100 text-rose-700',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-slate-900 flex flex-col min-h-screen fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight">SWAM-MIS</h1>
            <p className="text-slate-400 text-xs">Greenfield Academy</p>
          </div>
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-slate-700 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-slate-300 text-sm font-semibold">
              {user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <span className={clsx('text-xs px-1.5 py-0.5 rounded font-medium capitalize', roleColors[user.role])}>
              {user.role}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-0.5">
          {navItems
            .filter(item => item.roles.includes(user.role))
            .map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors duration-150',
                    isActive
                      ? 'bg-primary-600 text-white font-medium'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  )
                }
              >
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span>{label}</span>
              </NavLink>
            ))}
        </div>
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-slate-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
