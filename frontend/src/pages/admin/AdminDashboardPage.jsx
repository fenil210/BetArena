import { useUsers } from '../../hooks/useApi';
import { LayoutDashboard, Users, Coins, Activity } from 'lucide-react';
import { PageHeader, Panel, StatCard } from '../../components/ui';

export default function AdminDashboardPage() {
    const { data: users, isLoading } = useUsers();

    const totalUsers = users?.length || 0;
    const totalCoins = users?.reduce((sum, user) => sum + (user.balance || 0), 0) || 0;
    const activeUsers = users?.filter((user) => user.is_active)?.length || 0;

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
                <h2 className="text-base font-semibold text-slate-950">Operator workflow</h2>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
                    Sync football data, create tournaments and events, open markets, then lock and settle them from the market manager. User balances update through betting, settlement, voiding, and manual admin adjustments.
                </p>
            </Panel>
        </div>
    );
}
