import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournament, useTournamentEvents, useTournamentMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Trophy, Calendar, ArrowRight, Filter, CircleDot } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { Badge, EmptyState, LoadingRows, PageHeader, Panel, SelectInput } from '../components/ui';

const STATUS_OPTIONS = [
    { value: '', label: 'Active matches' },
    { value: 'all', label: 'All matches' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

function stageLabel(stage) {
    return String(stage || 'Fixtures').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupEventsByWeek(events = []) {
    const sorted = [...events].sort((a, b) => new Date(a.starts_at || 0) - new Date(b.starts_at || 0));
    const firstKickoff = sorted.find((event) => event.starts_at)?.starts_at;
    const firstTime = firstKickoff ? new Date(firstKickoff).getTime() : null;
    const groups = new Map();

    sorted.forEach((event) => {
        const eventTime = event.starts_at ? new Date(event.starts_at).getTime() : null;
        const week = firstTime && eventTime ? Math.floor((eventTime - firstTime) / (7 * 24 * 60 * 60 * 1000)) + 1 : null;
        const key = week ? `Week ${week}` : 'Schedule TBA';
        const label = `${key} · ${stageLabel(event.match?.stage)}`;
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(event);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function TournamentDetailPage() {
    const { id } = useParams();
    const [statusFilter, setStatusFilter] = useState('');

    const { data: tournament, isLoading: loadingT } = useTournament(id);
    const eventsQueryStatus = statusFilter || null;
    const { data: events, isLoading: loadingE } = useTournamentEvents(id, eventsQueryStatus);
    const { data: markets } = useTournamentMarkets(id);
    const eventGroups = groupEventsByWeek(events || []);

    if (loadingT) {
        return <LoadingRows count={2} />;
    }

    if (!tournament) {
        return <EmptyState title="Tournament not found" description="The requested tournament could not be loaded." />;
    }

    return (
        <div className="page-stack">
            <Panel className="p-5 sm:p-6">
                <PageHeader
                    icon={<Trophy className="h-6 w-6" />}
                    eyebrow={`Competition ${tournament.competition_id}`}
                    title={tournament.name}
                    description="Tournament markets and match-level events for this competition."
                    actions={<Badge status={tournament.status} />}
                />
            </Panel>

            {markets && markets.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-teal-800" />
                        <h2 className="text-base font-semibold text-slate-950">Tournament markets</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {markets.map((market) => (
                            <MarketCard key={market.id} market={market} />
                        ))}
                    </div>
                </section>
            )}

            <section className="space-y-3">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-800" />
                        <h2 className="text-base font-semibold text-slate-950">Matches and events</h2>
                    </div>
                    <div className="flex items-center gap-2 sm:w-72">
                        <Filter className="h-4 w-4 text-slate-500" />
                        <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                            {STATUS_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                        </SelectInput>
                    </div>
                </div>

                {loadingE ? (
                    <LoadingRows count={3} />
                ) : events?.length === 0 ? (
                    <EmptyState
                        icon={<Calendar className="h-6 w-6" />}
                        title={statusFilter === '' ? 'No active matches' : 'No matches found'}
                        description={statusFilter === '' ? 'There are no upcoming or live matches for this tournament.' : 'Try a different status filter.'}
                        action={statusFilter === '' && (
                            <button onClick={() => setStatusFilter('all')} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
                                View all matches
                            </button>
                        )}
                    />
                ) : (
                    <div className="space-y-4">
                        {eventGroups.map((group) => (
                            <Panel key={group.label} className="overflow-hidden">
                                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
                                    <h3 className="text-sm font-semibold text-slate-950">{group.label}</h3>
                                </div>
                                <div className="divide-y divide-slate-200">
                                    {group.items.map((event) => (
                                        <Link
                                            key={event.id}
                                            to={`/events/${event.id}`}
                                            className="match-row group flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                                        >
                                            <div className="min-w-0">
                                                <h3 className="flex items-center gap-2 truncate text-base font-semibold text-slate-950">
                                                    {event.status === 'live' && <CircleDot className="h-4 w-4 shrink-0 text-teal-800" />}
                                                    {event.match?.home_team?.crest_url && (
                                                        <img src={event.match.home_team.crest_url} alt="" className="h-5 w-5 shrink-0 object-contain" />
                                                    )}
                                                    <span className="truncate">{event.title}</span>
                                                    {event.match?.away_team?.crest_url && (
                                                        <img src={event.match.away_team.crest_url} alt="" className="h-5 w-5 shrink-0 object-contain" />
                                                    )}
                                                </h3>
                                                <div className="mt-2 flex flex-wrap items-center gap-2">
                                                    <Badge status={event.status} />
                                                    {event.match?.group_name && (
                                                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                                                            {event.match.group_name.replace('_', ' ')}
                                                        </span>
                                                    )}
                                                    {event.starts_at && (
                                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                                            <Calendar className="h-3.5 w-3.5" />
                                                            {formatDateTime(event.starts_at)}
                                                        </span>
                                                    )}
                                                </div>
                                                {event.match?.venue ? (
                                                    <p className="mt-1 text-sm text-slate-500">{event.match.venue}</p>
                                                ) : event.description && (
                                                    <p className="mt-1 text-sm text-slate-500">{event.description}</p>
                                                )}
                                            </div>
                                            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-teal-800" />
                                        </Link>
                                    ))}
                                </div>
                            </Panel>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}
