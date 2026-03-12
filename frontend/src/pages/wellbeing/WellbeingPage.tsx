import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { wellbeingApi, studentsApi } from '../../services/api';
import { PlusCircle, Heart, AlertTriangle } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { WellbeingReport, BehaviorRecord, Student } from '../../types';

const MOOD_EMOJIS = ['', '😢', '😕', '😐', '🙂', '😊'];
const CONCERN_TYPES = ['academic', 'social', 'emotional', 'behavioral', 'family', 'health', 'other'];
const BEHAVIOR_TYPES = ['positive', 'negative', 'neutral'];

export default function WellbeingPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reports' | 'behavior'>('reports');
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBehaviorModal, setShowBehaviorModal] = useState(false);
  const [reportForm, setReportForm] = useState({ student_id: '', session_date: new Date().toISOString().split('T')[0], concern_type: 'academic', mood_rating: '3', description: '', interventions: '', status: 'open' });
  const [behaviorForm, setBehaviorForm] = useState({ student_id: '', incident_date: new Date().toISOString().split('T')[0], incident_type: 'positive', description: '', action_taken: '' });

  const { data: reports = [], isLoading } = useQuery<WellbeingReport[]>({
    queryKey: ['wellbeing'],
    queryFn: () => wellbeingApi.list({}).then(r => r.data),
  });

  const { data: behavior = [] } = useQuery<BehaviorRecord[]>({
    queryKey: ['behavior'],
    queryFn: () => wellbeingApi.behaviorList({}).then(r => r.data),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({}).then(r => r.data),
    enabled: ['admin', 'counselor', 'teacher'].includes(user?.role || ''),
  });

  const reportMutation = useMutation({
    mutationFn: (d: typeof reportForm) => wellbeingApi.create(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wellbeing'] }); toast.success('Report created'); setShowReportModal(false); setReportForm({ student_id: '', session_date: new Date().toISOString().split('T')[0], concern_type: 'academic', mood_rating: '3', description: '', interventions: '', status: 'open' }); },
    onError: () => toast.error('Failed to create report'),
  });

  const behaviorMutation = useMutation({
    mutationFn: (d: typeof behaviorForm) => wellbeingApi.createBehavior(d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['behavior'] }); toast.success('Behavior record created'); setShowBehaviorModal(false); setBehaviorForm({ student_id: '', incident_date: new Date().toISOString().split('T')[0], incident_type: 'positive', description: '', action_taken: '' }); },
    onError: () => toast.error('Failed to create record'),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => wellbeingApi.update(id, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wellbeing'] }); toast.success('Status updated'); },
    onError: () => toast.error('Failed to update'),
  });

  const canManage = ['admin', 'counselor', 'teacher'].includes(user?.role || '');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Student Well-Being</h1>
          <p className="text-sm text-slate-500">Counseling sessions and behavior records</p>
        </div>
        {canManage && (
          <div className="flex gap-2">
            <button className="btn btn-secondary" onClick={() => setShowBehaviorModal(true)}>
              <AlertTriangle className="w-4 h-4" /> Behavior Record
            </button>
            <button className="btn btn-primary" onClick={() => setShowReportModal(true)}>
              <PlusCircle className="w-4 h-4" /> Wellbeing Report
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(['reports', 'behavior'] as const).map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-medium capitalize border-b-2 transition-colors ${
              activeTab === tab ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-600 hover:text-slate-800'
            }`}>
            {tab === 'reports' ? `Wellbeing Reports (${reports.length})` : `Behavior Records (${behavior.length})`}
          </button>
        ))}
      </div>

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-slate-400 text-center py-8">Loading...</p>
          ) : reports.length === 0 ? (
            <div className="card p-8 text-center text-slate-400">No wellbeing reports yet</div>
          ) : reports.map(r => (
            <div key={r.id} className="card p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">{MOOD_EMOJIS[r.mood_rating || 3]}</div>
                  <div>
                    <p className="font-semibold text-slate-800">{r.student_name}</p>
                    <p className="text-sm text-slate-500 capitalize">{r.concern_type} concern • {new Date(r.session_date).toLocaleDateString()} • {r.counselor_name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    r.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    'bg-blue-100 text-blue-700'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                  {canManage && r.status !== 'resolved' && (
                    <button className="btn btn-sm btn-secondary"
                      onClick={() => updateStatusMutation.mutate({ id: r.id, status: r.status === 'open' ? 'in_progress' : 'resolved' })}>
                      {r.status === 'open' ? 'In Progress' : 'Resolve'}
                    </button>
                  )}
                </div>
              </div>
              {r.description && <p className="text-sm text-slate-600 mt-2 pl-11">{r.description}</p>}
              {r.interventions && <p className="text-sm text-slate-500 mt-1 pl-11 italic">Intervention: {r.interventions}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Behavior Tab */}
      {activeTab === 'behavior' && (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="table-th">Student</th>
                <th className="table-th">Type</th>
                <th className="table-th">Date</th>
                <th className="table-th">Description</th>
                <th className="table-th">Action Taken</th>
                <th className="table-th">Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {behavior.length === 0 ? (
                <tr><td colSpan={6} className="table-td text-center text-slate-400 py-8">No behavior records</td></tr>
              ) : behavior.map(b => (
                <tr key={b.id} className="hover:bg-slate-50">
                  <td className="table-td font-medium">{b.student_name}</td>
                  <td className="table-td">
                    <span className={`text-xs px-2 py-0.5 rounded-full capitalize font-medium ${
                      b.incident_type === 'positive' ? 'bg-green-100 text-green-700' :
                      b.incident_type === 'negative' ? 'bg-red-100 text-red-700' :
                      'bg-amber-100 text-amber-700'}`}>
                      {b.incident_type}
                    </span>
                  </td>
                  <td className="table-td">{new Date(b.incident_date).toLocaleDateString()}</td>
                  <td className="table-td text-slate-600 text-sm max-w-xs truncate">{b.description || '—'}</td>
                  <td className="table-td text-slate-500 text-sm">{b.action_taken || '—'}</td>
                  <td className="table-td text-slate-500 text-sm">{b.recorded_by_name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Wellbeing Report Modal */}
      <Modal isOpen={showReportModal} onClose={() => setShowReportModal(false)} title="New Wellbeing Report" size="md">
        <form onSubmit={e => { e.preventDefault(); reportMutation.mutate(reportForm); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select className="select w-full" required value={reportForm.student_id} onChange={e => setReportForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Session Date</label>
              <input type="date" className="input w-full" required value={reportForm.session_date} onChange={e => setReportForm(f => ({ ...f, session_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Concern Type</label>
              <select className="select w-full" value={reportForm.concern_type} onChange={e => setReportForm(f => ({ ...f, concern_type: e.target.value }))}>
                {CONCERN_TYPES.map(c => <option key={c} value={c} className="capitalize">{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mood Rating {MOOD_EMOJIS[parseInt(reportForm.mood_rating)]}</label>
            <input type="range" min="1" max="5" className="w-full accent-primary-500" value={reportForm.mood_rating} onChange={e => setReportForm(f => ({ ...f, mood_rating: e.target.value }))} />
            <div className="flex justify-between text-xs text-slate-400 mt-0.5">
              <span>Very Poor (1)</span><span>Excellent (5)</span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="input w-full" rows={3} value={reportForm.description} onChange={e => setReportForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Interventions / Action Plan</label>
            <textarea className="input w-full" rows={2} value={reportForm.interventions} onChange={e => setReportForm(f => ({ ...f, interventions: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={reportMutation.isPending}>
              {reportMutation.isPending ? 'Saving...' : 'Create Report'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowReportModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>

      {/* Behavior Modal */}
      <Modal isOpen={showBehaviorModal} onClose={() => setShowBehaviorModal(false)} title="Behavior Record" size="sm">
        <form onSubmit={e => { e.preventDefault(); behaviorMutation.mutate(behaviorForm); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select className="select w-full" required value={behaviorForm.student_id} onChange={e => setBehaviorForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <select className="select w-full" value={behaviorForm.incident_type} onChange={e => setBehaviorForm(f => ({ ...f, incident_type: e.target.value }))}>
                {BEHAVIOR_TYPES.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Incident Date</label>
              <input type="date" className="input w-full" required value={behaviorForm.incident_date} onChange={e => setBehaviorForm(f => ({ ...f, incident_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea className="input w-full" rows={2} value={behaviorForm.description} onChange={e => setBehaviorForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Action Taken</label>
            <textarea className="input w-full" rows={2} value={behaviorForm.action_taken} onChange={e => setBehaviorForm(f => ({ ...f, action_taken: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={behaviorMutation.isPending}>
              {behaviorMutation.isPending ? 'Saving...' : 'Save Record'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowBehaviorModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
