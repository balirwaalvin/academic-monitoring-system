import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { attendanceApi, studentsApi, classesApi } from '../../services/api';
import { CheckSquare, ClipboardList } from 'lucide-react';
import { AttendanceBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { AttendanceRecord, Student } from '../../types';

const STATUS_OPTIONS = ['present', 'absent', 'late', 'excused'] as const;
type Status = typeof STATUS_OPTIONS[number];

export default function AttendancePage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkStatuses, setBulkStatuses] = useState<Record<number, Status>>({});

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', filterDate, filterStudent],
    queryFn: () => attendanceApi.list({ date: filterDate, student_id: filterStudent }).then(r => r.data),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students', bulkClassId],
    queryFn: () => studentsApi.list({ class_id: bulkClassId }).then(r => r.data),
    enabled: !!bulkClassId,
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classesApi.list().then(r => r.data),
  });

  const { data: allStudents = [] } = useQuery<Student[]>({
    queryKey: ['students-filter'],
    queryFn: () => studentsApi.list({}).then(r => r.data),
    enabled: ['admin', 'teacher'].includes(user?.role || ''),
  });

  const bulkMutation = useMutation({
    mutationFn: (payload: object[]) => attendanceApi.record(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['attendance'] });
      toast.success('Attendance recorded');
      setShowBulkModal(false);
      setBulkStatuses({});
    },
    onError: () => toast.error('Failed to record attendance'),
  });

  const handleBulkSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const records = students.map(s => ({
      student_id: s.id,
      date: bulkDate,
      status: bulkStatuses[s.id] || 'present',
    }));
    bulkMutation.mutate(records);
  };

  const isAdminOrTeacher = ['admin', 'teacher'].includes(user?.role || '');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance</h1>
          <p className="text-sm text-slate-500">{records.length} records</p>
        </div>
        {isAdminOrTeacher && (
          <button className="btn btn-primary" onClick={() => setShowBulkModal(true)}>
            <ClipboardList className="w-4 h-4" /> Mark Attendance
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <input type="date" className="input" value={filterDate} onChange={e => setFilterDate(e.target.value)} />
        {isAdminOrTeacher && (
          <select className="select" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">All Students</option>
            {allStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        {(filterDate || filterStudent) && (
          <button className="btn btn-secondary" onClick={() => { setFilterDate(''); setFilterStudent(''); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">Student</th>
              <th className="table-th">Class</th>
              <th className="table-th">Date</th>
              <th className="table-th">Status</th>
              <th className="table-th">Notes</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="table-td text-center text-slate-400">Loading...</td></tr>
            ) : records.length === 0 ? (
              <tr><td colSpan={5} className="table-td text-center text-slate-400 py-8">No attendance records found</td></tr>
            ) : records.map(r => (
              <tr key={r.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">{r.student_name}</td>
                <td className="table-td text-slate-500">{r.class_name || '—'}</td>
                <td className="table-td">{new Date(r.date).toLocaleDateString()}</td>
                <td className="table-td"><AttendanceBadge status={r.status} /></td>
                <td className="table-td text-slate-500 text-sm">{r.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Modal */}
      <Modal isOpen={showBulkModal} onClose={() => setShowBulkModal(false)} title="Mark Class Attendance" size="md">
        <form onSubmit={handleBulkSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Class</label>
              <select className="select w-full" required value={bulkClassId} onChange={e => { setBulkClassId(e.target.value); setBulkStatuses({}); }}>
                <option value="">Select class...</option>
                {classes.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" className="input w-full" required value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
            </div>
          </div>

          {bulkClassId && students.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{students.length} Students</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {students.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium">{s.name}</span>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map(st => (
                        <label key={st} className={`text-xs cursor-pointer px-2.5 py-1 rounded-full border transition-colors ${
                          (bulkStatuses[s.id] || 'present') === st
                            ? st === 'present' ? 'bg-green-500 text-white border-green-500'
                              : st === 'absent' ? 'bg-red-500 text-white border-red-500'
                              : st === 'late' ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}>
                          <input type="radio" className="sr-only" name={`status-${s.id}`} value={st}
                            checked={(bulkStatuses[s.id] || 'present') === st}
                            onChange={() => setBulkStatuses(prev => ({ ...prev, [s.id]: st }))} />
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {bulkClassId && students.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No students in this class</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={!bulkClassId || students.length === 0 || bulkMutation.isPending}>
              {bulkMutation.isPending ? 'Saving...' : 'Submit Attendance'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
