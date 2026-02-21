import { useParams, Link } from 'react-router-dom';
import { useTournament, useTournamentEvents, useTournamentMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Trophy, Calendar, ArrowRight, MapPin } from 'lucide-react';

export default function TournamentDetailPage() {
    const { id } = useParams();
    const { data: tournament, isLoading: loadingT } = useTournament(id);
    const { data: events, isLoading: loadingE } = useTournamentEvents(id);
    const { data: markets, isLoading: loadingM } = useTournamentMarkets(id);

    if (loadingT) {
        return (
            <div className="space-y-4 animate-pulse">
                <div className="h-8 bg-dark-700 rounded w-1/2" />
                <div className="h-4 bg-dark-700 rounded w-1/3" />
            </div>
        );
    }

    if (!tournament) {
        return (
            <div className="glass-card p-12 text-center">
                <p className="text-dark-400">Tournament not found</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="glass-card p-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent-500 to-teal-400 flex items-center justify-center shrink-0">
                        <Trophy className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">{tournament.name}</h1>
                        <div className="flex items-center gap-3 mt-2">
                            <span className={`badge badge-${tournament.status === 'active' ? 'open' : tournament.status === 'upcoming' ? 'coming-soon' : 'settled'}`}>
                                {tournament.status}
                            </span>
                            <span className="text-sm text-dark-400">
                                Competition ID: {tournament.competition_id}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tournament-level markets */}
            {markets && markets.length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-gold-400" />
                        Tournament Markets
                    </h2>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {markets.map((m) => (
                            <MarketCard key={m.id} market={m} />
                        ))}
                    </div>
                </div>
            )}

            {/* Events / Matches */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-accent-400" />
                    Matches & Events
                </h2>
                {loadingE ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="glass-card p-5 animate-pulse">
                                <div className="h-5 bg-dark-700 rounded w-2/3 mb-2" />
                                <div className="h-4 bg-dark-700 rounded w-1/3" />
                            </div>
                        ))}
                    </div>
                ) : events?.length === 0 ? (
                    <div className="glass-card p-8 text-center">
                        <p className="text-dark-400">No events created yet for this tournament.</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {events.map((event) => (
                            <Link
                                key={event.id}
                                to={`/events/${event.id}`}
                                className="glass-card p-5 block hover:border-accent-500/30 transition-all group"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-white group-hover:text-accent-400 transition-colors truncate">
                                            {event.title}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-2">
                                            <span className={`badge badge-${event.status === 'live' ? 'open' : event.status === 'upcoming' ? 'coming-soon' : 'settled'}`}>
                                                {event.status}
                                            </span>
                                            {event.starts_at && (
                                                <span className="text-xs text-dark-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(event.starts_at).toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                        {event.description && (
                                            <p className="text-sm text-dark-400 mt-1">{event.description}</p>
                                        )}
                                    </div>
                                    <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-accent-400 transition-colors shrink-0 ml-4" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
