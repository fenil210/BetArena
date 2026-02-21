import { useParams } from 'react-router-dom';
import { useEvent, useEventMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Calendar, MapPin } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';

export default function EventDetailPage() {
    const { id } = useParams();
    const { data: event, isLoading: loadingE } = useEvent(id);
    const { data: markets, isLoading: loadingM } = useEventMarkets(id);

    if (loadingE) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-dark-700 rounded w-1/2" />
                <div className="h-4 bg-dark-700 rounded w-1/3" />
            </div>
        );
    }

    if (!event) {
        return (
            <div className="glass-card p-12 text-center">
                <p className="text-dark-400">Event not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Event header */}
            <div className="glass-card p-6 bg-gradient-to-br from-dark-800/80 to-dark-900/60">
                <h1 className="text-2xl font-bold text-white">{event.title}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className={`badge badge-${event.status === 'live' ? 'open' : event.status === 'upcoming' ? 'coming-soon' : 'settled'}`}>
                        {event.status}
                    </span>
                    {event.starts_at && (
                        <span className="text-sm text-dark-400 flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDateTime(event.starts_at)}
                        </span>
                    )}
                </div>
                {event.description && (
                    <p className="text-dark-400 mt-2">{event.description}</p>
                )}
            </div>

            {/* Markets */}
            {loadingM ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-6 animate-pulse">
                            <div className="h-5 bg-dark-700 rounded w-3/4 mb-4" />
                            <div className="grid grid-cols-3 gap-2">
                                <div className="h-12 bg-dark-700 rounded-xl" />
                                <div className="h-12 bg-dark-700 rounded-xl" />
                                <div className="h-12 bg-dark-700 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : markets?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <p className="text-dark-400 text-lg">No markets for this event yet</p>
                    <p className="text-dark-500 text-sm mt-1">Check back when the admin opens betting.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {markets.map((m) => (
                        <MarketCard key={m.id} market={m} />
                    ))}
                </div>
            )}
        </div>
    );
}
