import { useState } from 'react';
import { useLeaderboard, useTournamentLeaderboard, useTournaments } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { Crown, Coins, Medal, TrendingUp, TrendingDown } from 'lucide-react';
import { EmptyState, LoadingRows, PageHeader, Panel, SelectInput, cx } from '../components/ui';

export default function LeaderboardPage() {
    const { user } = useAuth();
    const [selectedTournament, setSelectedTournament] = useState('');
    const { data: tournaments } = useTournaments();

    const isGlobal = !selectedTournament;
    const { data: globalBoard, isLoading: loadingG } = useLeaderboard();
    const { data: tournamentBoard, isLoading: loadingT } = useTournamentLeaderboard(selectedTournament);

    const board = isGlobal ? globalBoard : tournamentBoard;
    const loading = isGlobal ? loadingG : loadingT;

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Crown className="h-6 w-6" />}
                title="Leaderboard"
                description="Compare balances globally or review tournament-specific performance."
                actions={(
                    <SelectInput value={selectedTournament} onChange={(e) => setSelectedTournament(e.target.value)} className="sm:w-72">
                        <option value="">Global all-time</option>
                        {tournaments?.map((tournament) => (
                            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                        ))}
                    </SelectInput>
                )}
            />

            {loading ? (
                <LoadingRows count={8} />
            ) : board?.length === 0 ? (
                <EmptyState icon={<Crown className="h-6 w-6" />} title="No rankings yet" />
            ) : (
                <Panel className="overflow-hidden">
                    <div className="grid grid-cols-[64px_1fr_120px] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
                        <span>Rank</span>
                        <span>Player</span>
                        <span className="text-right">{isGlobal ? 'Balance' : 'P&L'}</span>
                    </div>
                    <div className="divide-y divide-slate-200">
                        {board.map((entry, index) => {
                            const rank = entry.rank || index + 1;
                            const isMe = entry.user_id === user?.id;
                            const pnl = entry.pnl ?? entry.profit ?? 0;
                            return (
                                <div key={entry.user_id} className={cx('grid grid-cols-[64px_1fr_120px] items-center gap-4 px-5 py-4', isMe && 'bg-teal-50/60')}>
                                    <div className="flex items-center justify-center">{rankIcon(rank)}</div>
                                    <div className="flex min-w-0 items-center gap-3">
                                        <div className={cx('flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white', index < 3 ? 'bg-teal-800' : 'bg-slate-900')}>
                                            {entry.username[0].toUpperCase()}
                                        </div>
                                        <div className="min-w-0">
                                            <p className={cx('truncate font-semibold', isMe ? 'text-teal-900' : 'text-slate-900')}>
                                                {entry.username}
                                                {isMe && <span className="ml-2 text-xs font-medium text-teal-700">You</span>}
                                            </p>
                                        </div>
                                    </div>
                                    {isGlobal ? (
                                        <div className="flex items-center justify-end gap-1 font-semibold text-amber-800">
                                            <Coins className="h-4 w-4" />
                                            {entry.balance?.toLocaleString()}
                                        </div>
                                    ) : (
                                        <div className={cx('flex items-center justify-end gap-1 font-semibold', pnl >= 0 ? 'text-teal-800' : 'text-red-700')}>
                                            {pnl >= 0 ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
                                            {pnl >= 0 ? '+' : ''}{pnl}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </Panel>
            )}
        </div>
    );
}

function rankIcon(rank) {
    if (rank === 1) return <Crown className="h-5 w-5 text-amber-700" />;
    if (rank === 2) return <Medal className="h-5 w-5 text-slate-500" />;
    if (rank === 3) return <Medal className="h-5 w-5 text-amber-600" />;
    return <span className="text-sm font-semibold text-slate-500">{rank}</span>;
}
