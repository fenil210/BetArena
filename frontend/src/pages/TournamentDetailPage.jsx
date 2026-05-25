import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournament, useTournamentEvents, useTournamentMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Trophy, Calendar, ArrowRight, Filter } from 'lucide-react';
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

export default function TournamentDetailPage() {
    const { id } = useParams();
    const [statusFilter, setStatusFilter] = useState('');

    const { data: tournament, isLoading: loadingT } = useTournament(id);
    const eventsQueryStatus = statusFilter === 'all' ? null : statusFilter;
    const { data: events, isLoading: loadingE } = useTournamentEvents(id, eventsQueryStatus);
    const { data: markets } = useTournamentMarkets(id);

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
                    <Panel className="divide-y divide-slate-200 overflow-hidden">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.id}`}
                                className="group flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50"
                            >
                                <div className="min-w-0">
                                    <h3 className="truncate text-base font-semibold text-slate-950">{event.title}</h3>
                                    <div className="mt-2 flex flex-wrap items-center gap-2">
                                        <Badge status={event.status} />
                                        {event.starts_at && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                                <Calendar className="h-3.5 w-3.5" />
                                                {formatDateTime(event.starts_at)}
                                            </span>
                                        )}
                                    </div>
                                    {event.description && <p className="mt-1 text-sm text-slate-500">{event.description}</p>}
                                </div>
                                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-teal-800" />
                            </Link>
                        ))}
                    </Panel>
                )}
            </section>
        </div>
    );
}
