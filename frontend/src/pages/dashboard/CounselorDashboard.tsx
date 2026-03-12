import { useQuery } from '@tanstack/react-query';
import { wellbeingApi, analyticsApi } from '../../services/api';
import StatCard from '../../components/common/StatCard';
import { Heart, Users, AlertTriangle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { WellbeingReport } from '../../types';
import { Badge } from '../../components/common/Badge';

const moodEmojis = ['', '😢', '😟', '😐', '🙂', '😊'];
const statusColors: Record<string, 'amber' | 'blue' | 'green' | 'rose'> = {
  open: 'amber', in_progress: 'blue', resolved: 'green', follow_up: 'rose'
};

export default function CounselorDashboard() {
  const navigate = useNavigate();

  const { data: reports } = useQuery<WellbeingReport[]>({
    queryKey: ['wellbeing'],
    queryFn: () => wellbeingApi.list({ status: 'open' }).then(r => r.data),
  });

  const { data: inProgress } = useQuery<WellbeingReport[]>({
    queryKey: ['wellbeing-inprogress'],
    queryFn: () => wellbeingApi.list({ status: 'in_progress' }).then(r => r.data),
  });

  const { data: atRisk } = useQuery({
    queryKey: ['at-risk'],
    queryFn: () => analyticsApi.atRisk().then(r => r.data),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Open Cases" value={reports?.length || 0} icon={<Heart className="w-5 h-5" />} color="purple" />
        <StatCard title="In Progress" value={inProgress?.length || 0} icon={<Users className="w-5 h-5" />} color="blue" />
        <StatCard title="At-Risk Students" value={atRisk?.length || 0} icon={<AlertTriangle className="w-5 h-5" />} color="amber" />
        <StatCard title="Scheduled Follow-ups" value={(reports?.filter(r => r.follow_up_date) || []).length} icon={<CheckCircle className="w-5 h-5" />} color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Open Wellbeing Cases</h3>
            <button onClick={() => navigate('/wellbeing')} className="text-xs text-primary-600 hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {!reports || reports.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No open cases</p>
            ) : (
              reports.slice(0, 5).map(r => (
                <div key={r.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-800">{r.student_name}</p>
                        <span className="text-base">{moodEmojis[r.mood_rating || 3]}</span>
                      </div>
                      <p className="text-xs text-slate-500">{r.class_name} • {r.concern_type}</p>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{r.description}</p>
                    </div>
                    <Badge label={r.status.replace('_', ' ')} color={statusColors[r.status] || 'slate'} size="sm" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800">Students Needing Attention</h3>
            <button onClick={() => navigate('/students')} className="text-xs text-primary-600 hover:underline">View all</button>
          </div>
          <div className="space-y-2">
            {!atRisk || atRisk.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No flagged students</p>
            ) : (
              atRisk.slice(0, 6).map((s: { student_number: string; name: string; class_name: string; avg_score: number; absence_rate: number; active_warnings: number }) => (
                <div key={s.student_number} className="flex items-center justify-between p-2.5 rounded-lg bg-amber-50 border border-amber-100">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.class_name}</p>
                  </div>
                  <div className="text-right text-xs">
                    {s.avg_score && <p className="text-slate-600">Avg: {Math.round(s.avg_score)}%</p>}
                    {s.absence_rate && <p className="text-red-500">Absent: {s.absence_rate}%</p>}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="card p-4">
        <div className="flex gap-2">
          <button onClick={() => navigate('/wellbeing')} className="btn-primary btn-sm">New Wellbeing Report</button>
          <button onClick={() => navigate('/students')} className="btn-secondary btn-sm">Student Profiles</button>
          <button onClick={() => navigate('/alerts')} className="btn-secondary btn-sm">Early Warnings</button>
          <button onClick={() => navigate('/messages')} className="btn-secondary btn-sm">Messages</button>
        </div>
      </div>
    </div>
  );
}
