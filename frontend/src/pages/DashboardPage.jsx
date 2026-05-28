import { useTournaments, useLeaderboard, useFeed } from '../hooks/useApi';
import { formatDateTime } from '../utils/formatDate';
import { useAuth } from '../hooks/useAuth';
import { Link } from 'react-router-dom';
import {
    Trophy,
    Zap,
    ArrowRight,
    Crown,
    Coins,
    Target,
    CalendarDays,
} from 'lucide-react';
import { Badge, EmptyState, LoadingRows, Panel, SectionHeader, StatCard } from '../components/ui';
import LiveMatchTicker from '../components/LiveMatchTicker';

export default function DashboardPage() {
    const { user } = useAuth();
    const { data: tournaments, isLoading: loadingT } = useTournaments();
    const { data: leaderboard, isLoading: loadingL } = useLeaderboard();
    const { data: feed, isLoading: loadingF } = useFeed(5, 0);

    const rank = leaderboard?.findIndex((entry) => entry.user_id === user?.id);

    return (
        <div className="page-stack">
            <Panel className="p-5 sm:p-6">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <p className="eyebrow">Dashboard</p>
                        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">
                            Welcome back, {user?.username}
                        </h1>
                        <p className="mt-1 text-sm text-slate-600">
                            Review markets, track your position, and follow recent betting activity.
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:min-w-80">
                        <StatCard
                            icon={<Coins className="h-5 w-5" />}
                            label="Balance"
                            value={user?.balance?.toLocaleString()}
                            tone="gold"
                        />
                        <StatCard
                            icon={<Target className="h-5 w-5" />}
                            label="Rank"
                            value={rank >= 0 ? `#${rank + 1}` : '-'}
                            tone="teal"
                        />
                    </div>
                </div>
            </Panel>

            <LiveMatchTicker tournaments={tournaments || []} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_390px]">
                <div className="space-y-6">
                    <section className="space-y-3">
                        <SectionHeader
                            icon={<Trophy className="h-5 w-5" />}
                            title="Active tournaments"
                            link="/tournaments"
                        />
                        {loadingT ? (
                            <LoadingRows count={3} />
                        ) : tournaments?.length === 0 ? (
                            <EmptyState
                                icon={<Trophy className="h-6 w-6" />}
                                title="No tournaments yet"
                                description="Your admin will set up tournaments soon."
                            />
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                {tournaments?.slice(0, 4).map((tournament) => (
                                    <Link
                                        key={tournament.id}
                                        to={`/tournaments/${tournament.id}`}
                                        className="group rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:border-teal-300 hover:bg-teal-50/25"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="min-w-0">
                                                <h3 className="truncate text-base font-semibold text-slate-950">{tournament.name}</h3>
                                                <div className="mt-3 flex items-center gap-2">
                                                    <Badge status={tournament.status} />
                                                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                                                        <CalendarDays className="h-3.5 w-3.5" />
                                                        World Cup schedule
                                                    </span>
                                                </div>
                                            </div>
                                            <ArrowRight className="h-5 w-5 text-slate-400 transition group-hover:text-teal-800" />
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </section>

                    <section className="space-y-3">
                        <SectionHeader
                            icon={<Zap className="h-5 w-5" />}
                            title="Recent activity"
                            link="/feed"
                        />
                        {loadingF ? (
                            <LoadingRows count={4} />
                        ) : feed?.length === 0 ? (
                            <EmptyState
                                icon={<Zap className="h-6 w-6" />}
                                title="No activity yet"
                                description="Activity will appear here after markets open and bets are placed."
                            />
                        ) : (
                            <Panel className="divide-y divide-slate-200 overflow-hidden">
                                {feed?.slice(0, 5).map((item) => (
                                    <div key={item.id} className="flex gap-3 p-4">
                                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                            {item.action_type === 'bet_placed' ? <Target className="h-4 w-4" /> : <Trophy className="h-4 w-4" />}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="line-clamp-2 text-sm font-medium leading-5 text-slate-800">{item.description}</p>
                                            <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                                        </div>
                                    </div>
                                ))}
                            </Panel>
                        )}
                    </section>
                </div>

                <section className="space-y-3">
                    <SectionHeader
                        icon={<Crown className="h-5 w-5" />}
                        title="Leaderboard"
                        link="/leaderboard"
                    />
                    {loadingL ? (
                        <LoadingRows count={6} />
                    ) : (
                        <Panel className="divide-y divide-slate-200 overflow-hidden">
                            {leaderboard?.slice(0, 10).map((entry) => {
                                const isMe = entry.user_id === user?.id;
                                return (
                                    <div key={entry.user_id} className={`flex items-center gap-3 p-4 ${isMe ? 'bg-teal-50/60' : ''}`}>
                                        <span className="w-7 text-center text-sm font-semibold text-slate-500">{entry.rank}</span>
                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                            {entry.username[0].toUpperCase()}
                                        </div>
                                        <p className={`min-w-0 flex-1 truncate text-sm font-semibold ${isMe ? 'text-teal-900' : 'text-slate-800'}`}>
                                            {entry.username}
                                        </p>
                                        <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-800">
                                            <Coins className="h-4 w-4" />
                                            {entry.balance.toLocaleString()}
                                        </span>
                                    </div>
                                );
                            })}
                        </Panel>
                    )}
                </section>
            </div>
        </div>
    );
}
