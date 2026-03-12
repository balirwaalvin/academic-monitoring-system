import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { messagesApi } from '../../services/api';
import { Send, Inbox, Edit3 } from 'lucide-react';
import Modal from '../../components/common/Modal';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import type { Message } from '../../types';

export default function MessagesPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent'>('inbox');
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showCompose, setShowCompose] = useState(false);
  const [composeForm, setComposeForm] = useState({ recipient_id: '', subject: '', content: '' });

  const { data: inbox = [], isLoading: inboxLoading } = useQuery<Message[]>({
    queryKey: ['messages', 'inbox'],
    queryFn: () => messagesApi.list('inbox').then(r => r.data),
  });

  const { data: sent = [], isLoading: sentLoading } = useQuery<Message[]>({
    queryKey: ['messages', 'sent'],
    queryFn: () => messagesApi.list('sent').then(r => r.data),
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['contacts'],
    queryFn: () => messagesApi.contacts().then(r => r.data),
  });

  const sendMutation = useMutation({
    mutationFn: (d: typeof composeForm) => messagesApi.send(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['messages'] });
      toast.success('Message sent');
      setShowCompose(false);
      setComposeForm({ recipient_id: '', subject: '', content: '' });
    },
    onError: () => toast.error('Failed to send message'),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: number) => messagesApi.markRead(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['messages'] }),
  });

  const handleOpenMessage = (msg: Message) => {
    setSelectedMessage(msg);
    if (!msg.is_read && activeTab === 'inbox') {
      markReadMutation.mutate(msg.id);
    }
  };

  const messages = activeTab === 'inbox' ? inbox : sent;
  const isLoading = activeTab === 'inbox' ? inboxLoading : sentLoading;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Messages</h1>
          <p className="text-sm text-slate-500">{inbox.filter(m => !m.is_read).length} unread</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowCompose(true)}>
          <Edit3 className="w-4 h-4" /> Compose
        </button>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        <button onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'inbox' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}>
          <Inbox className="w-4 h-4" /> Inbox
          {inbox.filter(m => !m.is_read).length > 0 && (
            <span className="bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {inbox.filter(m => !m.is_read).length}
            </span>
          )}
        </button>
        <button onClick={() => { setActiveTab('sent'); setSelectedMessage(null); }}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'sent' ? 'border-primary-500 text-primary-700' : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}>
          <Send className="w-4 h-4" /> Sent
        </button>
      </div>

      <div className="flex gap-5">
        {/* Message List */}
        <div className="w-80 flex-shrink-0 card overflow-hidden">
          {isLoading ? (
            <p className="text-center text-slate-400 p-8">Loading...</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-400 p-8">No messages</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {messages.map(m => (
                <div key={m.id} onClick={() => handleOpenMessage(m)}
                  className={`p-3.5 cursor-pointer transition-colors hover:bg-slate-50 ${
                    selectedMessage?.id === m.id ? 'bg-primary-50' : ''
                  } ${!m.is_read && activeTab === 'inbox' ? 'border-l-4 border-l-primary-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <p className={`text-sm truncate ${!m.is_read && activeTab === 'inbox' ? 'font-semibold text-slate-800' : 'text-slate-700'}`}>
                      {activeTab === 'inbox' ? m.sender_name : m.recipient_name}
                    </p>
                    <span className="text-[10px] text-slate-400">{new Date(m.created_at).toLocaleDateString()}</span>
                  </div>
                  <p className={`text-xs mt-0.5 truncate ${!m.is_read && activeTab === 'inbox' ? 'font-medium text-slate-700' : 'text-slate-500'}`}>
                    {m.subject}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="flex-1 card p-5">
          {selectedMessage ? (
            <div className="space-y-4">
              <div className="border-b border-slate-100 pb-4">
                <h3 className="text-lg font-semibold text-slate-800">{selectedMessage.subject}</h3>
                <p className="text-sm text-slate-500 mt-1">
                  {activeTab === 'inbox' ? `From: ${selectedMessage.sender_name}` : `To: ${selectedMessage.recipient_name}`}
                  <span className="mx-2">•</span>{new Date(selectedMessage.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">{selectedMessage.content}</p>
              {activeTab === 'inbox' && (
                <button className="btn btn-secondary btn-sm mt-4" onClick={() => {
                  setComposeForm({ recipient_id: String(selectedMessage.sender_id), subject: `Re: ${selectedMessage.subject}`, content: '' });
                  setShowCompose(true);
                }}>
                  Reply
                </button>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-400 py-16">
              <div className="text-5xl mb-3">✉️</div>
              <p>Select a message to read</p>
            </div>
          )}
        </div>
      </div>

      {/* Compose Modal */}
      <Modal isOpen={showCompose} onClose={() => setShowCompose(false)} title="New Message" size="md">
        <form onSubmit={e => { e.preventDefault(); sendMutation.mutate(composeForm); }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">To</label>
            <select className="select w-full" required value={composeForm.recipient_id} onChange={e => setComposeForm(f => ({ ...f, recipient_id: e.target.value }))}>
              <option value="">Select recipient...</option>
              {contacts.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name} ({c.role})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Subject</label>
            <input type="text" className="input w-full" required placeholder="Subject..." value={composeForm.subject} onChange={e => setComposeForm(f => ({ ...f, subject: e.target.value }))} />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Message</label>
            <textarea className="input w-full" rows={5} required placeholder="Write your message..." value={composeForm.content} onChange={e => setComposeForm(f => ({ ...f, content: e.target.value }))} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="submit" className="btn btn-primary flex-1" disabled={sendMutation.isPending}>
              {sendMutation.isPending ? 'Sending...' : <><Send className="w-4 h-4" /> Send</>}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => setShowCompose(false)}>Cancel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
