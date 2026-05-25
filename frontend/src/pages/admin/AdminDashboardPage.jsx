import { useBootstrapWorldCup, useUsers } from '../../hooks/useApi';
import { LayoutDashboard, Users, Coins, Activity, RefreshCw, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, PageHeader, Panel, StatCard } from '../../components/ui';

export default function AdminDashboardPage() {
    const { data: users, isLoading } = useUsers();
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
        </div>
    );
}
