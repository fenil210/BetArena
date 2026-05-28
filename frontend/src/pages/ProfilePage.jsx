import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserStats, useUserStreak } from '../hooks/useApi';
import {
    User,
    Coins,
    Shield,
    Calendar,
    Lock,
    TrendingUp,
    TrendingDown,
    Target,
    BarChart3,
    Crown,
    Trophy,
    WalletCards,
} from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatDate';
import { Badge, Button, FormField, PageHeader, Panel, StatCard, TextInput, cx } from '../components/ui';

export default function ProfilePage() {
    const { user } = useAuth();
    const { data: stats } = useUserStats();
    const { data: streak } = useUserStreak();
    const [showPwForm, setShowPwForm] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePw = async (e) => {
        e.preventDefault();
        if (!currentPw || !newPw) return;
        setLoading(true);
        try {
            await client.post('/auth/change-password', {
                current_password: currentPw,
                new_password: newPw,
            });
            toast.success('Password changed');
            setShowPwForm(false);
            setCurrentPw('');
            setNewPw('');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    const summary = stats?.summary;
    const dailyChart = stats?.daily_chart || [];
    const coinHistory = stats?.coin_history || [];

    return (
        <div className="page-stack mx-auto max-w-5xl">
            <PageHeader
                icon={<User className="h-6 w-6" />}
                title="Profile"
                description="Your account, balance, betting stats, and security settings."
            />

            <Panel className="p-5 sm:p-6">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-900 text-2xl font-semibold text-white">
                            {user.username?.[0]?.toUpperCase()}
                        </div>
                        <div>
                            <div className="flex flex-wrap items-center gap-2">
                                <h2 className="text-xl font-semibold text-slate-950">{user.username}</h2>
                                {user.is_admin && (
                                    <Badge status="locked">
                                        <Shield className="h-3 w-3" />
                                        Admin
                                    </Badge>
                                )}
                            </div>
                            <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                        </div>
                    </div>

                    {streak && (
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                                {streak.current_streak > 0 ? 'Win streak' : 'Best streak'}
                            </p>
                            <p className="mt-1 text-2xl font-semibold text-slate-950">
                                {streak.current_streak > 0 ? streak.current_streak : streak.best_streak}
                            </p>
                        </div>
                    )}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                    <StatCard icon={<Coins className="h-5 w-5" />} label="Balance" value={user.balance?.toLocaleString()} tone="gold" />
                    <StatCard icon={<Calendar className="h-5 w-5" />} label="Joined" value={formatDate(user.created_at)} />
                    {streak && <StatCard icon={<Target className="h-5 w-5" />} label="Best streak" value={streak.best_streak} tone="teal" />}
                    {summary && <StatCard icon={<BarChart3 className="h-5 w-5" />} label="Total bets" value={summary.total_bets} />}
                </div>
            </Panel>

            {summary && (
                <Panel className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <BarChart3 className="h-5 w-5 text-teal-800" />
                        <h3 className="text-base font-semibold text-slate-950">Betting stats</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard icon={<WalletCards className="h-5 w-5" />} label="Open bets" value={summary.open_bets} tone="blue" />
                        <StatCard icon={<Crown className="h-5 w-5" />} label="Current rank" value={summary.current_rank ? `#${summary.current_rank}` : '-'} subValue={rankCopy(summary)} tone="teal" />
                        <StatCard icon={<Trophy className="h-5 w-5" />} label="Biggest win" value={`+${summary.biggest_win?.toLocaleString?.() || 0}`} tone="gold" />
                        <StatCard label="Win rate" value={`${summary.win_rate}%`} subValue={`${summary.won_bets}W / ${summary.lost_bets}L`} tone="teal" />
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <StatCard label="30 day win rate" value={`${summary.recent_win_rate}%`} tone="blue" />
                        <StatCard
                            label="Total profit"
                            value={`${summary.total_profit >= 0 ? '+' : ''}${summary.total_profit.toLocaleString()}`}
                            subValue={`${summary.roi}% ROI`}
                            tone={summary.total_profit >= 0 ? 'teal' : 'red'}
                        />
                        <StatCard label="Total staked" value={summary.total_staked.toLocaleString()} tone="gold" />
                        <StatCard label="Settled stake" value={summary.settled_staked?.toLocaleString?.() || 0} />
                    </div>
                </Panel>
            )}

            {coinHistory.length > 0 && (
                <Panel className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <Coins className="h-5 w-5 text-amber-700" />
                        <h3 className="text-base font-semibold text-slate-950">Coin movement</h3>
                    </div>
                    <div className="grid gap-5 lg:grid-cols-[1fr_260px]">
                        <CoinSparkline history={coinHistory} />
                        <div className="space-y-2">
                            {coinHistory.slice(-5).reverse().map((item, index) => (
                                <div key={`${item.date}-${index}`} className="flex items-center justify-between gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                                    <div className="min-w-0">
                                        <p className="truncate text-sm font-semibold text-slate-800">{item.label}</p>
                                        <p className="text-xs text-slate-500">{formatDate(item.date)}</p>
                                    </div>
                                    <span className={cx('text-sm font-semibold', item.delta >= 0 ? 'text-teal-800' : 'text-red-700')}>
                                        {item.delta > 0 ? '+' : ''}{item.delta}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </Panel>
            )}

            {dailyChart.length > 0 && (
                <Panel className="p-5">
                    <div className="mb-4 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-teal-800" />
                        <h3 className="text-base font-semibold text-slate-950">Daily profit and loss</h3>
                    </div>
                    <div className="space-y-3">
                        {dailyChart.slice(-10).map((day) => (
                            <div key={day.date} className="grid grid-cols-[82px_1fr_70px] items-center gap-3">
                                <span className="text-xs font-medium text-slate-500">
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="h-2 rounded-full bg-slate-100">
                                    {day.profit !== 0 && (
                                        <div
                                            className={cx('h-2 rounded-full', day.profit > 0 ? 'bg-teal-700' : 'bg-red-600')}
                                            style={{ width: `${Math.min(Math.abs(day.profit) / 500 * 100, 100)}%` }}
                                        />
                                    )}
                                </div>
                                <span className={cx('text-right text-sm font-semibold', day.profit >= 0 ? 'text-teal-800' : 'text-red-700')}>
                                    {day.profit > 0 ? '+' : ''}{day.profit.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </Panel>
            )}

            <Panel className="p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <Lock className="h-5 w-5 text-slate-500" />
                        <h3 className="text-base font-semibold text-slate-950">Security</h3>
                    </div>
                    {!showPwForm && (
                        <Button onClick={() => setShowPwForm(true)}>
                            Change password
                        </Button>
                    )}
                </div>

                {showPwForm && (
                    <form onSubmit={handleChangePw} className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Current password">
                            <TextInput type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} autoFocus />
                        </FormField>
                        <FormField label="New password">
                            <TextInput type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
                        </FormField>
                        <div className="flex gap-2 sm:col-span-2">
                            <Button type="submit" variant="primary" loading={loading}>Update</Button>
                            <Button type="button" onClick={() => setShowPwForm(false)}>Cancel</Button>
                        </div>
                    </form>
                )}
            </Panel>
        </div>
    );
}

function rankCopy(summary) {
    if (!summary?.rank_change) return 'No movement';
    return summary.rank_change > 0 ? `Up ${summary.rank_change}` : `Down ${Math.abs(summary.rank_change)}`;
}

function CoinSparkline({ history }) {
    const values = history.map((item) => item.balance);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(max - min, 1);
    const points = history.map((item, index) => {
        const x = history.length === 1 ? 0 : (index / (history.length - 1)) * 100;
        const y = 84 - ((item.balance - min) / range) * 68;
        return `${x},${y}`;
    }).join(' ');
    const latest = history[history.length - 1];
    const first = history[0];
    const delta = (latest?.balance || 0) - (first?.balance || 0);

    return (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
                <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Balance path</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-950">{latest?.balance?.toLocaleString?.() || 0}</p>
                </div>
                <span className={cx('inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm font-semibold', delta >= 0 ? 'bg-teal-50 text-teal-800' : 'bg-red-50 text-red-700')}>
                    {delta >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                    {delta > 0 ? '+' : ''}{delta}
                </span>
            </div>
            <svg viewBox="0 0 100 90" className="h-36 w-full overflow-visible">
                <polyline
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points}
                    className={delta >= 0 ? 'text-teal-700' : 'text-red-600'}
                />
                {history.map((item, index) => {
                    const [x, y] = points.split(' ')[index].split(',').map(Number);
                    return <circle key={`${item.date}-${index}`} cx={x} cy={y} r="2.6" className="fill-white stroke-current text-slate-500" strokeWidth="1.5" />;
                })}
            </svg>
        </div>
    );
}
