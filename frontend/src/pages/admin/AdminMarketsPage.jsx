import { useState } from 'react';
import {
    useTournaments,
    useTournamentEvents,
    useEventMarkets,
    useAllTournamentMarkets,
    useUpdateMarketStatus,
    useSettleMarket,
    useVoidMarket,
} from '../../hooks/useApi';
import {
    Target, Clock, Lock, CheckCircle, XCircle, AlertTriangle,
    Loader2, Trophy, ChevronDown,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMarketsPage() {
    const { data: tournaments } = useTournaments();
    const [tournamentId, setTournamentId] = useState('');
    const [eventId, setEventId] = useState('');
    const { data: events } = useTournamentEvents(tournamentId);
    const { data: eventMarkets, isLoading: loadingEM, refetch: refetchEM } = useEventMarkets(eventId);
    const { data: allMarkets, isLoading: loadingAll, refetch: refetchAll } = useAllTournamentMarkets(tournamentId);

    // When event is selected, show only that event's markets
    // When only tournament is selected, show ALL markets (tournament + all events)
    const markets = eventId ? eventMarkets : allMarkets;
    const isLoading = eventId ? loadingEM : loadingAll;
    const refetch = eventId ? refetchEM : refetchAll;
    const hasSelection = eventId || tournamentId;

    return (
        <div className="space-y-6 animate-fade-in">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <Target className="w-6 h-6 text-accent-400" />
                Manage Markets
            </h1>

            {/* Filters */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Tournament</label>
                    <select
                        value={tournamentId}
                        onChange={(e) => { setTournamentId(e.target.value); setEventId(''); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-800/80 border border-dark-600/40 text-white text-sm focus:outline-none focus:border-accent-500/50"
                    >
                        <option value="">Select tournament...</option>
                        {tournaments?.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {tournamentId && (
                    <div className="animate-fade-in">
                        <label className="block text-sm text-dark-400 mb-1">Event Filter (optional)</label>
                        <select
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-dark-800/80 border border-dark-600/40 text-white text-sm focus:outline-none focus:border-accent-500/50"
                        >
                            <option value="">All markets (tournament + all matches)</option>
                            {events?.map((ev) => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Markets list */}
            {!hasSelection ? (
                <div className="glass-card p-12 text-center">
                    <Target className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400">Select a tournament to see its markets</p>
                </div>
            ) : isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-5 bg-dark-700 rounded w-2/3 mb-2" />
                            <div className="h-4 bg-dark-700 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            ) : markets?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Target className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">No markets found</p>
                    <p className="text-dark-500 text-sm mt-1">Create one from the "Create Market" page.</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {markets.map((m) => (
                        <MarketAdminCard key={m.id} market={m} onRefetch={refetch} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─── Status badge helpers ─── */
const statusConfig = {
    coming_soon: { icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/15', label: 'Coming Soon' },
    open: { icon: Target, color: 'text-accent-400', bg: 'bg-accent-500/15', label: 'Open' },
    locked: { icon: Lock, color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'Locked' },
    settled: { icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-500/15', label: 'Settled' },
    voided: { icon: XCircle, color: 'text-dark-400', bg: 'bg-dark-500/15', label: 'Voided' },
};

const transitionTargets = {
    coming_soon: ['open'],
    open: ['locked'],
    locked: ['open'],
};

function MarketAdminCard({ market, onRefetch }) {
    const updateStatus = useUpdateMarketStatus();
    const settleMarket = useSettleMarket();
    const voidMarket = useVoidMarket();
    const [showSettle, setShowSettle] = useState(false);
    const [winnerSelId, setWinnerSelId] = useState('');

    const cfg = statusConfig[market.status] || statusConfig.coming_soon;
    const Icon = cfg.icon;
    const nextStates = transitionTargets[market.status] || [];
    const canSettle = market.status === 'locked';
    const canVoid = ['open', 'locked'].includes(market.status);

    const handleStatusChange = async (newStatus) => {
        try {
            await updateStatus.mutateAsync({ marketId: market.id, status: newStatus });
            toast.success(`Market → ${newStatus}`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    const handleSettle = async () => {
        if (!winnerSelId) { toast.error('Pick the winning selection'); return; }
        try {
            await settleMarket.mutateAsync({ marketId: market.id, winning_selection_id: winnerSelId });
            toast.success('Market settled!');
            setShowSettle(false);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    const handleVoid = async () => {
        if (!confirm('Void this market? All stakes will be refunded.')) return;
        try {
            await voidMarket.mutateAsync(market.id);
            toast.success('Market voided — all stakes refunded');
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    return (
        <div className="glass-card p-5 space-y-3">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white text-lg">{market.question}</h3>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-sm">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                            <Icon className="w-3 h-3" />
                            {cfg.label}
                        </span>
                        <span className="text-dark-500">{market.market_type}</span>
                    </div>
                </div>
            </div>

            {/* Selections / Odds */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {market.selections?.map((sel) => (
                    <div key={sel.id} className={`px-3 py-2 rounded-xl border text-sm text-center ${sel.is_winner === true ? 'border-green-500/40 bg-green-500/10 text-green-400' :
                            sel.is_winner === false ? 'border-dark-600/30 bg-dark-800/50 text-dark-500 line-through' :
                                'border-dark-600/30 bg-dark-800/50 text-white'
                        }`}>
                        <div className="text-xs text-dark-400 truncate">{sel.label}</div>
                        <div className="font-bold mt-0.5">{parseFloat(sel.odds).toFixed(2)}</div>
                    </div>
                ))}
            </div>

            {/* Actions — only for non-terminal states */}
            {!['settled', 'voided'].includes(market.status) && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-dark-700/50">
                    {/* Status transitions */}
                    {nextStates.map((ns) => (
                        <button
                            key={ns}
                            onClick={() => handleStatusChange(ns)}
                            disabled={updateStatus.isPending}
                            className={`btn-secondary text-xs flex items-center gap-1.5 ${ns === 'open' ? 'hover:border-accent-500/50 hover:text-accent-400' :
                                    ns === 'locked' ? 'hover:border-amber-500/50 hover:text-amber-400' : ''
                                }`}
                        >
                            {updateStatus.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                            {ns === 'open' ? '▶ Open' : ns === 'locked' ? '🔒 Lock' : ns}
                        </button>
                    ))}

                    {/* Settle */}
                    {canSettle && (
                        <button
                            onClick={() => setShowSettle(!showSettle)}
                            className="btn-secondary text-xs flex items-center gap-1.5 hover:border-green-500/50 hover:text-green-400"
                        >
                            <Trophy className="w-3 h-3" />
                            Settle
                        </button>
                    )}

                    {/* Void */}
                    {canVoid && (
                        <button
                            onClick={handleVoid}
                            disabled={voidMarket.isPending}
                            className="btn-secondary text-xs flex items-center gap-1.5 hover:border-loss-500/50 hover:text-loss-400"
                        >
                            {voidMarket.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <AlertTriangle className="w-3 h-3" />}
                            Void
                        </button>
                    )}
                </div>
            )}

            {/* Settle dropdown */}
            {showSettle && (
                <div className="p-4 bg-dark-800/60 rounded-xl space-y-3 animate-fade-in">
                    <p className="text-sm text-dark-300 font-medium">Select the winning outcome:</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {market.selections?.map((sel) => (
                            <button
                                key={sel.id}
                                onClick={() => setWinnerSelId(sel.id)}
                                className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${winnerSelId === sel.id
                                        ? 'border-green-500 bg-green-500/15 text-green-400'
                                        : 'border-dark-600/40 bg-dark-700/40 text-white hover:border-dark-500'
                                    }`}
                            >
                                {sel.label}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleSettle} disabled={settleMarket.isPending} className="btn-primary text-sm flex items-center gap-2">
                            {settleMarket.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                            Confirm Settlement
                        </button>
                        <button onClick={() => setShowSettle(false)} className="btn-secondary text-sm">Cancel</button>
                    </div>
                </div>
            )}
        </div>
    );
}
