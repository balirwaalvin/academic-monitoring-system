import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from '../../services/api';
import { Calendar, MapPin, Clock } from 'lucide-react';
import type { Event } from '../../types';

const EVENT_COLORS: Record<string, string> = {
  academic: 'bg-blue-100 text-blue-700 border-blue-200',
  sports: 'bg-green-100 text-green-700 border-green-200',
  cultural: 'bg-purple-100 text-purple-700 border-purple-200',
  meeting: 'bg-amber-100 text-amber-700 border-amber-200',
  holiday: 'bg-red-100 text-red-700 border-red-200',
  exam: 'bg-orange-100 text-orange-700 border-orange-200',
  other: 'bg-slate-100 text-slate-700 border-slate-200',
};

const EVENT_LEFT_BORDER: Record<string, string> = {
  academic: 'border-l-blue-400',
  sports: 'border-l-green-400',
  cultural: 'border-l-purple-400',
  meeting: 'border-l-amber-400',
  holiday: 'border-l-red-400',
  exam: 'border-l-orange-400',
  other: 'border-l-slate-400',
};

export default function CalendarPage() {
  const { data: events = [], isLoading } = useQuery<Event[]>({
    queryKey: ['events'],
    queryFn: () => analyticsApi.events().then(r => r.data),
  });

  const today = new Date();
  const upcoming = events.filter(e => new Date(e.start_date) >= today);
  const past = events.filter(e => new Date(e.start_date) < today);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-800">School Calendar</h1>
        <p className="text-sm text-slate-500">{upcoming.length} upcoming events</p>
      </div>

      {/* Legend */}
      <div className="card p-4">
        <p className="text-xs font-medium text-slate-500 mb-2">Event Types</p>
        <div className="flex flex-wrap gap-2">
          {Object.entries(EVENT_COLORS).map(([type, cls]) => (
            <span key={type} className={`text-xs px-2.5 py-1 rounded-full capitalize border font-medium ${cls}`}>{type}</span>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-center text-slate-400 py-10">Loading...</p>
      ) : events.length === 0 ? (
        <div className="card p-12 text-center text-slate-400">
          <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No events scheduled</p>
        </div>
      ) : (
        <div className="space-y-6">
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-3">Upcoming</h2>
              <div className="space-y-3">
                {upcoming.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">Past Events</h2>
              <div className="space-y-3 opacity-60">
                {past.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function EventCard({ event }: { event: Event }) {
  const start = new Date(event.start_date);
  const end = event.end_date ? new Date(event.end_date) : null;
  const type = event.event_type || 'other';
  const colorClass = EVENT_COLORS[type] || EVENT_COLORS.other;
  const borderClass = EVENT_LEFT_BORDER[type] || EVENT_LEFT_BORDER.other;

  return (
    <div className={`card p-4 border-l-4 ${borderClass}`}>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-2xl font-bold text-slate-700">{start.getDate()}</div>
          <div className="text-xs text-slate-400 uppercase">{start.toLocaleDateString('en', { month: 'short' })}</div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-800">{event.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full capitalize border font-medium ${colorClass}`}>{type}</span>
          </div>
          {event.description && <p className="text-sm text-slate-600 mt-1">{event.description}</p>}
          <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-400">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{start.toLocaleDateString()}{end && end.toDateString() !== start.toDateString() ? ` — ${end.toLocaleDateString()}` : ''}</span>
            {event.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event.location}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
