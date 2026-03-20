import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { studentsApi, gradesApi, attendanceApi, wellbeingApi, alertsApi } from '../../services/api';
import { ArrowLeft, User, Phone, MapPin, Calendar } from 'lucide-react';
import { GradeBadge, AttendanceBadge, SeverityBadge } from '../../components/common/Badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { Student, GradeSummary, AttendanceRecord, WellbeingReport, EarlyWarning } from '../../types';

export default function StudentProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const studentId = String(id || '');

  const isSameId = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '');

  const { data: student, isLoading } = useQuery<Student>({
    queryKey: ['student', studentId],
    queryFn: () => studentsApi.get(studentId).then(r => r.data),
    enabled: Boolean(studentId),
  });

  const { data: gradeSummary } = useQuery<GradeSummary[]>({
    queryKey: ['grade-summary', studentId],
    queryFn: () => gradesApi.summary(studentId).then(r => r.data),
    enabled: Boolean(studentId),
  });

  const { data: attendance } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', studentId],
    queryFn: () => attendanceApi.list({ student_id: String(studentId) }).then(r => r.data),
    enabled: Boolean(studentId),
  });

  const { data: wellbeing } = useQuery<WellbeingReport[]>({
    queryKey: ['wellbeing', studentId],
    queryFn: () => wellbeingApi.list({ student_id: String(studentId) }).then(r => r.data),
    enabled: Boolean(studentId),
  });

  const { data: warnings } = useQuery<EarlyWarning[]>({
    queryKey: ['alerts', studentId],
    queryFn: () => alertsApi.list({ resolved: 'false' }).then(r => r.data),
    enabled: Boolean(studentId),
  });

  if (isLoading) return <div className="text-center py-10 text-slate-500">Loading student profile...</div>;
  if (!student) return <div className="text-center py-10 text-slate-500">Student not found</div>;

  const presentCount = attendance?.filter(a => a.status === 'present').length || 0;
  const absentCount = attendance?.filter(a => a.status === 'absent').length || 0;
  const totalDays = attendance?.length || 0;
  const attRate = totalDays ? Math.round((presentCount / totalDays) * 100) : 0;
  const overallAvg = gradeSummary?.length
    ? Math.round(gradeSummary.reduce((s, g) => s + g.overall_avg, 0) / gradeSummary.length)
    : 0;

  return (
    <div className="space-y-5">
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
        <ArrowLeft className="w-4 h-4" /> Back to Students
      </button>

      {/* Header */}
      <div className="card p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
              <span className="text-primary-700 text-xl font-bold">
                {student.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{student.name}</h2>
              <p className="text-slate-500">{student.student_number} • {student.class_name} • {student.grade_level}</p>
              <p className="text-slate-400 text-sm">{student.email}</p>
            </div>
          </div>
          <div className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
            student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}>
            {student.status}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-5 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <User className="w-4 h-4 text-slate-400" />
            <span className="capitalize">{student.gender || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Calendar className="w-4 h-4 text-slate-400" />
            <span>{student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <Phone className="w-4 h-4 text-slate-400" />
            <span>{student.parent_phone || 'N/A'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <MapPin className="w-4 h-4 text-slate-400" />
            <span className="truncate">{student.address || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Key Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Overall Avg', value: `${overallAvg}%`, color: overallAvg >= 70 ? 'text-green-600' : overallAvg >= 50 ? 'text-amber-600' : 'text-red-600' },
          { label: 'Attendance', value: `${attRate}%`, color: attRate >= 85 ? 'text-green-600' : attRate >= 70 ? 'text-amber-600' : 'text-red-600' },
          { label: 'Days Present', value: presentCount, color: 'text-slate-800' },
          { label: 'Days Absent', value: absentCount, color: absentCount > 5 ? 'text-red-600' : 'text-slate-800' },
          { label: 'Active Warnings', value: (warnings?.filter(w => isSameId(w.student_id, studentId)) || []).length, color: 'text-red-600' },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Academic & Attendance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Subject Performance</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={gradeSummary || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="subject" tick={{ fontSize: 9 }} angle={-20} textAnchor="end" height={40} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v: number) => [`${v.toFixed(1)}%`, 'Avg Score']} />
              <Bar dataKey="overall_avg" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Attendance</h3>
          <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
            {(attendance || []).slice(0, 40).map(a => (
              <div key={a.id} title={`${a.date}: ${a.status}`}
                className={`w-8 h-8 rounded-md flex items-center justify-center text-[10px] font-bold cursor-default
                  ${a.status === 'present' ? 'bg-green-100 text-green-700' :
                    a.status === 'absent' ? 'bg-red-100 text-red-700' :
                    a.status === 'late' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'}`}>
                {a.status[0].toUpperCase()}
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-green-200 inline-block" />Present</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-200 inline-block" />Absent</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-200 inline-block" />Late</span>
          </div>
        </div>
      </div>

      {/* Parent Info & Wellbeing */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Guardian Information</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Name</span>
              <span className="text-sm font-medium">{student.parent_name || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Email</span>
              <span className="text-sm font-medium">{student.parent_email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Phone</span>
              <span className="text-sm font-medium">{student.parent_phone || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-slate-500">Class Teacher</span>
              <span className="text-sm font-medium">{student.class_teacher_name || '—'}</span>
            </div>
          </div>
        </div>

        <div className="card p-5">
          <h3 className="font-semibold text-slate-800 mb-4">Recent Wellbeing Sessions</h3>
          <div className="space-y-2">
            {!wellbeing || wellbeing.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">No wellbeing records</p>
            ) : (
              wellbeing.slice(0, 4).map(w => (
                <div key={w.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{w.concern_type || 'General Check-in'}</p>
                      <p className="text-xs text-slate-500">{new Date(w.session_date).toLocaleDateString()} • {w.counselor_name}</p>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      w.status === 'resolved' ? 'bg-green-100 text-green-700' :
                      w.status === 'open' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>{w.status.replace('_', ' ')}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
