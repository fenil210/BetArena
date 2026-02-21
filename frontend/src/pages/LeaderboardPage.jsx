import { useState } from 'react';
import { useLeaderboard, useTournamentLeaderboard, useTournaments } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Crown, Coins, Medal, TrendingUp, TrendingDown } from 'lucide-react';

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [selectedTournament, setSelectedTournament] = useState('');
    const { data: tournaments } = useTournaments();

    const isGlobal = !selectedTournament;
    const { data: globalBoard, isLoading: loadingG } = useLeaderboard();
    const { data: tournamentBoard, isLoading: loadingT } = useTournamentLeaderboard(selectedTournament);

    const board = isGlobal ? globalBoard : tournamentBoard;
    const loading = isGlobal ? loadingG : loadingT;

    const rankIcon = (rank) => {
        if (rank === 1) return <Crown className="w-5 h-5 text-gold-400" />;
        if (rank === 2) return <Medal className="w-5 h-5 text-dark-300" />;
        if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
        return <span className="w-5 text-center text-sm font-bold text-dark-500">{rank}</span>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <Crown className="w-6 h-6 text-gold-400" />
                    <h1 className="text-2xl font-bold text-white">Leaderboard</h1>
                </div>

                {/* Tournament filter */}
                <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="px-4 py-2 rounded-xl bg-dark-800/80 border border-dark-600/40
                   text-white text-sm focus:outline-none focus:border-accent-500/50"
                >
                    <option value="">Global (All Time)</option>
                    {tournaments?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="glass-card overflow-hidden">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-4 px-5 py-4 border-b border-dark-700/20 animate-pulse">
                            <div className="w-5 h-5 bg-dark-700 rounded" />
                            <div className="w-8 h-8 bg-dark-700 rounded-full" />
                            <div className="flex-1">
                                <div className="h-4 bg-dark-700 rounded w-1/3" />
                            </div>
                            <div className="h-4 bg-dark-700 rounded w-16" />
                        </div>
                    ))}
                </div>
            ) : board?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Crown className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">No rankings yet</p>
                </div>
            ) : (
                <div className="glass-card overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-4 px-5 py-3 bg-dark-700/30 text-xs font-semibold text-dark-400 uppercase tracking-wider">
                        <span className="w-8">#</span>
                        <span className="flex-1">Player</span>
                        {isGlobal ? (
                            <span className="w-24 text-right">Balance</span>
                        ) : (
                            <span className="w-24 text-right">P&L</span>
                        )}
                    </div>

                    {board.map((entry, i) => {
                        const rank = entry.rank || i + 1;
                        const isMe = entry.user_id === user?.id;

                        return (
                            <div
                                key={entry.user_id}
                                className={`flex items-center gap-4 px-5 py-4 border-t border-dark-700/20 transition-colors ${isMe ? 'bg-accent-500/5' : 'hover:bg-dark-700/20'
                                    } ${i < 3 ? 'bg-dark-700/10' : ''}`}
                            >
                                {/* Rank */}
                                <div className="w-8 flex justify-center">{rankIcon(rank)}</div>

                                {/* Avatar */}
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white ${i === 0 ? 'bg-gradient-to-br from-gold-400 to-amber-600' :
                                        i === 1 ? 'bg-gradient-to-br from-dark-300 to-dark-500' :
                                            i === 2 ? 'bg-gradient-to-br from-amber-600 to-amber-800' :
                                                'bg-gradient-to-br from-accent-600 to-teal-500'
                                    }`}>
                                    {entry.username[0].toUpperCase()}
                                </div>

                                {/* Name */}
                                <div className="flex-1 min-w-0">
                                    <span className={`font-medium truncate block ${isMe ? 'text-accent-400' : 'text-white'}`}>
                                        {entry.username}
                                        {isMe && <span className="text-xs text-accent-500 ml-2">(You)</span>}
                                    </span>
                                </div>

                                {/* Value */}
                                {isGlobal ? (
                                    <div className="w-24 text-right flex items-center justify-end gap-1">
                                        <Coins className="w-4 h-4 text-gold-400" />
                                        <span className="font-semibold text-gold-400">
                                            {entry.balance?.toLocaleString()}
                                        </span>
                                    </div>
                                ) : (
                                    <div className="w-24 text-right">
                                        <span className={`font-semibold flex items-center justify-end gap-1 ${(entry.pnl || 0) >= 0 ? 'text-accent-400' : 'text-loss-400'
                                            }`}>
                                            {(entry.pnl || 0) >= 0 ? (
                                                <TrendingUp className="w-4 h-4" />
                                            ) : (
                                                <TrendingDown className="w-4 h-4" />
                                            )}
                                            {(entry.pnl || 0) >= 0 ? '+' : ''}{entry.pnl || 0}
                                        </span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
