import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { feesApi, studentsApi } from '../../services/api';
import { PlusCircle, CreditCard } from 'lucide-react';
import { FeeStatusBadge } from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Fee, Student } from '../../types';

export default function FeesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [filterTerm, setFilterTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showPayModal, setShowPayModal] = useState(false);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [selectedFee, setSelectedFee] = useState<Fee | null>(null);
  const [payForm, setPayForm] = useState({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference: '' });
  const [feeForm, setFeeForm] = useState({ student_id: '', fee_type: 'tuition', amount: '', term: 'Term 1', due_date: '', description: '' });

  const { data: fees = [], isLoading } = useQuery<Fee[]>({
    queryKey: ['fees', filterTerm, filterStatus],
    queryFn: () => feesApi.list({ term: filterTerm, status: filterStatus }).then(r => r.data),
  });

  const { data: students = [] } = useQuery<Student[]>({
    queryKey: ['students'],
    queryFn: () => studentsApi.list({}).then(r => r.data),
    enabled: user?.role === 'admin',
  });

  const payMutation = useMutation({
    mutationFn: ({ feeId, data }: { feeId: number; data: typeof payForm }) => feesApi.recordPayment(feeId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Payment recorded');
      setShowPayModal(false);
      setSelectedFee(null);
      setPayForm({ amount: '', payment_date: new Date().toISOString().split('T')[0], payment_method: 'cash', reference: '' });
    },
    onError: () => toast.error('Failed to record payment'),
  });

  const createFeeMutation = useMutation({
    mutationFn: (data: typeof feeForm) => feesApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['fees'] });
      toast.success('Fee record created');
      setShowFeeModal(false);
      setFeeForm({ student_id: '', fee_type: 'tuition', amount: '', term: 'Term 1', due_date: '', description: '' });
    },
    onError: () => toast.error('Failed to create fee'),
  });

  const totalAmount = fees.reduce((s, f) => s + f.amount, 0);
  const totalPaid = fees.reduce((s, f) => s + f.amount_paid, 0);
  const totalBalance = totalAmount - totalPaid;

  const openPayModal = (fee: Fee) => {
    setSelectedFee(fee);
    setPayForm(p => ({ ...p, amount: String(fee.balance) }));
    setShowPayModal(true);
  };

  const terms = ['Term 1', 'Term 2', 'Term 3'];
  const methods = ['cash', 'bank_transfer', 'mobile_money', 'cheque'];
  const feeTypes = ['tuition', 'sports', 'pta', 'lab', 'library', 'exam', 'other'];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Fee Management</h1>
          <p className="text-sm text-slate-500">{fees.length} records</p>
        </div>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowFeeModal(true)}>
            <PlusCircle className="w-4 h-4" /> Add Fee Record
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-slate-800">GH¢{totalAmount.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Total Expected</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-green-600">GH¢{totalPaid.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Total Collected</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-2xl font-bold text-red-600">GH¢{totalBalance.toLocaleString()}</p>
          <p className="text-xs text-slate-500 mt-1">Outstanding</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3">
        <select className="select" value={filterTerm} onChange={e => setFilterTerm(e.target.value)}>
          <option value="">All Terms</option>
          {terms.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select className="select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Statuses</option>
          {['paid', 'partial', 'pending', 'overdue'].map(s => <option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        {(filterTerm || filterStatus) && (
          <button className="btn btn-secondary" onClick={() => { setFilterTerm(''); setFilterStatus(''); }}>Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="table-th">Student</th>
              <th className="table-th">Fee Type</th>
              <th className="table-th">Term</th>
              <th className="table-th">Amount</th>
              <th className="table-th">Paid</th>
              <th className="table-th">Balance</th>
              <th className="table-th">Due Date</th>
              <th className="table-th">Status</th>
              {['admin', 'teacher'].includes(user?.role || '') && <th className="table-th">Action</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} className="table-td text-center text-slate-400">Loading...</td></tr>
            ) : fees.length === 0 ? (
              <tr><td colSpan={9} className="table-td text-center text-slate-400 py-8">No fee records found</td></tr>
            ) : fees.map(f => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="table-td font-medium">{f.student_name}</td>
                <td className="table-td capitalize">{f.fee_type}</td>
                <td className="table-td">{f.term}</td>
                <td className="table-td">GH¢{f.amount.toLocaleString()}</td>
                <td className="table-td text-green-600">GH¢{f.amount_paid.toLocaleString()}</td>
                <td className="table-td font-semibold text-red-600">GH¢{f.balance.toLocaleString()}</td>
                <td className="table-td">{f.due_date ? new Date(f.due_date).toLocaleDateString() : '—'}</td>
                <td className="table-td"><FeeStatusBadge status={f.payment_status} /></td>
                {['admin', 'teacher'].includes(user?.role || '') && (
                  <td className="table-td">
                    {f.balance > 0 && (
                      <button className="btn btn-sm btn-primary" onClick={() => openPayModal(f)}>
                        <CreditCard className="w-3 h-3" /> Pay
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Record Payment Modal */}
      <Modal isOpen={showPayModal} onClose={() => setShowPayModal(false)} title="Record Payment" size="sm">
        {selectedFee && (
          <form onSubmit={e => { e.preventDefault(); payMutation.mutate({ feeId: selectedFee.id, data: payForm }); }} className="space-y-4">
            <div className="p-3 bg-slate-50 rounded-lg text-sm">
              <p className="font-medium">{selectedFee.student_name}</p>
              <p className="text-slate-500">{selectedFee.fee_type} • {selectedFee.term}</p>
              <p className="text-slate-500 mt-1">Outstanding: <span className="font-semibold text-red-600">GH¢{selectedFee.balance.toLocaleString()}</span></p>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Amount (GH¢)</label>
              <input type="number" min="1" max={selectedFee.balance} step="0.01" className="input w-full" required value={payForm.amount} onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Payment Date</label>
              <input type="date" className="input w-full" required value={payForm.payment_date} onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Method</label>
              <select className="select w-full" value={payForm.payment_method} onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}>
                {methods.map(m => <option key={m} value={m} className="capitalize">{m.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Reference</label>
              <input type="text" className="input w-full" placeholder="e.g. receipt number" value={payForm.reference} onChange={e => setPayForm(p => ({ ...p, reference: e.target.value }))} />
            </div>
            <div className="flex gap-2 pt-2">
              <button type="submit" className="btn btn-primary flex-1" disabled={payMutation.isPending}>
                {payMutation.isPending ? 'Saving...' : 'Confirm Payment'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
            </div>
          </form>
        )}
      </Modal>

      {/* Create Fee Modal */}
      <Modal isOpen={showFeeModal} onClose={() => setShowFeeModal(false)} title="Add Fee Record" size="sm">
        <form onSubmit={e => { e.preventDefault(); createFeeMutation.mutate(feeForm); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Student</label>
            <select className="select w-full" required value={feeForm.student_id} onChange={e => setFeeForm(f => ({ ...f, student_id: e.target.value }))}>
              <option value="">Select student...</option>
              {students.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Fee Type</label>
              <select className="select w-full" value={feeForm.fee_type} onChange={e => setFeeForm(f => ({ ...f, fee_type: e.target.value }))}>
                {feeTypes.map(t => <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Term</label>
              <select className="select w-full" value={feeForm.term} onChange={e => setFeeForm(f => ({ ...f, term: e.target.value }))}>
                {terms.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Amount (GH¢)</label>
              <input type="number" min="1" step="0.01" className="input w-full" required value={feeForm.amount} onChange={e => setFeeForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Due Date</label>
              <input type="date" className="input w-full" value={feeForm.due_date} onChange={e => setFeeForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input type="text" className="input w-full" placeholder="e.g. 2025/2026 Academic Year" value={feeForm.description} onChange={e => setFeeForm(f => ({ ...f, description: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={createFeeMutation.isPending}>
              {createFeeMutation.isPending ? 'Creating...' : 'Create Fee'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowFeeModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
