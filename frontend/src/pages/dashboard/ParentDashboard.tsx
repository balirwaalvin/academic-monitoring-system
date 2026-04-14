import { useQuery, useQueries } from '@tanstack/react-query';
import { useAuth } from '../../contexts/AuthContext';
import { studentsApi, gradesApi, feesApi, attendanceApi, alertsApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { BookOpen, CalendarCheck, CreditCard, AlertTriangle } from 'lucide-react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { useNavigate } from 'react-router-dom';
import type { GradeSummary, Fee, AttendanceStats } from '../../types';
import type { ParentProfile } from '../../types';

export default function ParentDashboard() {
  const { profile } = useAuth();
  const parentProfile = profile as ParentProfile | null;
  const navigate = useNavigate();

  const children = parentProfile?.children || [];
  const firstChildId = children[0]?.student_id;

  const { data: gradeSummary } = useQuery<GradeSummary[]>({
    queryKey: ['grade-summary', firstChildId],
    queryFn: () => gradesApi.summary(firstChildId!).then(r => r.data),
    enabled: !!firstChildId,
  });

  const childAverageQueries = useQueries({
    queries: children.map((child) => ({
      queryKey: ['grade-summary', 'child-average', child.student_id],
      queryFn: () => gradesApi.summary(child.student_id).then((r) => r.data as GradeSummary[]),
      enabled: !!child.student_id,
    })),
  });

  const childAverages = children.map((child, index) => {
    const summary = childAverageQueries[index]?.data || [];
    const average = summary.length
      ? Math.round(summary.reduce((sum, item) => sum + Number(item.overall_avg || 0), 0) / summary.length)
      : 0;

    return {
      ...child,
      average,
      hasData: summary.length > 0,
    };
  });

  const { data: fees } = useQuery<Fee[]>({
    queryKey: ['fees'],
    queryFn: () => feesApi.list().then(r => r.data),
  });

  const { data: attStats } = useQuery<AttendanceStats>({
    queryKey: ['att-stats', firstChildId],
    queryFn: () => attendanceApi.stats(firstChildId!).then(r => r.data),
    enabled: !!firstChildId,
  });

  const { data: warnings } = useQuery({
    queryKey: ['alerts', { resolved: 'false' }],
    queryFn: () => alertsApi.list({ resolved: 'false' }).then(r => r.data),
  });

  const pendingFees = fees?.filter(f => f.payment_status !== 'paid') || [];
  const totalBalance = pendingFees.reduce((sum, f) => sum + f.balance, 0);

  const radarData = gradeSummary?.map(g => ({
    subject: g.subject.split(' ')[0],
    score: Math.round(g.overall_avg || 0),
  })) || [];

  const attRate = attStats?.overall?.total_days
    ? Math.round((attStats.overall.present / attStats.overall.total_days) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Child follow-up context */}
      <div className="card p-4">
        <p className="text-sm font-medium text-slate-600 mb-2">Child Follow-up</p>
        {children.length === 0 ? (
          <p className="text-sm text-slate-500">No linked child found for this parent account yet.</p>
        ) : (
          <>
            <p className="text-sm text-slate-700 mb-3">
              Following up on: <span className="font-semibold">{children.map((c) => c.name).join(', ')}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {children.map((c) => (
                <button key={c.student_id} className="btn-secondary btn-sm" onClick={() => navigate(`/students/${c.student_id}`)}>
                  {c.name} — {c.class_name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overall Average" value={gradeSummary ? `${Math.round(gradeSummary.reduce((s, g) => s + g.overall_avg, 0) / Math.max(gradeSummary.length, 1))}%` : 'N/A'} icon={<BookOpen className="w-5 h-5" />} color="blue" />
        <StatCard title="Attendance Rate" value={`${attRate}%`} icon={<CalendarCheck className="w-5 h-5" />} color="green" subtitle={`${attStats?.overall?.absent || 0} days absent`} />
        <StatCard title="Outstanding Fees" value={`UGX ${totalBalance.toLocaleString()}`} icon={<CreditCard className="w-5 h-5" />} color={totalBalance > 0 ? 'red' : 'green'} />
        <StatCard title="Active Warnings" value={warnings?.length || 0} icon={<AlertTriangle className="w-5 h-5" />} color="amber" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Student Averages</h3>
            <button onClick={() => navigate('/grades')} className="text-xs text-primary-600 hover:underline">Open grades</button>
          </div>
          <div className="space-y-2">
            {childAverages.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No linked child found</p>
            ) : childAverages.map((child) => (
              <div key={child.student_id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{child.name}</p>
                  <p className="text-xs text-slate-500">{child.class_name || 'Class not set'}</p>
                </div>
                <p className={`text-sm font-semibold ${child.hasData ? 'text-blue-700' : 'text-slate-400'}`}>
                  {child.hasData ? `${child.average}%` : 'No data'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Subject Performance */}
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Subject Performance</h3>
          {radarData.length > 0 ? (
            <ResponsiveContainer width="100%" height={230}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 11 }} />
                <Radar dataKey="score" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">No grade data available</p>
          )}
        </div>

        {/* Recent Fee Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Fee Status</h3>
            <button onClick={() => navigate('/fees')} className="text-xs text-primary-600 hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {fees?.slice(0, 6).map(f => (
              <div key={f.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                <div>
                  <p className="text-sm font-medium text-slate-700">{f.fee_type}</p>
                  <p className="text-xs text-slate-500">{f.term} • Due: {new Date(f.due_date).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${f.payment_status === 'paid' ? 'text-green-600' : f.payment_status === 'overdue' ? 'text-red-600' : 'text-amber-600'}`}>
                    {f.payment_status === 'paid' ? 'Paid' : `UGX ${f.balance.toLocaleString()}`}
                  </p>
                  <p className="text-xs text-slate-400 capitalize">{f.payment_status}</p>
                </div>
              </div>
            )) || <p className="text-slate-500 text-sm text-center py-4">No fees found</p>}
          </div>
        </div>
      </div>

      <div className="card p-5">
        <div className="flex gap-2">
          <button onClick={() => navigate('/grades')} className="btn-primary btn-sm">Academic Grades</button>
          <button onClick={() => navigate('/attendance')} className="btn-secondary btn-sm">Attendance Records</button>
          <button onClick={() => navigate('/messages')} className="btn-secondary btn-sm">Contact Teacher</button>
          <button onClick={() => navigate('/fees')} className="btn-secondary btn-sm">Pay Fees</button>
        </div>
      </div>
    </div>
  );
}
