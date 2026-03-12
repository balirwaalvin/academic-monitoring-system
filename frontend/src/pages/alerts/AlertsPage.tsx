import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { alertsApi } from '../../services/api';
import { Zap, CheckCircle, PlusCircle } from 'lucide-react';
import { SeverityBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { EarlyWarning } from '../../types';

export default function AlertsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterResolved, setFilterResolved] = useState('false');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<EarlyWarning | null>(null);
  const [resolveNotes, setResolveNotes] = useState('');

  const { data: alerts = [], isLoading } = useQuery<EarlyWarning[]>({
    queryKey: ['alerts', filterSeverity, filterResolved],
    queryFn: () => alertsApi.list({ severity: filterSeverity, resolved: filterResolved }).then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => alertsApi.generate(),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      const count = res.data?.generated || 0;
      toast.success(count > 0 ? `Generated ${count} new warning${count > 1 ? 's' : ''}` : 'No new issues detected');
    },
    onError: () => toast.error('Scan failed'),
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: number; notes: string }) => alertsApi.resolve(id, { resolution_notes: notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert resolved');
      setShowResolveModal(false);
      setSelectedAlert(null);
      setResolveNotes('');
    },
    onError: () => toast.error('Failed to resolve'),
  });

  const openResolve = (alert: EarlyWarning) => {
    setSelectedAlert(alert);
    setResolveNotes('');
    setShowResolveModal(true);
  };

  const canManage = ['admin', 'counselor', 'teacher'].includes(user?.role || '');

  const activeCount = alerts.filter(a => !a.resolved).length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Early Warning Alerts</h1>
          <p className="text-sm text-slate-500">{activeCount} active {activeCount === 1 ? 'alert' : 'alerts'}</p>
        </div>
        {canManage && (
          <button className="btn btn-primary" onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <Zap className="w-4 h-4" />
            {generateMutation.isPending ? 'Scanning...' : 'Run AI Scan'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="select" value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)}>
          <option value="">All Severities</option>
          {['low', 'medium', 'high', 'critical'].map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <select className="select" value={filterResolved} onChange={e => setFilterResolved(e.target.value)}>
          <option value="false">Active Only</option>
          <option value="true">Resolved Only</option>
          <option value="">All</option>
        </select>
        {(filterSeverity || filterResolved !== 'false') && (
          <button className="btn btn-secondary" onClick={() => { setFilterSeverity(''); setFilterResolved('false'); }}>Reset</button>
        )}
      </div>

      {/* Alert Cards */}
      {isLoading ? (
        <p className="text-center text-slate-400 py-10">Loading...</p>
      ) : alerts.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-400" />
          <p className="font-medium text-green-600">No alerts found</p>
          <p className="text-sm mt-1">All students are within normal ranges</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(a => (
            <div key={a.id} className={`card p-4 border-l-4 ${
              a.severity === 'critical' ? 'border-l-red-500' :
              a.severity === 'high' ? 'border-l-orange-500' :
              a.severity === 'medium' ? 'border-l-amber-500' :
              'border-l-blue-400'
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-800">{a.student_name}</p>
                    <SeverityBadge severity={a.severity} />
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize">{a.warning_type?.replace('_', ' ')}</span>
                    {a.resolved && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Resolved</span>}
                  </div>
                  <p className="text-sm text-slate-600 mt-1.5">{a.description}</p>
                  {a.resolution_notes && (
                    <p className="text-xs text-slate-400 mt-1 italic">Resolution: {a.resolution_notes}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1.5">{new Date(a.created_at).toLocaleDateString()}</p>
                </div>
                {canManage && !a.resolved && (
                  <button className="btn btn-sm btn-secondary shrink-0" onClick={() => openResolve(a)}>
                    <CheckCircle className="w-3.5 h-3.5" /> Resolve
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolve Modal */}
      <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Alert" size="sm">
        {selectedAlert && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-medium">{selectedAlert.student_name}</p>
              <p className="text-slate-500 mt-0.5">{selectedAlert.description}</p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Resolution Notes</label>
              <textarea className="input w-full" rows={3} placeholder="Describe actions taken..." value={resolveNotes} onChange={e => setResolveNotes(e.target.value)} />
            </div>
            <div className="flex gap-2 pt-1">
              <button className="btn btn-primary flex-1" disabled={resolveMutation.isPending}
                onClick={() => resolveMutation.mutate({ id: selectedAlert.id, notes: resolveNotes })}>
                {resolveMutation.isPending ? 'Saving...' : 'Mark as Resolved'}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>Cancel</button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
