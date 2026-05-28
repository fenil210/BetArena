import { useBootstrapWorldCup, useUsers, useWorldCupHealth } from '../../hooks/useApi';
import { LayoutDashboard, Users, Coins, Activity, RefreshCw, Trophy, AlertTriangle, Clock, Target } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, PageHeader, Panel, StatCard } from '../../components/ui';
import { formatDateTime } from '../../utils/formatDate';

export default function AdminDashboardPage() {
    const { data: users, isLoading } = useUsers();
    const { data: health, isLoading: loadingHealth } = useWorldCupHealth();
    const bootstrapWorldCup = useBootstrapWorldCup();

    const bettingUsers = users?.filter((user) => !user.is_admin) || [];
    const totalUsers = bettingUsers.length;
    const totalCoins = bettingUsers.reduce((sum, user) => sum + (user.balance || 0), 0);
    const activeUsers = bettingUsers.filter((user) => user.is_active).length;

    const handleBootstrap = async (reset = false) => {
        const confirmed = !reset || window.confirm('Reset all bets, markets, events, tournaments, football data, and user balances, then load World Cup fixtures?');
        if (!confirmed) return;
        try {
            const result = await bootstrapWorldCup.mutateAsync({ reset });
            toast.success(`World Cup loaded: ${result.fixtures_stored} fixtures, ${result.markets_created} markets`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'World Cup bootstrap failed');
        }
    };

    return (
        <div className="page-stack">
            <PageHeader
                icon={<LayoutDashboard className="h-6 w-6" />}
                title="Admin overview"
                description="Monitor users, coin supply, and the operational setup for private betting."
            />

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <StatCard icon={<Users className="h-5 w-5" />} label="Total users" value={totalUsers} tone="teal" loading={isLoading} />
                <StatCard icon={<Activity className="h-5 w-5" />} label="Active users" value={activeUsers} tone="blue" loading={isLoading} />
                <StatCard icon={<Coins className="h-5 w-5" />} label="Coins in circulation" value={totalCoins.toLocaleString()} tone="gold" loading={isLoading} />
            </div>

            <Panel className="p-5">
                <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
                    <div>
                        <div className="flex items-center gap-2">
                            <Trophy className="h-5 w-5 text-teal-800" />
                            <h2 className="text-base font-semibold text-slate-950">World Cup control</h2>
                        </div>
                        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                            World Cup fixtures are loaded from football-data.org and stored locally, then match result markets close automatically at kickoff. Admin accounts are operators only and are excluded from coin circulation.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={() => handleBootstrap(false)} loading={bootstrapWorldCup.isPending}>
                            <RefreshCw className="h-4 w-4" />
                            Sync World Cup
                        </Button>
                        <Button variant="danger" onClick={() => handleBootstrap(true)} loading={bootstrapWorldCup.isPending}>
                            Reset and load
                        </Button>
                    </div>
                </div>
            </Panel>

            <Panel className="p-5">
                <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <div className="flex items-center gap-2">
                            <Activity className="h-5 w-5 text-teal-800" />
                            <h2 className="text-base font-semibold text-slate-950">Automation health</h2>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                            Fixture sync state, odds readiness, and any markets that need operator action.
                        </p>
                    </div>
                    {health && (
                        <Badge status={health.automation_ok ? 'open' : 'locked'}>
                            {health.automation_ok ? 'Healthy' : 'Needs attention'}
                        </Badge>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                    <StatCard icon={<Trophy className="h-5 w-5" />} label="Fixtures" value={health?.fixture_count ?? '-'} loading={loadingHealth} tone="teal" />
                    <StatCard icon={<Target className="h-5 w-5" />} label="TBD fixtures" value={health?.tbd_count ?? '-'} loading={loadingHealth} tone="blue" />
                    <StatCard icon={<Clock className="h-5 w-5" />} label="Pending odds" value={health?.pending_odds_count ?? '-'} loading={loadingHealth} tone="gold" />
                    <StatCard icon={<Activity className="h-5 w-5" />} label="Locked markets" value={health?.locked_market_count ?? '-'} loading={loadingHealth} />
                    <StatCard icon={<AlertTriangle className="h-5 w-5" />} label="Action needed" value={health?.attention_required_count ?? '-'} loading={loadingHealth} tone={health?.attention_required_count ? 'red' : 'teal'} />
                </div>

                {health && (
                    <div className="mt-5 grid gap-4 lg:grid-cols-[280px_1fr]">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Last sync</p>
                            <p className="mt-2 text-sm font-semibold text-slate-950">
                                {health.last_sync_at ? formatDateTime(health.last_sync_at) : 'Not synced yet'}
                            </p>
                            <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                                {Object.entries(health.market_status_counts || {}).map(([status, count]) => (
                                    <div key={status} className="rounded-md border border-slate-200 bg-white px-3 py-2">
                                        <p className="text-xs font-medium capitalize text-slate-500">{status.replace('_', ' ')}</p>
                                        <p className="mt-1 font-semibold text-slate-950">{count}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Operator queue</p>
                            {health.attention_markets?.length ? (
                                <div className="mt-3 space-y-2">
                                    {health.attention_markets.map((market) => (
                                        <div key={market.id} className="rounded-md border border-red-200 bg-red-50 px-3 py-2">
                                            <div className="flex items-start justify-between gap-3">
                                                <p className="min-w-0 text-sm font-semibold text-slate-950">{market.question}</p>
                                                <Badge status={market.status}>{market.status}</Badge>
                                            </div>
                                            <p className="mt-1 text-xs text-red-700">{market.reason}</p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="mt-3 rounded-md border border-teal-200 bg-teal-50 px-3 py-4 text-sm font-medium text-teal-900">
                                    No stale open markets. Fixture automation is in a clean state.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Panel>
        </div>
    );
}
