import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { announcementsApi } from '../../services/api';
import { PlusCircle, Megaphone, Trash2 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Announcement } from '../../types';

const PRIORITY_STYLES: Record<string, string> = {
  high: 'bg-red-100 text-red-700 border-red-200',
  medium: 'bg-amber-100 text-amber-700 border-amber-200',
  low: 'bg-blue-100 text-blue-700 border-blue-200',
  normal: 'bg-slate-100 text-slate-700 border-slate-200',
};

const ROLES = ['all', 'admin', 'teacher', 'parent', 'student', 'counselor'];

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', content: '', target_roles: 'all', priority: 'normal', expires_at: '' });

  const { data: announcements = [], isLoading } = useQuery<Announcement[]>({
    queryKey: ['announcements'],
    queryFn: () => {
      const fn = ['admin'].includes(user?.role || '') ? announcementsApi.all : announcementsApi.list;
      return fn().then(r => r.data);
    },
  });

  const createMutation = useMutation({
    mutationFn: (d: typeof form) => announcementsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['announcements'] });
      toast.success('Announcement published');
      setShowModal(false);
      setForm({ title: '', content: '', target_roles: 'all', priority: 'normal', expires_at: '' });
    },
    onError: () => toast.error('Failed to create announcement'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => announcementsApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['announcements'] }); toast.success('Deleted'); },
    onError: () => toast.error('Failed to delete'),
  });

  const canCreate = ['admin', 'teacher'].includes(user?.role || '');

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Announcements</h1>
          <p className="text-sm text-slate-500">{announcements.length} announcements</p>
        </div>
        {canCreate && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <PlusCircle className="w-4 h-4" /> New Announcement
          </button>
        )}
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400 py-10">Loading...</p>
      ) : announcements.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No announcements yet</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {announcements.map(a => (
            <div key={a.id} className={`card p-5 border ${PRIORITY_STYLES[a.priority || 'normal']}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-800">{a.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize border ${PRIORITY_STYLES[a.priority || 'normal']}`}>
                      {a.priority}
                    </span>
                    <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full capitalize border border-slate-200">
                      {a.target_roles === 'all' ? 'Everyone' : a.target_roles}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-2 text-sm leading-relaxed">{a.content}</p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                    <span>By {a.author_name}</span>
                    <span>•</span>
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    {a.expires_at && <><span>•</span><span>Expires {new Date(a.expires_at).toLocaleDateString()}</span></>}
                  </div>
                </div>
                {user?.role === 'admin' && (
                  <button className="btn btn-sm btn-danger shrink-0" onClick={() => {
                    if (confirm('Delete this announcement?')) deleteMutation.mutate(a.id);
                  }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Announcement" size="md">
        <form onSubmit={e => { e.preventDefault(); createMutation.mutate(form); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Title</label>
            <input type="text" className="input w-full" required placeholder="Announcement title..." value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Content</label>
            <textarea className="input w-full" rows={4} required placeholder="Announcement details..." value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1">Target Audience</label>
              <select className="select w-full" value={form.target_roles} onChange={e => setForm(f => ({ ...f, target_roles: e.target.value }))}>
                {ROLES.map(r => <option key={r} value={r} className="capitalize">{r === 'all' ? 'Everyone' : r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Priority</label>
              <select className="select w-full" value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {['low', 'normal', 'medium', 'high'].map(p => <option key={p} value={p} className="capitalize">{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Expires On (optional)</label>
            <input type="date" className="input w-full" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Publishing...' : 'Publish'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
