import { useParams } from 'react-router-dom';
import { useEvent, useEventMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Calendar, Goal, Target } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { Badge, EmptyState, LoadingRows, PageHeader, Panel } from '../components/ui';

export default function EventDetailPage() {
    const { id } = useParams();
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
            <Panel className="p-5 sm:p-6">
                <PageHeader
                    icon={<Goal className="h-6 w-6" />}
                    title={event.title}
                    description={event.description}
                    actions={<Badge status={event.status} />}
                />
                {event.starts_at && (
                    <div className="mt-4 inline-flex items-center gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
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
