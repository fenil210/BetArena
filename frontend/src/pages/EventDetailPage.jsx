import { useParams } from 'react-router-dom';
import { useEvent, useEventMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Calendar, Clock3, Goal, Radio, Target } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { Badge, EmptyState, LoadingRows, PageHeader, Panel } from '../components/ui';
import { useNow } from '../hooks/useNow';

function eventClock(event, now) {
    if (event.status === 'live') return 'Live now';
    if (!event.starts_at) return 'Time TBA';

    const diff = new Date(event.starts_at).getTime() - now.getTime();
    if (diff <= 0) return 'Kickoff window';

    const minutes = Math.floor(diff / 60000);
    const days = Math.floor(minutes / 1440);
    const hours = Math.floor((minutes % 1440) / 60);
    const mins = minutes % 60;

    if (days > 0) return `${days}d ${hours}h to kickoff`;
    if (hours > 0) return `${hours}h ${mins}m to kickoff`;
    return `${mins}m to kickoff`;
}

export default function EventDetailPage() {
    const { id } = useParams();
    const now = useNow(1000);
    const { data: event, isLoading: loadingE } = useEvent(id);
    const { data: markets, isLoading: loadingM } = useEventMarkets(id);

    if (loadingE) {
        return <LoadingRows count={2} />;
    }

    if (!event) {
        return <EmptyState title="Event not found" description="The requested event could not be loaded." />;
    }

    return (
        <div className="page-stack">
            <Panel className="match-hero p-5 sm:p-6">
                <PageHeader
                    icon={<Goal className="h-6 w-6" />}
                    title={event.title}
                    description={event.description}
                    actions={<Badge status={event.status} />}
                />

                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            Match clock
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-950">{eventClock(event, now)}</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <Target className="h-3.5 w-3.5" />
                            Markets
                        </p>
                        <p className="mt-1 text-base font-semibold text-teal-900">{markets?.length ?? 0} listed</p>
                    </div>
                    <div className="rounded-md border border-slate-200 bg-white/80 p-3">
                        <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
                            <Radio className="h-3.5 w-3.5" />
                            Desk status
                        </p>
                        <p className="mt-1 text-base font-semibold text-slate-950">
                            {event.status === 'live' ? 'Watching live movement' : 'Ready for market activity'}
                        </p>
                    </div>
                </div>

                {event.starts_at && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white/80 px-3 py-2 text-sm font-medium text-slate-600">
                        <Calendar className="h-4 w-4" />
                        {formatDateTime(event.starts_at)}
                    </div>
                )}
            </Panel>

            {loadingM ? (
                <LoadingRows count={3} />
            ) : markets?.length === 0 ? (
                <EmptyState
                    icon={<Target className="h-6 w-6" />}
                    title="No markets for this event yet"
                    description="Check back when the admin opens betting."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    {markets.map((market) => (
                        <MarketCard key={market.id} market={market} />
                    ))}
                </div>
            )}
        </div>
    );
}
