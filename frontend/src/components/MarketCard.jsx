import { useState } from 'react';
import { CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { useMarketTrends } from '../hooks/useApi';
import BetSlip from './BetSlip';
import { Badge, Panel, cx } from './ui';

const statusConfig = {
    coming_soon: { label: 'Coming soon', canBet: false },
    open: { label: 'Open', canBet: true },
    locked: { label: 'Locked', canBet: false },
    settled: { label: 'Settled', canBet: false },
    voided: { label: 'Voided', canBet: false },
};

export default function MarketCard({ market }) {
    const [selectedSelection, setSelectedSelection] = useState(null);
    const { data: trendsData } = useMarketTrends(market.id);

    const config = statusConfig[market.status] || statusConfig.coming_soon;
    const trendMap = {};
    if (trendsData?.trends) {
        trendsData.trends.forEach((trend) => {
            trendMap[trend.selection_id] = trend;
        });
    }
    const hasTrends = trendsData && trendsData.total_bets > 0;

    const handleSelectionClick = (selection) => {
        if (!config.canBet) return;
        setSelectedSelection(selectedSelection?.id === selection.id ? null : selection);
    };

    return (
        <>
            <Panel className="overflow-hidden">
                <div className="border-b border-slate-200 p-4">
                    <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
                                {market.market_type?.replaceAll('_', ' ')}
                            </p>
                            <h3 className="mt-1 text-base font-semibold leading-6 text-slate-950">{market.question}</h3>
                        </div>
                        <Badge status={market.status}>{config.label}</Badge>
                    </div>
                </div>

                <div className="p-4">
                    <div
                        className={cx(
                            'grid gap-2',
                            market.selections?.length === 2
                                ? 'grid-cols-2'
                                : market.selections?.length === 3
                                    ? 'grid-cols-1 sm:grid-cols-3'
                                    : 'grid-cols-2 sm:grid-cols-3'
                        )}
                    >
                        {market.selections?.map((selection) => {
                            const isSelected = selectedSelection?.id === selection.id;
                            const isWinner = selection.is_winner === true;
                            const isLoser = market.status === 'settled' && selection.is_winner === false;
                            const trend = trendMap[selection.id];
                            const showTrend = hasTrends && trend && market.status === 'open';

                            return (
                                <button
                                    key={selection.id}
                                    onClick={() => handleSelectionClick(selection)}
                                    disabled={!config.canBet}
                                    className={cx(
                                        'odds-btn',
                                        isSelected && 'selected',
                                        !config.canBet && 'opacity-70',
                                        isWinner && 'border-teal-700 bg-teal-50',
                                        isLoser && 'opacity-45'
                                    )}
                                >
                                    {isWinner && <CheckCircle className="absolute right-2 top-2 h-4 w-4 text-teal-800" />}
                                    <div className="min-w-0 pr-5">
                                        <p className="truncate text-sm font-medium text-slate-800">{selection.label}</p>
                                        <p className={cx('mt-1 text-xl font-semibold tracking-tight', isWinner || isSelected ? 'text-teal-900' : 'text-slate-950')}>
                                            {parseFloat(selection.odds).toFixed(2)}
                                        </p>
                                    </div>

                                    {showTrend && (
                                        <div className="mt-3 border-t border-slate-200 pt-2">
                                            <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                                                <span className="inline-flex items-center gap-1">
                                                    <TrendingUp className="h-3 w-3" />
                                                    {trend.percentage}%
                                                </span>
                                                <span>{trend.bet_count} bets</span>
                                            </div>
                                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                                                <div className="market-trend-fill h-full rounded-full bg-teal-700" style={{ width: `${trend.percentage}%` }} />
                                            </div>
                                        </div>
                                    )}

                                    {!hasTrends && market.status === 'open' && (
                                        <p className="mt-3 border-t border-slate-200 pt-2 text-xs font-medium text-slate-500">
                                            No bets yet
                                        </p>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {market.status === 'settled' && (
                        <div className="mt-4 flex items-center gap-2 rounded-md bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">
                            <CheckCircle className="h-4 w-4 text-teal-800" />
                            Market settled
                        </div>
                    )}
                    {market.status === 'voided' && (
                        <div className="mt-4 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                            <XCircle className="h-4 w-4" />
                            Market voided, stakes refunded
                        </div>
                    )}
                    {hasTrends && market.status === 'open' && (
                        <p className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-slate-500">
                            <TrendingUp className="h-4 w-4 text-teal-800" />
                            Live market mix - {trendsData.total_bets} total bets
                        </p>
                    )}
                </div>
            </Panel>

            {selectedSelection && (
                <BetSlip
                    market={market}
                    selection={selectedSelection}
                    onClose={() => setSelectedSelection(null)}
                />
            )}
        </>
    );
}
