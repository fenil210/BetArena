import { useState } from 'react';
import { Target, Lock, CheckCircle, XCircle } from 'lucide-react';
import BetSlip from './BetSlip';

export default function MarketCard({ market }) {
    const [selectedSelection, setSelectedSelection] = useState(null);

    const statusConfig = {
        coming_soon: { badge: 'badge-coming-soon', label: 'Coming Soon', canBet: false },
        open: { badge: 'badge-open', label: 'Open', canBet: true },
        locked: { badge: 'badge-locked', label: 'Locked', canBet: false },
        settled: { badge: 'badge-settled', label: 'Settled', canBet: false },
        voided: { badge: 'badge-voided', label: 'Voided', canBet: false },
    };

    const config = statusConfig[market.status] || statusConfig.coming_soon;

    return (
        <>
            <div className="glass-card p-5 space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm sm:text-base">
                            {market.question}
                        </h3>
                        {market.market_type && (
                            <span className="text-xs text-dark-400 mt-1 block">{market.market_type}</span>
                        )}
                    </div>
                    <span className={`badge ${config.badge} shrink-0`}>{config.label}</span>
                </div>

                {/* Selections / Odds */}
                <div className={`grid gap-2 ${market.selections?.length === 2 ? 'grid-cols-2' :
                        market.selections?.length === 3 ? 'grid-cols-3' :
                            'grid-cols-2 sm:grid-cols-3'
                    }`}>
                    {market.selections?.map((sel) => {
                        const isWinner = sel.is_winner === true;
                        const isLoser = market.status === 'settled' && !sel.is_winner;

                        return (
                            <button
                                key={sel.id}
                                onClick={() => {
                                    if (!config.canBet) return;
                                    setSelectedSelection(
                                        selectedSelection?.id === sel.id ? null : sel
                                    );
                                }}
                                disabled={!config.canBet}
                                className={`odds-btn relative ${selectedSelection?.id === sel.id ? 'selected' : ''
                                    } ${!config.canBet ? 'opacity-60 cursor-not-allowed' : ''} ${isWinner ? '!border-accent-500 !bg-accent-500/15' : ''
                                    } ${isLoser ? 'opacity-40' : ''}`}
                            >
                                {isWinner && (
                                    <CheckCircle className="w-4 h-4 text-accent-400 absolute top-1.5 right-1.5" />
                                )}
                                <div className="text-xs text-dark-400 truncate">{sel.label}</div>
                                <div className={`text-lg font-bold mt-0.5 ${selectedSelection?.id === sel.id ? 'text-accent-400' :
                                        isWinner ? 'text-accent-400' : 'text-white'
                                    }`}>
                                    {parseFloat(sel.odds).toFixed(2)}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Status info for settled/voided */}
                {market.status === 'settled' && (
                    <div className="flex items-center gap-2 text-xs text-accent-400">
                        <CheckCircle className="w-4 h-4" />
                        Market settled
                    </div>
                )}
                {market.status === 'voided' && (
                    <div className="flex items-center gap-2 text-xs text-loss-400">
                        <XCircle className="w-4 h-4" />
                        Market voided — all stakes refunded
                    </div>
                )}
            </div>

            {/* Bet Slip drawer */}
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
