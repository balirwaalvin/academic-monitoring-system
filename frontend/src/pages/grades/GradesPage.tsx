import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { gradesApi, studentsApi, classesApi } from '../../services/api';
import { PlusCircle, BookOpen } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { GradeBadge } from '../../components/common/Badge';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Grade, Student, Subject, Class } from '../../types';

export default function GradesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filterStudent, setFilterStudent] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [form, setForm] = useState({ student_id: '', subject_id: '', score: '', term: 'Term 1', assessment_type: 'exam', remarks: '' });

  const { data: grades = [], isLoading } = useQuery<Grade[]>({
    queryKey: ['grades', filterStudent, filterTerm, filterType],
    queryFn: () => gradesApi.list({ student_id: filterStudent, term: filterTerm, assessment_type: filterType }).then(r => r.data),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({}).then(r => r.data),
    enabled: ['admin', 'teacher'].includes(user?.role || ''),
  });

  const { data: subjects = [] } = useQuery<Subject[]>({
    queryKey: ['subjects-all'],
    queryFn: () => classesApi.allSubjects().then(r => r.data),
  });

  const mutation = useMutation({
    mutationFn: (d: typeof form) => gradesApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['grades'] }); toast.success('Grade recorded'); setShowModal(false); setForm({ student_id: '', subject_id: '', score: '', term: 'Term 1', assessment_type: 'exam', remarks: '' }); },
    onError: () => toast.error('Failed to record grade'),
  });

  const isAdminOrTeacher = ['admin', 'teacher'].includes(user?.role || '');

  const filteredGrades = grades.filter(g =>
    (!filterStudent || g.student_id === parseInt(filterStudent)) &&
    (!filterTerm || g.term === filterTerm) &&
    (!filterType || g.assessment_type === filterType)
  );

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const types = ['exam', 'quiz', 'assignment', 'project', 'midterm'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Grades</h1>
          <p className="text-sm text-slate-500">{filteredGrades.length} records</p>
        </div>
        {isAdminOrTeacher && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <PlusCircle className="w-4 h-4" /> Add Grade
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        {isAdminOrTeacher && (
          <select className="select" value={filterStudent} onChange={e => setFilterStudent(e.target.value)}>
            <option value="">All Students</option>
            {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
        <select className="select" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
          <option value="">All Terms</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
        </select>
        {(filterStudent || filterTerm || filterType) && (
          <button className="btn btn-secondary" onClick={() => { setFilterStudent(''); setFilterTerm(''); setFilterType(''); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">Student</th>
              <th className="table-th">Subject</th>
              <th className="table-th">Term</th>
              <th className="table-th">Type</th>
              <th className="table-th">Score</th>
              <th className="table-th">Grade</th>
              <th className="table-th">Remarks</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="table-td text-center text-slate-400">Loading...</td></tr>
            ) : filteredGrades.length === 0 ? (
              <tr><td colSpan={7} className="table-td text-center text-slate-400 py-8">No grade records found</td></tr>
            ) : filteredGrades.map(g => (
              <tr key={g.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">{g.student_name}</td>
                <td className="table-td">{g.subject_name}</td>
                <td className="table-td">{g.term}</td>
                <td className="table-td capitalize">{g.assessment_type}</td>
                <td className="table-td font-semibold">{g.score}%</td>
                <td className="table-td"><GradeBadge grade={g.grade_letter || ''} score={g.score} /></td>
                <td className="table-td text-slate-500 text-sm">{g.notes || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Grade Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Record Grade" size="sm">
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select className="select w-full" required value={form.student_id} onChange={e => setForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <select className="select w-full" required value={form.subject_id} onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}>
              <option value="">Select subject...</option>
              {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Term</label>
              <select className="select w-full" value={form.term} onChange={e => setForm(f => ({ ...f, term: e.target.value }))}>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="select w-full" value={form.assessment_type} onChange={e => setForm(f => ({ ...f, assessment_type: e.target.value }))}>
                {types.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Score (%)</label>
            <input type="number" min="0" max="100" step="0.5" className="input w-full" required value={form.score} onChange={e => setForm(f => ({ ...f, score: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Remarks</label>
            <input type="text" className="input w-full" placeholder="Optional comments" value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving...' : 'Save Grade'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
