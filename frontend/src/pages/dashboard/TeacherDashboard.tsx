import { useQuery } from '@tanstack/react-query';
import { analyticsApi, studentsApi, attendanceApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { Users, BookOpen, CalendarCheck, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { Student } from '../../types';

export default function TeacherDashboard() {
  const navigate = useNavigate();

  const { data: students } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentsApi.list().then(r => r.data),
  });

  const { data: analytics } = useQuery({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.overview().then(r => r.data),
  });

  const { data: atRisk } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => analyticsApi.atRisk().then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="My Students" value={students?.length || 0} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard title="Avg Performance" value={`${analytics?.avgPerformance || 0}%`} icon={<BookOpen className="w-5 h-5" />} color="green" />
        <StatCard title="Attendance Today" value={analytics?.attendanceToday?.total ? `${Math.round((analytics.attendanceToday.present / analytics.attendanceToday.total) * 100)}%` : 'N/A'} icon={<CalendarCheck className="w-5 h-5" />} color="indigo" />
        <StatCard title="At-Risk Students" value={atRisk?.length || 0} icon={<AlertTriangle className="w-5 h-5" />} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Performance by Class</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={analytics?.performanceByClass || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="avg_score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">At-Risk Students</h3>
            <button onClick={() => navigate('/alerts')} className="text-xs text-primary-600 hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {!atRisk || atRisk.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No at-risk students currently</p>
            ) : (
              atRisk.slice(0, 6).map((s: { student_number: string; name: string; class_name: string; avg_score: number; absence_rate: number; active_warnings: number }) => (
                <div key={s.student_number} className="flex items-center justify-between p-2 rounded-lg bg-red-50 border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.class_name} • Avg: {s.avg_score ? `${Math.round(s.avg_score)}%` : 'N/A'}</p>
                  </div>
                  <div className="text-right">
                    {s.active_warnings > 0 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">{s.active_warnings} warning{s.active_warnings > 1 ? 's' : ''}</span>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800">Quick Navigation</h3>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigate('/grades')} className="btn-primary btn-sm">Record Grades</button>
          <button onClick={() => navigate('/attendance')} className="btn-secondary btn-sm">Mark Attendance</button>
          <button onClick={() => navigate('/students')} className="btn-secondary btn-sm">View Students</button>
          <button onClick={() => navigate('/wellbeing')} className="btn-secondary btn-sm">Behaviour Records</button>
          <button onClick={() => navigate('/messages')} className="btn-secondary btn-sm">Messages</button>
        </div>
      </div>
    </div>
  );
}
