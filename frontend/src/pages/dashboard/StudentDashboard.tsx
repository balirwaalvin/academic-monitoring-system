import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { gradesApi, attendanceApi, feesApi, announcementsApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { BookOpen, CalendarCheck, CreditCard, Megaphone } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { GradeBadge } from '../../components/common/Badge';
import type { GradeSummary, AttendanceStats, Announcement } from '../../types';
import type { StudentProfile } from '../../types';

export default function StudentDashboard() {
  const { profile } = useAuth();
  const studentProfile = profile as StudentProfile | null;
  const studentId = studentProfile?.id;

  const { data: gradeSummary } = useQuery<GradeSummary[]>({
    queryKey: ['grade-summary', studentId],
    queryFn: () => gradesApi.summary(studentId!).then(r => r.data),
    enabled: !!studentId,
  });

  const { data: attStats } = useQuery<AttendanceStats>({
    queryKey: ['att-stats', studentId],
    queryFn: () => attendanceApi.stats(studentId!).then(r => r.data),
    enabled: !!studentId,
  });

  const { data: fees } = useQuery({
    queryKey: ['fees'],
    queryFn: () => feesApi.list().then(r => r.data),
  });

  const { data: announcements } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => announcementsApi.list().then(r => r.data),
  });

  const overallAvg = gradeSummary?.length
    ? Math.round(gradeSummary.reduce((s, g) => s + g.overall_avg, 0) / gradeSummary.length)
    : 0;

  const attRate = attStats?.overall?.total_days
    ? Math.round((attStats.overall.present / attStats.overall.total_days) * 100)
    : 0;

  const radarData = gradeSummary?.map(g => ({
    subject: g.subject.split(' ')[0],
    score: Math.round(g.overall_avg || 0),
  })) || [];

  return (
    <div className="space-y-6">
      {studentProfile && (
        <div className="card p-4 bg-gradient-to-r from-primary-600 to-indigo-600 text-white">
          <p className="text-primary-100 text-xs font-medium uppercase tracking-wide">Welcome back</p>
          <p className="text-xl font-bold mt-0.5">{useAuth().user?.name}</p>
          <div className="flex gap-4 mt-2 text-sm text-primary-200">
            <span>Class: {studentProfile.class_name}</span>
            <span>ID: {studentProfile.student_number}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overall Average" value={`${overallAvg}%`} icon={<BookOpen className="w-5 h-5" />} color="blue" />
        <StatCard title="Attendance Rate" value={`${attRate}%`} icon={<CalendarCheck className="w-5 h-5" />} color="green" />
        <StatCard title="Days Present" value={attStats?.overall?.present || 0} icon={<CalendarCheck className="w-5 h-5" />} color="indigo" />
        <StatCard title="Days Absent" value={attStats?.overall?.absent || 0} icon={<CalendarCheck className="w-5 h-5" />} color={attStats?.overall?.absent && attStats.overall.absent > 5 ? 'red' : 'amber'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Subject Performance */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">My Subjects</h3>
          <div className="space-y-2">
            {gradeSummary?.map(g => (
              <div key={g.subject} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                <div>
                  <p className="text-sm font-medium text-slate-700">{g.subject}</p>
                  <p className="text-xs text-slate-500">Highest: {g.highest}% • Lowest: {g.lowest}%</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-800">{Math.round(g.overall_avg)}%</span>
                  <GradeBadge grade={g.overall_avg >= 80 ? 'A' : g.overall_avg >= 70 ? 'B' : g.overall_avg >= 60 ? 'C' : g.overall_avg >= 50 ? 'D' : 'F'} score={g.overall_avg} />
                </div>
              </div>
            )) || <p className="text-slate-500 text-sm text-center py-4">No grades yet</p>}
          </div>
        </div>

        <div className="space-y-4">
          {/* Radar chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-slate-800 mb-2">Performance Overview</h3>
            <ResponsiveContainer width="100%" height={180}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10 }} />
                <Radar dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          {/* Latest Announcements */}
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="w-4 h-4 text-slate-500" />
              <h3 className="font-semibold text-slate-800">Latest Announcements</h3>
            </div>
            <div className="space-y-2">
              {announcements?.slice(0, 3).map(a => (
                <div key={a.id} className="p-2 rounded-lg bg-slate-50 border-l-2 border-primary-400">
                  <p className="text-xs font-medium text-slate-700">{a.title}</p>
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{a.content}</p>
                </div>
              )) || <p className="text-slate-500 text-sm">No announcements</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
