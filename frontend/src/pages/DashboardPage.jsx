import { useTournaments, useLeaderboard, useFeed } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
    Trophy,
    TrendingUp,
    Zap,
    ArrowRight,
    Crown,
    Coins,
    Target,
} from 'lucide-react';

export default function DashboardPage() {
    const { user } = useAuth();
    const { data: tournaments, isLoading: loadingT } = useTournaments();
    const { data: leaderboard, isLoading: loadingL } = useLeaderboard();
    const { data: feed, isLoading: loadingF } = useFeed(5, 0);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Welcome header */}
            <div className="glass-card p-6 bg-gradient-to-br from-dark-800/80 to-dark-900/60">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-white">
                            Welcome back, <span className="gradient-text">{user?.username}</span>
                        </h1>
                        <p className="text-dark-400 mt-1">Ready to place your predictions?</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <StatBox
                            icon={<Coins className="w-5 h-5 text-gold-400" />}
                            label="Balance"
                            value={user?.balance?.toLocaleString()}
                            accent="gold"
                        />
                        <StatBox
                            icon={<Target className="w-5 h-5 text-accent-400" />}
                            label="Rank"
                            value={
                                leaderboard
                                    ? `#${leaderboard.findIndex((e) => e.user_id === user?.id) + 1 || '-'}`
                                    : '...'
                            }
                            accent="green"
                        />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Active tournaments */}
                <div className="lg:col-span-2 space-y-4">
                    <SectionHeader
                        icon={<Trophy className="w-5 h-5 text-accent-400" />}
                        title="Active Tournaments"
                        link="/tournaments"
                    />
                    {loadingT ? (
                        <LoadingCards count={2} />
                    ) : tournaments?.length === 0 ? (
                        <EmptyState text="No tournaments yet. Your admin will set things up!" />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {tournaments?.slice(0, 4).map((t) => (
                                <Link
                                    key={t.id}
                                    to={`/tournaments/${t.id}`}
                                    className="glass-card p-5 hover:border-accent-500/30 transition-all group"
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <h3 className="font-semibold text-white group-hover:text-accent-400 transition-colors">
                                                {t.name}
                                            </h3>
                                            <span className={`badge mt-2 badge-${t.status === 'active' ? 'open' : t.status === 'upcoming' ? 'coming-soon' : 'settled'}`}>
                                                {t.status}
                                            </span>
                                        </div>
                                        <ArrowRight className="w-5 h-5 text-dark-500 group-hover:text-accent-400 transition-colors" />
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Recent Feed */}
                    <SectionHeader
                        icon={<Zap className="w-5 h-5 text-gold-400" />}
                        title="Recent Activity"
                        link="/feed"
                    />
                    {loadingF ? (
                        <LoadingCards count={3} />
                    ) : feed?.length === 0 ? (
                        <EmptyState text="No activity yet. Place your first bet!" />
                    ) : (
                        <div className="space-y-2">
                            {feed?.slice(0, 5).map((item) => (
                                <div
                                    key={item.id}
                                    className="glass-card px-4 py-3 flex items-start gap-3"
                                >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${item.action_type === 'bet_placed'
                                            ? 'bg-accent-500/20 text-accent-400'
                                            : item.action_type === 'market_settled'
                                                ? 'bg-gold-500/20 text-gold-400'
                                                : 'bg-dark-600/50 text-dark-300'
                                        }`}>
                                        {item.action_type === 'bet_placed' ? (
                                            <Target className="w-4 h-4" />
                                        ) : (
                                            <Trophy className="w-4 h-4" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-dark-200 truncate">{item.description}</p>
                                        <p className="text-xs text-dark-500 mt-0.5">
                                            {new Date(item.created_at).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Leaderboard sidebar */}
                <div className="space-y-4">
                    <SectionHeader
                        icon={<Crown className="w-5 h-5 text-gold-400" />}
                        title="Leaderboard"
                        link="/leaderboard"
                    />
                    {loadingL ? (
                        <LoadingCards count={5} />
                    ) : (
                        <div className="glass-card overflow-hidden">
                            {leaderboard?.slice(0, 10).map((entry, i) => (
                                <div
                                    key={entry.user_id}
                                    className={`flex items-center gap-3 px-4 py-3 ${i !== 0 ? 'border-t border-dark-700/30' : ''
                                        } ${entry.user_id === user?.id ? 'bg-accent-500/5' : ''}`}
                                >
                                    <span className={`w-6 text-center text-sm font-bold ${i === 0 ? 'text-gold-400' : i === 1 ? 'text-dark-300' : i === 2 ? 'text-amber-600' : 'text-dark-500'
                                        }`}>
                                        {entry.rank}
                                    </span>
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-600 to-teal-500 flex items-center justify-center text-xs font-bold text-white">
                                        {entry.username[0].toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-medium truncate ${entry.user_id === user?.id ? 'text-accent-400' : 'text-white'}`}>
                                            {entry.username}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Coins className="w-3.5 h-3.5 text-gold-400" />
                                        <span className="text-sm font-semibold text-gold-400">
                                            {entry.balance.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Sub-components ───────────────────

function StatBox({ icon, label, value, accent }) {
    return (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-dark-700/50 border border-dark-600/30">
            {icon}
            <div>
                <p className="text-xs text-dark-400">{label}</p>
                <p className={`text-lg font-bold ${accent === 'gold' ? 'text-gold-400' : 'text-accent-400'}`}>
                    {value}
                </p>
            </div>
        </div>
    );
}

function SectionHeader({ icon, title, link }) {
    return (
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                {icon}
                <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
            {link && (
                <Link
                    to={link}
                    className="text-sm text-dark-400 hover:text-accent-400 transition-colors flex items-center gap-1"
                >
                    View all <ArrowRight className="w-4 h-4" />
                </Link>
            )}
        </div>
    );
}

function LoadingCards({ count }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="glass-card p-4 animate-pulse">
                    <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-dark-700 rounded w-1/2" />
                </div>
            ))}
        </div>
    );
}

function EmptyState({ text }) {
    return (
        <div className="glass-card p-8 text-center">
            <p className="text-dark-400">{text}</p>
        </div>
    );
}
