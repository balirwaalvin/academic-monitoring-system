import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentsApi, classesApi, usersApi } from '../../services/api';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Modal from '../../components/common/Modal';
import { Badge } from '../../components/common/Badge';
import { Plus, Search, Eye, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import type { Student, Class } from '../../types';

export default function StudentsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showParentModal, setShowParentModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [form, setForm] = useState({ name: '', email: '', student_number: '', class_id: '', parent_id: '', date_of_birth: '', gender: '' });
  const [parentForm, setParentForm] = useState({ name: '', email: '', phone: '', address: '', password: 'password123' });

  const { data: students, isLoading } = useQuery<Student[]>({
    queryKey: ['students', search, classFilter],
    queryFn: () => studentsApi.list({ ...(search && { search }), ...(classFilter && { class_id: classFilter }) }).then(r => r.data),
  });

  const classesQuery = useQuery<Class[]>({
    queryKey: ['classes'],
    queryFn: () => classesApi.list().then(r => r.data),
  });
  const classes = classesQuery.data || [];

  useEffect(() => {
    if (classesQuery.isError) {
      toast.error('Failed to load classes. Check Appwrite classes data and read permissions.');
    }
  }, [classesQuery.isError]);

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => studentsApi.create(data),
    onSuccess: () => { toast.success('Student created successfully'); qc.invalidateQueries({ queryKey: ['students'] }); setShowAdd(false); setForm({ name: '', email: '', student_number: '', class_id: '', parent_id: '', date_of_birth: '', gender: '' }); },
    onError: (e: { response?: { data?: { error?: string } } }) => toast.error(e.response?.data?.error || 'Failed to create student'),
  });

  const linkParentMutation = useMutation({
    mutationFn: (data: typeof parentForm) => {
      if (!selectedStudent) throw new Error('Select a student first.');
      return usersApi.createParentForStudent(selectedStudent.id, data);
    },
    onSuccess: () => {
      toast.success('Parent account created and linked successfully');
      qc.invalidateQueries({ queryKey: ['students'] });
      setShowParentModal(false);
      setSelectedStudent(null);
      setParentForm({ name: '', email: '', phone: '', address: '', password: 'password123' });
    },
    onError: (e: any) => toast.error(e?.message || 'Failed to create/link parent account'),
  });

  const openParentModal = (student: Student) => {
    setSelectedStudent(student);
    setParentForm({
      name: student.parent_name || '',
      email: student.parent_email || '',
      phone: student.parent_phone || '',
      address: '',
      password: 'password123',
    });
    setShowParentModal(true);
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="input pl-9" placeholder="Search students..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <select className="select w-44" value={classFilter} onChange={e => setClassFilter(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        {user?.role === 'admin' && (
          <button onClick={() => setShowAdd(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Add Student
          </button>
        )}
      </div>

      {/* Summary */}
      <p className="text-sm text-slate-500">{students?.length || 0} student{(students?.length || 0) !== 1 ? 's' : ''} found</p>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead>
            <tr>
              <th className="table-th">Student</th>
              <th className="table-th">ID</th>
              <th className="table-th">Class</th>
              <th className="table-th">Parent</th>
              <th className="table-th">Gender</th>
              <th className="table-th">Status</th>
              <th className="table-th">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">Loading...</td></tr>
            ) : !students || students.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-8 text-slate-500">No students found</td></tr>
            ) : (
              students.map(s => (
                <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 text-xs font-bold">
                          {s.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-slate-800 text-sm">{s.name}</p>
                        <p className="text-xs text-slate-500">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-td"><span className="font-mono text-xs">{s.student_number}</span></td>
                  <td className="table-td">{s.class_name || '—'}</td>
                  <td className="table-td">
                    <div>
                      <p className="text-sm">{s.parent_name || '—'}</p>
                      <p className="text-xs text-slate-500">{s.parent_phone}</p>
                    </div>
                  </td>
                  <td className="table-td capitalize">{s.gender || '—'}</td>
                  <td className="table-td">
                    <Badge label={s.status} color={s.status === 'active' ? 'green' : s.status === 'suspended' ? 'red' : 'slate'} />
                  </td>
                  <td className="table-td">
                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/students/${s.id}`)} className="btn-secondary btn-sm">
                        <Eye className="w-3 h-3" /> View
                      </button>
                      {user?.role === 'admin' && (
                        <button onClick={() => openParentModal(s)} className="btn-secondary btn-sm">
                          <UserCheck className="w-3 h-3" /> Link Parent
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Student" size="lg">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name *</label>
            <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Student full name" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email *</label>
            <input className="input" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="student@brevian.ac.ug" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Student Number *</label>
            <input className="input" value={form.student_number} onChange={e => setForm(f => ({ ...f, student_number: e.target.value }))} placeholder="STU-2026-010" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
            <select className="select" value={form.class_id} onChange={e => setForm(f => ({ ...f, class_id: e.target.value }))}>
              <option value="">Select class</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {classes.length === 0 && <p className="text-xs text-amber-600 mt-1">No classes found. Run backend bootstrap/provision scripts.</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Gender</label>
            <select className="select" value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}>
              <option value="">Select</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Date of Birth</label>
            <input className="input" type="date" value={form.date_of_birth} onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-4">Default password will be <code className="bg-slate-100 px-1 rounded">password123</code></p>
        <div className="flex gap-3 mt-5">
          <button onClick={() => createMutation.mutate(form)} disabled={createMutation.isPending} className="btn-primary">
            {createMutation.isPending ? 'Creating...' : 'Create Student'}
          </button>
          <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
        </div>
      </Modal>

      <Modal
        isOpen={showParentModal}
        onClose={() => setShowParentModal(false)}
        title={selectedStudent ? `Create Parent For ${selectedStudent.name}` : 'Create Parent Account'}
        size="md"
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            linkParentMutation.mutate(parentForm);
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parent Name *</label>
            <input className="input w-full" required value={parentForm.name} onChange={e => setParentForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Parent Email *</label>
            <input type="email" className="input w-full" required value={parentForm.email} onChange={e => setParentForm(f => ({ ...f, email: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input className="input w-full" value={parentForm.phone} onChange={e => setParentForm(f => ({ ...f, phone: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Temporary Password *</label>
              <input className="input w-full" required value={parentForm.password} onChange={e => setParentForm(f => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
            <input className="input w-full" value={parentForm.address} onChange={e => setParentForm(f => ({ ...f, address: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={linkParentMutation.isPending} className="btn-primary">
              {linkParentMutation.isPending ? 'Saving...' : 'Create & Link Parent'}
            </button>
            <button type="button" onClick={() => setShowParentModal(false)} className="btn-secondary">Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
