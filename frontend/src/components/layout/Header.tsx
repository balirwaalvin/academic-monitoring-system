import { useState } from 'react';
import { Bell, Search } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import clsx from 'clsx';
import type { Notification } from '../../types';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/students': 'Students',
  '/grades': 'Academic Grades',
  '/attendance': 'Attendance',
  '/fees': 'Fee Management',
  '/wellbeing': 'Wellbeing & Counseling',
  '/messages': 'Messages',
  '/announcements': 'Announcements',
  '/analytics': 'Analytics & Reports',
  '/alerts': 'Early Warning System',
  '/calendar': 'School Calendar',
};

export default function Header() {
  const { user } = useAuth();
  const location = useLocation();
  const [showNotifs, setShowNotifs] = useState(false);
  const qc = useQueryClient();

  const { data: notifData } = useQuery({
    queryKey: ['notifications'],
    queryFn: () => notificationsApi.list().then(r => r.data as Notification[]),
    refetchInterval: 30000,
  });

  const { data: countData } = useQuery({
    queryKey: ['notif-count'],
    queryFn: () => notificationsApi.unreadCount().then(r => r.data),
    refetchInterval: 30000,
  });

  const markRead = useMutation({
    mutationFn: (id: number) => notificationsApi.markRead(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); }
  });

  const markAll = useMutation({
    mutationFn: () => notificationsApi.markAllRead(),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); qc.invalidateQueries({ queryKey: ['notif-count'] }); }
  });

  const unreadCount = countData?.count || 0;
  const title = pageTitles[location.pathname] || 'SWAM-MIS';

  const typeColors: Record<string, string> = {
    alert: 'bg-red-100 text-red-700',
    warning: 'bg-amber-100 text-amber-700',
    info: 'bg-blue-100 text-blue-700',
    success: 'bg-green-100 text-green-700',
  };

  return (
    <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
      <div>
        <h2 className="text-lg font-semibold text-slate-800">{title}</h2>
        <p className="text-xs text-slate-500">
          {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowNotifs(!showNotifs)}
            className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <Bell className="w-5 h-5 text-slate-600" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showNotifs && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifs(false)} />
              <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                  <h3 className="font-semibold text-slate-800 text-sm">Notifications</h3>
                  {unreadCount > 0 && (
                    <button onClick={() => markAll.mutate()} className="text-xs text-primary-600 hover:underline">
                      Mark all read
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {!notifData || notifData.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-6">No notifications</p>
                  ) : (
                    notifData.slice(0, 10).map((n) => (
                      <div
                        key={n.id}
                        onClick={() => { if (!n.is_read) markRead.mutate(n.id); }}
                        className={clsx('px-4 py-3 border-b border-slate-50 cursor-pointer hover:bg-slate-50 transition-colors', !n.is_read && 'bg-blue-50/50')}
                      >
                        <div className="flex items-start gap-2">
                          <span className={clsx('text-[10px] px-1.5 py-0.5 rounded font-medium mt-0.5 flex-shrink-0', typeColors[n.type])}>
                            {n.type.toUpperCase()}
                          </span>
                          <div>
                            <p className="text-sm font-medium text-slate-800">{n.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-slate-400 mt-1">
                              {new Date(n.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* User avatar */}
        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
          <span className="text-primary-700 text-xs font-bold">
            {user?.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}
