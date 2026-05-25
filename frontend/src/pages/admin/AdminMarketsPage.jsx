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
    Target,
    Clock,
    Lock,
    CheckCircle,
    XCircle,
    AlertTriangle,
    Trophy,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, EmptyState, LoadingRows, PageHeader, Panel, SelectInput, cx } from '../../components/ui';

const transitionTargets = {
    coming_soon: ['open'],
    open: ['locked'],
    locked: ['open'],
};

const statusIcons = {
    coming_soon: Clock,
    open: Target,
    locked: Lock,
    settled: CheckCircle,
    voided: XCircle,
};

export default function AdminMarketsPage() {
    const { data: tournaments } = useTournaments();
    const [tournamentId, setTournamentId] = useState('');
    const [eventId, setEventId] = useState('');
    const { data: events } = useTournamentEvents(tournamentId);
    const { data: eventMarkets, isLoading: loadingEM, refetch: refetchEM } = useEventMarkets(eventId);
    const { data: allMarkets, isLoading: loadingAll, refetch: refetchAll } = useAllTournamentMarkets(tournamentId);

    const markets = eventId ? eventMarkets : allMarkets;
    const isLoading = eventId ? loadingEM : loadingAll;
    const refetch = eventId ? refetchEM : refetchAll;
    const hasSelection = eventId || tournamentId;

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Target className="h-6 w-6" />}
                title="Manage markets"
                description="Open, lock, settle, or void markets after selecting a tournament."
            />

            <Panel className="grid gap-4 p-4 sm:grid-cols-2">
                <div>
                    <label className="form-label">Tournament</label>
                    <SelectInput value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setEventId(''); }}>
                        <option value="">Select tournament...</option>
                        {tournaments?.map((tournament) => (
                            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                        ))}
                    </SelectInput>
                </div>

                {tournamentId && (
                    <div>
                        <label className="form-label">Event filter</label>
                        <SelectInput value={eventId} onChange={(e) => setEventId(e.target.value)}>
                            <option value="">All markets</option>
                            {events?.map((event) => (
                                <option key={event.id} value={event.id}>{event.title}</option>
                            ))}
                        </SelectInput>
                    </div>
                )}
            </Panel>

            {!hasSelection ? (
                <EmptyState icon={<Target className="h-6 w-6" />} title="Select a tournament" description="Choose a tournament to inspect its markets." />
            ) : isLoading ? (
                <LoadingRows count={3} />
            ) : markets?.length === 0 ? (
                <EmptyState icon={<Target className="h-6 w-6" />} title="No markets found" description="Create one from the Create Market page." />
            ) : (
                <div className="space-y-4">
                    {markets.map((market) => (
                        <MarketAdminCard key={market.id} market={market} onRefetch={refetch} />
                    ))}
                </div>
            )}
        </div>
    );
}

function MarketAdminCard({ market, onRefetch }) {
    const updateStatus = useUpdateMarketStatus();
    const settleMarket = useSettleMarket();
    const voidMarket = useVoidMarket();
    const [showSettle, setShowSettle] = useState(false);
    const [winnerSelId, setWinnerSelId] = useState('');

    const Icon = statusIcons[market.status] || Clock;
    const nextStates = transitionTargets[market.status] || [];
    const canSettle = market.status === 'locked';
    const canVoid = ['open', 'locked'].includes(market.status);
    const isTerminal = ['settled', 'voided'].includes(market.status);

    const handleStatusChange = async (newStatus) => {
        try {
            await updateStatus.mutateAsync({ marketId: market.id, status: newStatus });
            toast.success(`Market changed to ${newStatus}`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    const handleSettle = async () => {
        if (!winnerSelId) {
            toast.error('Pick the winning selection');
            return;
        }
        try {
            await settleMarket.mutateAsync({ marketId: market.id, winning_selection_id: winnerSelId });
            toast.success('Market settled');
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
            toast.success('Market voided, stakes refunded');
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    return (
        <Panel className="overflow-hidden">
            <div className="border-b border-slate-200 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                        <h3 className="text-lg font-semibold text-slate-950">{market.question}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge status={market.status}>
                                <Icon className="h-3 w-3" />
                                {market.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs font-medium uppercase tracking-wide text-slate-500">{market.market_type}</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4">
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {market.selections?.map((selection) => (
                        <div
                            key={selection.id}
                            className={cx(
                                'rounded-md border px-3 py-2 text-sm',
                                selection.is_winner === true
                                    ? 'border-teal-300 bg-teal-50 text-teal-900'
                                    : selection.is_winner === false
                                        ? 'border-slate-200 bg-slate-50 text-slate-400 line-through'
                                        : 'border-slate-200 bg-white text-slate-800'
                            )}
                        >
                            <p className="truncate text-xs font-medium text-slate-500">{selection.label}</p>
                            <p className="mt-1 font-semibold">{parseFloat(selection.odds).toFixed(2)}</p>
                        </div>
                    ))}
                </div>

                {!isTerminal && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-4">
                        {nextStates.map((state) => (
                            <Button key={state} onClick={() => handleStatusChange(state)} loading={updateStatus.isPending} className="text-xs">
                                {state === 'open' ? 'Open' : state === 'locked' ? 'Lock' : state}
                            </Button>
                        ))}
                        {canSettle && (
                            <Button onClick={() => setShowSettle(!showSettle)} className="text-xs">
                                <Trophy className="h-3.5 w-3.5" />
                                Settle
                            </Button>
                        )}
                        {canVoid && (
                            <Button onClick={handleVoid} loading={voidMarket.isPending} className="text-xs">
                                <AlertTriangle className="h-3.5 w-3.5" />
                                Void
                            </Button>
                        )}
                    </div>
                )}

                {showSettle && (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-semibold text-slate-800">Select the winning outcome</p>
                        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {market.selections?.map((selection) => (
                                <button
                                    key={selection.id}
                                    onClick={() => setWinnerSelId(selection.id)}
                                    className={cx(
                                        'rounded-md border px-3 py-2 text-sm font-semibold transition',
                                        winnerSelId === selection.id
                                            ? 'border-teal-700 bg-teal-50 text-teal-900'
                                            : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                    )}
                                >
                                    {selection.label}
                                </button>
                            ))}
                        </div>
                        <div className="mt-3 flex gap-2">
                            <Button onClick={handleSettle} variant="primary" loading={settleMarket.isPending}>Confirm settlement</Button>
                            <Button onClick={() => setShowSettle(false)}>Cancel</Button>
                        </div>
                    </div>
                )}
            </div>
        </Panel>
    );
}
