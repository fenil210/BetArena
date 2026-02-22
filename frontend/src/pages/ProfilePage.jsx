import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUserStats, useUserStreak } from '../hooks/useApi';
import { 
    User, Coins, Shield, Calendar, Lock, Loader2, TrendingUp, 
    Flame, Target, TrendingDown, BarChart3 
} from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatDate';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const { data: stats, isLoading: statsLoading } = useUserStats();
    const { data: streak, isLoading: streakLoading } = useUserStreak();
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
            toast.success('Password changed!');
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

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-accent-400" />
                <h1 className="text-2xl font-bold text-white">Profile</h1>
            </div>

            {/* Profile card with streak */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-teal-400 flex items-center justify-center text-2xl font-bold text-white shadow-glow-green">
                        {user.username?.[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1">
                        <h2 className="text-xl font-bold text-white">{user.username}</h2>
                        <p className="text-dark-400">{user.email}</p>
                        {user.is_admin && (
                            <span className="badge bg-gold-500/20 text-gold-400 mt-1">
                                <Shield className="w-3 h-3 mr-1" /> Admin
                            </span>
                        )}
                    </div>
                    
                    {/* Streak Badge */}
                    {streak && (
                        <div className="text-center">
                            {streak.current_streak > 0 ? (
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500/20 to-red-500/20 border border-orange-500/30">
                                    <Flame className="w-6 h-6 text-orange-400" />
                                    <div>
                                        <div className="text-2xl font-bold text-orange-400">{streak.current_streak}</div>
                                        <div className="text-xs text-orange-300">Win Streak</div>
                                    </div>
                                </div>
                            ) : (
                                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-700/40">
                                    <Target className="w-5 h-5 text-dark-400" />
                                    <div>
                                        <div className="text-xl font-bold text-dark-400">{streak.best_streak}</div>
                                        <div className="text-xs text-dark-500">Best Streak</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="bg-dark-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Coins className="w-4 h-4 text-gold-400" />
                            <span className="text-xs text-dark-400">Balance</span>
                        </div>
                        <p className="text-2xl font-bold text-gold-400">{user.balance?.toLocaleString()}</p>
                    </div>
                    <div className="bg-dark-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-accent-400" />
                            <span className="text-xs text-dark-400">Joined</span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                            {formatDate(user.created_at)}
                        </p>
                    </div>
                    {streak && (
                        <div className="bg-dark-700/40 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <Target className="w-4 h-4 text-accent-400" />
                                <span className="text-xs text-dark-400">Best Streak</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{streak.best_streak}</p>
                        </div>
                    )}
                    {summary && (
                        <div className="bg-dark-700/40 rounded-xl p-4">
                            <div className="flex items-center gap-2 mb-1">
                                <BarChart3 className="w-4 h-4 text-accent-400" />
                                <span className="text-xs text-dark-400">Total Bets</span>
                            </div>
                            <p className="text-2xl font-bold text-white">{summary.total_bets}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Stats Grid */}
            {summary && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <BarChart3 className="w-5 h-5 text-accent-400" />
                        Betting Stats
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <StatCard 
                            label="Win Rate" 
                            value={`${summary.win_rate}%`} 
                            subValue={`${summary.won_bets}W / ${summary.lost_bets}L`}
                            color="accent"
                        />
                        <StatCard 
                            label="30 Day Win Rate" 
                            value={`${summary.recent_win_rate}%`} 
                            color="blue"
                        />
                        <StatCard 
                            label="Total Profit" 
                            value={`${summary.total_profit >= 0 ? '+' : ''}${summary.total_profit.toLocaleString()}`}
                            subValue={`${summary.roi}% ROI`}
                            color={summary.total_profit >= 0 ? 'green' : 'loss'}
                        />
                        <StatCard 
                            label="Total Staked" 
                            value={summary.total_staked.toLocaleString()} 
                            color="gold"
                        />
                    </div>
                </div>
            )}

            {/* Daily P/L Chart */}
            {dailyChart.length > 0 && (
                <div className="glass-card p-6">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
                        <TrendingUp className="w-5 h-5 text-accent-400" />
                        Daily Profit/Loss (Last 30 Days)
                    </h3>
                    
                    <div className="space-y-3">
                        {dailyChart.slice(-10).map((day) => (
                            <div key={day.date} className="flex items-center gap-3">
                                <span className="text-xs text-dark-400 w-20">
                                    {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                </span>
                                <div className="flex-1 h-8 bg-dark-700/40 rounded-lg overflow-hidden relative">
                                    {day.profit !== 0 && (
                                        <div 
                                            className={`absolute top-0 h-full transition-all duration-500 ${
                                                day.profit > 0 ? 'bg-accent-500/30 left-1/2' : 'bg-loss-500/30 right-1/2'
                                            }`}
                                            style={{ 
                                                width: `${Math.min(Math.abs(day.profit) / 500 * 50, 50)}%`,
                                            }}
                                        />
                                    )}
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <span className={`text-xs font-bold ${
                                            day.profit > 0 ? 'text-accent-400' : 
                                            day.profit < 0 ? 'text-loss-400' : 'text-dark-500'
                                        }`}>
                                            {day.profit > 0 ? '+' : ''}{day.profit.toLocaleString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Change password */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Lock className="w-5 h-5 text-dark-400" />
                        Security
                    </h3>
                    {!showPwForm && (
                        <button onClick={() => setShowPwForm(true)} className="btn-secondary text-sm">
                            Change Password
                        </button>
                    )}
                </div>

                {showPwForm && (
                    <form onSubmit={handleChangePw} className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm text-dark-400 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={currentPw}
                                onChange={(e) => setCurrentPw(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40
                         text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-dark-400 mb-1">New Password</label>
                            <input
                                type="password"
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40
                         text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Update
                            </button>
                            <button type="button" onClick={() => setShowPwForm(false)} className="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, subValue, color }) {
    const colorClasses = {
        accent: 'text-accent-400',
        blue: 'text-blue-400',
        green: 'text-green-400',
        loss: 'text-loss-400',
        gold: 'text-gold-400',
    };

    return (
        <div className="bg-dark-800/50 rounded-xl p-4 text-center">
            <p className="text-xs text-dark-400 mb-1">{label}</p>
            <p className={`text-xl font-bold ${colorClasses[color] || 'text-white'}`}>{value}</p>
            {subValue && <p className="text-xs text-dark-500 mt-1">{subValue}</p>}
        </div>
    );
}
