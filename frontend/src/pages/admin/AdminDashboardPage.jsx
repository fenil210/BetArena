import { useUsers } from '../../hooks/useApi';
import { useAuth } from '../../hooks/useAuth';
import { LayoutDashboard, Users, Coins, TrendingUp } from 'lucide-react';

export default function AdminDashboardPage() {
    const { user } = useAuth();
    const { data: users, isLoading } = useUsers();

    const totalUsers = users?.length || 0;
    const totalCoins = users?.reduce((sum, u) => sum + (u.balance || 0), 0) || 0;
    const activeUsers = users?.filter(u => u.is_active)?.length || 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <LayoutDashboard className="w-6 h-6 text-accent-400" />
                Admin Dashboard
            </h1>

            {/* Stats cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Total Users"
                    value={totalUsers}
                    color="accent"
                    loading={isLoading}
                />
                <StatCard
                    icon={<Users className="w-6 h-6" />}
                    label="Active Users"
                    value={activeUsers}
                    color="blue"
                    loading={isLoading}
                />
                <StatCard
                    icon={<Coins className="w-6 h-6" />}
                    label="Coins in Circulation"
                    value={totalCoins.toLocaleString()}
                    color="gold"
                    loading={isLoading}
                />
            </div>

            {/* Quick info */}
            <div className="glass-card p-6">
                <h2 className="text-lg font-semibold text-white mb-3">Quick Actions</h2>
                <p className="text-dark-400 text-sm">
                    Use the sidebar to manage tournaments, create markets, and manage users.
                    Sync football data from the Tournaments page.
                </p>
            </div>
        </div>
    );
}

function StatCard({ icon, label, value, color, loading }) {
    const colors = {
        accent: 'from-accent-500/20 to-accent-600/5 text-accent-400',
        blue: 'from-blue-500/20 to-blue-600/5 text-blue-400',
        gold: 'from-gold-500/20 to-gold-600/5 text-gold-400',
    };

    return (
        <div className={`glass-card p-5 bg-gradient-to-br ${colors[color]}`}>
            <div className="mb-3">{icon}</div>
            {loading ? (
                <div className="h-8 bg-dark-700 rounded w-16 animate-pulse" />
            ) : (
                <p className="text-3xl font-bold text-white">{value}</p>
            )}
            <p className="text-sm text-dark-400 mt-1">{label}</p>
        </div>
    );
}
