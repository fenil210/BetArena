import { useTournaments } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatDate';

export default function TournamentsPage() {
    const { data: tournaments, isLoading } = useTournaments();

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Trophy className="w-6 h-6 text-accent-400" />
                <h1 className="text-2xl font-bold text-white">Tournaments</h1>
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-6 animate-pulse">
                            <div className="h-5 bg-dark-700 rounded w-3/4 mb-3" />
                            <div className="h-4 bg-dark-700 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : tournaments?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Trophy className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">No tournaments yet</p>
                    <p className="text-dark-500 text-sm mt-1">Your admin will set up tournaments soon.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tournaments.map((t) => (
                        <Link
                            key={t.id}
                            to={`/tournaments/${t.id}`}
                            className="glass-card p-6 hover:border-accent-500/30 transition-all group"
                        >
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="text-lg font-semibold text-white group-hover:text-accent-400 transition-colors">
                                    {t.name}
                                </h3>
                                <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-accent-400 transition-colors shrink-0" />
                            </div>
                            <div className="flex items-center gap-3">
                                <span className={`badge badge-${t.status === 'active' ? 'open' : t.status === 'upcoming' ? 'coming-soon' : 'settled'}`}>
                                    {t.status}
                                </span>
                                <span className="text-xs text-dark-500 flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(t.created_at)}
                                </span>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
