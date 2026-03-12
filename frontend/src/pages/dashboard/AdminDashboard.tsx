import { useQuery } from '@tanstack/react-query';
import { analyticsApi, alertsApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { Users, BookOpen, CalendarCheck, CreditCard, AlertTriangle, Heart, TrendingUp, School } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, Legend } from 'recharts';
import type { OverviewAnalytics, EarlyWarning } from '../../types';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: overview } = useQuery<OverviewAnalytics>({
    queryKey: ['analytics-overview'],
    queryFn: () => analyticsApi.overview().then(r => r.data),
  });

  const { data: warnings } = useQuery<EarlyWarning[]>({
    queryKey: ['alerts', { resolved: 'false' }],
    queryFn: () => alertsApi.list({ resolved: 'false' }).then(r => r.data),
  });

  const runScan = async () => {
    try {
      const res = await alertsApi.generate();
      toast.success(res.data.message);
      qc.invalidateQueries({ queryKey: ['alerts'] });
      qc.invalidateQueries({ queryKey: ['analytics-overview'] });
    } catch {
      toast.error('Scan failed');
    }
  };

  const pieData = overview ? [
    { name: 'Present', value: overview.attendanceToday?.present || 0, color: '#10b981' },
    { name: 'Absent', value: overview.attendanceToday?.absent || 0, color: '#ef4444' },
    { name: 'Not Recorded', value: Math.max(0, (overview.attendanceToday?.total || 0) === 0 ? overview.totalStudents : 0), color: '#94a3b8' },
  ] : [];

  const collectionRate = overview?.feeCollection?.total_billed
    ? Math.round((overview.feeCollection.total_collected / overview.feeCollection.total_billed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Students" value={overview?.totalStudents || 0} icon={<Users className="w-5 h-5" />} color="blue" subtitle="Active enrollments" />
        <StatCard title="Teaching Staff" value={overview?.totalTeachers || 0} icon={<School className="w-5 h-5" />} color="indigo" subtitle="Active teachers" />
        <StatCard title="Avg Performance" value={`${overview?.avgPerformance || 0}%`} icon={<BookOpen className="w-5 h-5" />} color="green" subtitle="Academic year 2025/2026" />
        <StatCard title="Active Warnings" value={overview?.activeWarnings || 0} icon={<AlertTriangle className="w-5 h-5" />} color="red" subtitle="Requires attention" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Fee Collection" value={`${collectionRate}%`} icon={<CreditCard className="w-5 h-5" />} color="green"
          subtitle={`$${(overview?.feeCollection?.total_collected || 0).toLocaleString()} / $${(overview?.feeCollection?.total_billed || 0).toLocaleString()}`} />
        <StatCard title="Total Classes" value={overview?.totalClasses || 0} icon={<School className="w-5 h-5" />} color="purple" />
        <StatCard title="Parents Registered" value={overview?.totalParents || 0} icon={<Users className="w-5 h-5" />} color="amber" />
        <StatCard title="Open Wellbeing" value={overview?.openWellbeing || 0} icon={<Heart className="w-5 h-5" />} color="purple" subtitle="Cases in progress" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Attendance Trend */}
        <div className="card p-5 lg:col-span-2">
          <h3 className="font-semibold text-slate-800 mb-4">Attendance Rate (Last 14 Days)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={overview?.attendanceTrend || []}>
              <defs>
                <linearGradient id="attGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={d => d.slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
              <Tooltip formatter={(v: number) => [`${v}%`, 'Attendance Rate']} />
              <Area type="monotone" dataKey="rate" stroke="#3b82f6" fill="url(#attGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Today's Attendance Pie */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Today's Attendance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={50} outerRadius={80}>
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Legend iconSize={8} />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance by Class & Subject */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Performance by Class</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overview?.performanceByClass || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="class_name" tick={{ fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg Score']} />
              <Bar dataKey="avg_score" fill="#6366f1" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Subject Performance (Term 2)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={overview?.subjectPerformance || []} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 10 }} />
              <YAxis dataKey="subject" type="category" tick={{ fontSize: 10 }} width={90} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg Score']} />
              <Bar dataKey="avg_score" fill="#10b981" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Early Warnings & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Active Early Warnings</h3>
            <div className="flex gap-2">
              <button onClick={runScan} className="btn-secondary btn-sm text-xs">Run AI Scan</button>
              <button onClick={() => navigate('/alerts')} className="btn-primary btn-sm text-xs">View All</button>
            </div>
          </div>
          <div className="space-y-2">
            {!warnings || warnings.length === 0 ? (
              <p className="text-slate-500 text-sm py-4 text-center">No active warnings</p>
            ) : (
              warnings.slice(0, 5).map(w => (
                <div key={w.id} className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    w.severity === 'critical' ? 'bg-red-500' : w.severity === 'high' ? 'bg-orange-500' : w.severity === 'medium' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-800">{w.student_name}</p>
                    <p className="text-xs text-slate-500">{w.warning_type} • {w.class_name}</p>
                    <p className="text-xs text-slate-500 truncate">{w.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Quick Actions</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Add Student', icon: Users, action: () => navigate('/students'), color: 'blue' },
              { label: 'Record Grades', icon: BookOpen, action: () => navigate('/grades'), color: 'green' },
              { label: 'Mark Attendance', icon: CalendarCheck, action: () => navigate('/attendance'), color: 'indigo' },
              { label: 'Fee Payment', icon: CreditCard, action: () => navigate('/fees'), color: 'amber' },
              { label: 'View Analytics', icon: TrendingUp, action: () => navigate('/analytics'), color: 'purple' },
              { label: 'Wellbeing Report', icon: Heart, action: () => navigate('/wellbeing'), color: 'rose' },
            ].map(({ label, icon: Icon, action, color }) => (
              <button key={label} onClick={action}
                className="flex items-center gap-2 p-3 rounded-lg border border-slate-200 hover:border-primary-300 hover:bg-primary-50 transition-all text-left">
                <div className={`w-8 h-8 rounded-md flex items-center justify-center bg-${color}-100`}>
                  <Icon className={`w-4 h-4 text-${color}-600`} />
                </div>
                <span className="text-sm font-medium text-slate-700">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
