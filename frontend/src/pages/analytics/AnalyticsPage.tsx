import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AlertTriangle, Users, TrendingUp, BookOpen } from 'lucide-react';
import type { OverviewAnalytics } from '../../types';

export default function AnalyticsPage() {
  const { data: overview, isLoading } = useQuery<OverviewAnalytics>({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.overview().then(r => r.data),
  });

  const { data: atRisk = [] } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => analyticsApi.atRisk().then(r => r.data),
  });

  if (isLoading) return <div className="text-center py-10 text-slate-500">Loading analytics...</div>;

  const classPerf = overview?.class_performance || [];
  const attTrend = overview?.attendance_trend || [];
  const subjPerf = overview?.subject_performance || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Analytics & Reports</h1>
        <p className="text-sm text-slate-500">School-wide academic performance overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={overview?.total_students || 0} icon={<Users className="w-5 h-5" />} color="blue" subtitle="enrolled this year" />
        <StatCard title="At-Risk Students" value={overview?.at_risk_students || 0} icon={<AlertTriangle className="w-5 h-5" />} color="red" subtitle="need intervention" />
        <StatCard title="Avg Attendance" value={`${overview?.attendance_rate || 0}%`} icon={<TrendingUp className="w-5 h-5" />} color="green" subtitle="past 30 days" />
        <StatCard title="Active Warnings" value={overview?.active_warnings || 0} icon={<BookOpen className="w-5 h-5" />} color="amber" subtitle="early warnings" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Attendance Trend (30 Days)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={attTrend}>
              <defs>
                <linearGradient id="aGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => new Date(d).toLocaleDateString('en', { month:'short', day:'numeric' })} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Attendance']} />
              <Area type="monotone" dataKey="rate" stroke="#22c55e" fill="url(#aGreen)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Performance by Class</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={classPerf}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg Score']} />
              <Bar dataKey="avg_score" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Subject Performance */}
      <div className="card p-5">
        <h3 className="font-semibold text-slate-800 mb-4">Subject Performance</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={subjPerf} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
            <YAxis type="category" dataKey="subject" tick={{ fontSize: 10 }} width={100} />
            <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg Score']} />
            <Bar dataKey="avg_score" fill="#6366f1" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* At-Risk Students */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">At-Risk Students ({atRisk.length})</h3>
          <p className="text-xs text-slate-500 mt-0.5">Students needing immediate attention</p>
        </div>
        {atRisk.length === 0 ? (
          <p className="text-center text-slate-400 py-8">No at-risk students identified</p>
        ) : (
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">Class</th>
                <th className="table-th">Avg Score</th>
                <th className="table-th">Attendance</th>
                <th className="table-th">Risk Factors</th>
              </tr>
            </thead>
            <tbody>
              {atRisk.map((s: any) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{s.name}</td>
                  <td className="table-td text-slate-500">{s.class_name}</td>
                  <td className="table-td">
                    <span className={`font-semibold ${s.avg_score < 50 ? 'text-red-600' : 'text-amber-600'}`}>{s.avg_score?.toFixed(1) || 'N/A'}%</span>
                  </td>
                  <td className="table-td">
                    <span className={`font-semibold ${s.attendance_rate < 70 ? 'text-red-600' : 'text-amber-600'}`}>{s.attendance_rate?.toFixed(1) || 'N/A'}%</span>
                  </td>
                  <td className="table-td">
                    <div className="flex flex-wrap gap-1">
                      {s.avg_score < 50 && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Low Grades</span>}
                      {s.attendance_rate < 70 && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Poor Attendance</span>}
                      {s.overdue_fees > 0 && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Overdue Fees</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
