import { useMemo, useState } from 'react';
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
  const isAdminOrTeacher = ['admin', 'teacher'].includes(user?.role || '');
  const qc = useQueryClient();
  const [filterDate, setFilterDate] = useState('');
  const [filterStudent, setFilterStudent] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkClassId, setBulkClassId] = useState('');
  const [bulkDate, setBulkDate] = useState(new Date().toISOString().split('T')[0]);
  const [bulkStatuses, setBulkStatuses] = useState<Record<string, Status>>({});

  const normalizeId = (value: unknown): string => String(value ?? '').trim();
  const normalizeName = (value: unknown): string => String(value ?? '').trim().toLowerCase();

  const { data: records = [], isLoading } = useQuery<AttendanceRecord[]>({
    queryKey: ['attendance', filterDate, filterStudent],
    queryFn: () => attendanceApi.list({ date: filterDate, student_id: filterStudent }).then(r => r.data),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students-bulk-attendance'],
    queryFn: () => studentsApi.list({}).then(r => r.data),
    enabled: isAdminOrTeacher,
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

  const classOptions = useMemo(() => {
    if (classes.length > 0) {
      return classes.map((c: any) => ({
        value: normalizeId(c.id),
        name: String(c.name || `Class ${c.id}`),
      }));
    }

    const fallback = new Map<string, { value: string; name: string }>();
    students.forEach((student) => {
      const classId = normalizeId(student.class_id);
      const className = String(student.class_name || '').trim();
      if (classId) {
        fallback.set(classId, { value: classId, name: className || `Class ${classId}` });
      } else if (className) {
        const synthetic = `name:${className}`;
        fallback.set(synthetic, { value: synthetic, name: className });
      }
    });
    return [...fallback.values()];
  }, [classes, students]);

  const classNameById = useMemo(() => {
    const map = new Map<string, string>();
    classOptions.forEach((c) => map.set(c.value, c.name));
    classes.forEach((c: any) => map.set(normalizeId(c.id), String(c.name || '')));
    return map;
  }, [classOptions, classes]);

  const availableStudentsForBulk = useMemo(() => {
    if (!bulkClassId) return [];

    const selectedClassName = classNameById.get(bulkClassId) || (bulkClassId.startsWith('name:') ? bulkClassId.slice(5) : '');
    return students.filter((student) => {
      const idMatch = normalizeId(student.class_id) === bulkClassId;
      const nameMatch = selectedClassName && normalizeName(student.class_name) === normalizeName(selectedClassName);
      return idMatch || nameMatch;
    });
  }, [students, bulkClassId, classNameById]);

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
    const records = availableStudentsForBulk.map(s => ({
      student_id: Number.isNaN(Number(s.id)) ? undefined : Number(s.id),
      student_name: s.name,
      student_number: s.student_number,
      class_name: s.class_name || classNameById.get(bulkClassId) || '',
      date: bulkDate,
      status: bulkStatuses[normalizeId(s.id)] || 'present',
    }));
    bulkMutation.mutate(records);
  };

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
                {classOptions.map((c) => <option key={c.value} value={c.value}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date</label>
              <input type="date" className="input w-full" required value={bulkDate} onChange={e => setBulkDate(e.target.value)} />
            </div>
          </div>

          {bulkClassId && availableStudentsForBulk.length > 0 && (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">{availableStudentsForBulk.length} Students</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {availableStudentsForBulk.map(s => {
                  const sid = normalizeId(s.id);
                  return (
                  <div key={sid} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50">
                    <span className="text-sm font-medium">{s.name}</span>
                    <div className="flex gap-2">
                      {STATUS_OPTIONS.map(st => (
                        <label key={st} className={`text-xs cursor-pointer px-2.5 py-1 rounded-full border transition-colors ${
                          (bulkStatuses[sid] || 'present') === st
                            ? st === 'present' ? 'bg-green-500 text-white border-green-500'
                              : st === 'absent' ? 'bg-red-500 text-white border-red-500'
                              : st === 'late' ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-blue-500 text-white border-blue-500'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                        }`}>
                          <input type="radio" className="sr-only" name={`status-${sid}`} value={st}
                            checked={(bulkStatuses[sid] || 'present') === st}
                            onChange={() => setBulkStatuses(prev => ({ ...prev, [sid]: st }))} />
                          {st.charAt(0).toUpperCase() + st.slice(1)}
                        </label>
                      ))}
                    </div>
                  </div>
                );})}
              </div>
            </div>
          )}

          {bulkClassId && availableStudentsForBulk.length === 0 && (
            <p className="text-sm text-slate-400 text-center py-4">No students in this class</p>
          )}

          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={!bulkClassId || availableStudentsForBulk.length === 0 || bulkMutation.isPending}>
              {bulkMutation.isPending ? 'Saving...' : 'Submit Attendance'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowBulkModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
