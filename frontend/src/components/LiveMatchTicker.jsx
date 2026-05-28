import { useQueries } from '@tanstack/react-query';
import { Activity, CalendarClock, CircleDot, Goal, Radio, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import client from '../api/client';
import { useNow } from '../hooks/useNow';
import { formatDateTime } from '../utils/formatDate';
import { Badge, Panel, cx } from './ui';

function getCountdown(startsAt, now) {
    if (!startsAt) return 'Schedule pending';

    const diff = new Date(startsAt).getTime() - now.getTime();
    if (diff <= 0) return 'Kickoff window';

    const totalMinutes = Math.floor(diff / 60000);
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
}

function normalizeEvents(results, tournaments) {
    const events = [];

    results.forEach((result, index) => {
        const tournament = tournaments[index];
        if (!result.data || !Array.isArray(result.data)) return;

        result.data.forEach((event) => {
            events.push({
                ...event,
                tournamentName: tournament?.name,
            });
        });
    });

    return events
        .filter((event) => event.status === 'live' || event.status === 'upcoming')
        .sort((a, b) => {
            if (a.status === 'live' && b.status !== 'live') return -1;
            if (b.status === 'live' && a.status !== 'live') return 1;
            return new Date(a.starts_at || 0) - new Date(b.starts_at || 0);
        })
        .slice(0, 5);
}

export default function LiveMatchTicker({ tournaments = [] }) {
    const now = useNow(1000);
    const tournamentSlice = tournaments.slice(0, 5);

    const eventQueries = useQueries({
        queries: tournamentSlice.map((tournament) => ({
            queryKey: ['events', tournament.id, 'football-pulse'],
            queryFn: () => client.get(`/tournaments/${tournament.id}/events`).then((r) => r.data),
            enabled: !!tournament.id,
            refetchInterval: 30000,
            staleTime: 15000,
        })),
    });

    const events = normalizeEvents(eventQueries, tournamentSlice);
    const liveCount = events.filter((event) => event.status === 'live').length;
    const isFetching = eventQueries.some((query) => query.isFetching);
    const nextEvent = events[0];

    return (
        <Panel className="football-pulse overflow-hidden">
            <div className="football-pulse__pitch" aria-hidden="true">
                <span className="football-pulse__line" />
                <span className="football-pulse__ball" />
            </div>

            <div className="relative grid gap-5 p-5 sm:p-6 lg:grid-cols-[300px_1fr] lg:items-center">
                <div>
                    <div className="mb-4 flex items-center gap-2">
                        <span className={cx('live-indicator', liveCount > 0 && 'is-live')}>
                            <Radio className="h-3.5 w-3.5" />
                            {liveCount > 0 ? `${liveCount} live` : 'Match desk'}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <RefreshCw className={cx('h-3.5 w-3.5', isFetching && 'animate-spin')} />
                            30s refresh
                        </span>
                    </div>

                    <h2 className="text-xl font-semibold tracking-tight text-slate-950">
                        Football pulse
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                        Upcoming kickoffs, live markets, and betting activity stay close without turning the dashboard noisy.
                    </p>

                    <div className="mt-5 grid grid-cols-2 gap-3">
                        <div className="rounded-md border border-slate-200 bg-white/85 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Next kickoff</p>
                            <p className="mt-1 text-lg font-semibold text-slate-950">
                                {nextEvent ? getCountdown(nextEvent.starts_at, now) : '--'}
                            </p>
                        </div>
                        <div className="rounded-md border border-slate-200 bg-white/85 p-3">
                            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Coverage</p>
                            <p className="mt-1 text-lg font-semibold text-teal-900">{events.length || 0} fixtures</p>
                        </div>
                    </div>
                </div>

                <div className="min-w-0">
                    {events.length === 0 ? (
                        <div className="rounded-lg border border-dashed border-slate-300 bg-white/75 p-5">
                            <div className="flex items-center gap-3">
                                <span className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                    <Goal className="h-5 w-5" />
                                </span>
                                <div>
                                    <p className="font-semibold text-slate-950">No live fixtures in range</p>
                                    <p className="mt-1 text-sm text-slate-500">Markets and fixtures will appear as tournaments are synced.</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="live-ticker" aria-label="Live and upcoming football events">
                            <div className="live-ticker__track">
                                {[...events, ...events].map((event, index) => (
                                    <Link
                                        key={`${event.id}-${index}`}
                                        to={`/events/${event.id}`}
                                        className="live-ticker__item"
                                    >
                                        <span className="flex min-w-0 items-center gap-2">
                                            {event.status === 'live' ? (
                                                <CircleDot className="h-4 w-4 text-teal-800" />
                                            ) : (
                                                <CalendarClock className="h-4 w-4 text-slate-500" />
                                            )}
                                            <span className="truncate font-semibold text-slate-950">{event.title}</span>
                                        </span>
                                        <span className="flex shrink-0 items-center gap-2">
                                            <Badge status={event.status} />
                                            <span className="text-xs font-medium text-slate-500">
                                                {event.status === 'live'
                                                    ? 'Live now'
                                                    : getCountdown(event.starts_at, now)}
                                            </span>
                                        </span>
                                        <span className="col-span-2 truncate text-xs text-slate-500">
                                            {event.tournamentName} - {event.starts_at ? formatDateTime(event.starts_at) : 'Time TBA'}
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-3 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                        <Activity className="h-3.5 w-3.5 text-teal-800" />
                        Odds trends and leaderboards keep refreshing while this page stays open.
                    </div>
                </div>
            </div>
        </Panel>
    );
}
