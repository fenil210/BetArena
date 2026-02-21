import { useState } from 'react';
import { useMyBets } from '../hooks/useApi';
import { Ticket, Coins, CheckCircle, XCircle, Clock, Ban } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';

const TABS = [
    { key: '', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
    { key: 'voided', label: 'Voided' },
];

export default function MyBetsPage() {
    const [activeTab, setActiveTab] = useState('');
    const { data: bets, isLoading } = useMyBets(activeTab || undefined);

    const statusIcon = {
        open: <Clock className="w-4 h-4 text-blue-400" />,
        won: <CheckCircle className="w-4 h-4 text-accent-400" />,
        lost: <XCircle className="w-4 h-4 text-loss-400" />,
        voided: <Ban className="w-4 h-4 text-dark-400" />,
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Ticket className="w-6 h-6 text-accent-400" />
                <h1 className="text-2xl font-bold text-white">My Bets</h1>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-2 overflow-x-auto pb-1">
                {TABS.map((tab) => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${activeTab === tab.key
                            ? 'bg-accent-600/15 text-accent-400'
                            : 'bg-dark-800/60 text-dark-400 hover:bg-dark-700/50 hover:text-white'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Bets list */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-4 animate-pulse">
                            <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-dark-700 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : bets?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Ticket className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">
                        {activeTab ? `No ${activeTab} bets` : 'No bets placed yet'}
                    </p>
                    <p className="text-dark-500 text-sm mt-1">
                        Browse markets and place your first prediction!
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {bets.map((bet) => (
                        <div key={bet.id} className="glass-card p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        {statusIcon[bet.status]}
                                        <span className={`text-sm font-medium capitalize ${bet.status === 'won' ? 'text-accent-400' :
                                            bet.status === 'lost' ? 'text-loss-400' :
                                                bet.status === 'voided' ? 'text-dark-400' : 'text-blue-400'
                                            }`}>
                                            {bet.status}
                                        </span>
                                    </div>
                                    <p className="text-white font-medium truncate">
                                        {bet.selection_label || 'Selection'}
                                    </p>
                                    <p className="text-dark-400 text-sm mt-0.5 truncate">
                                        {bet.market_question || 'Market'}
                                    </p>
                                    <p className="text-xs text-dark-500 mt-1">
                                        {formatDateTime(bet.placed_at)}
                                    </p>
                                </div>
                                <div className="text-right shrink-0">
                                    <div className="flex items-center gap-1 justify-end">
                                        <Coins className="w-3.5 h-3.5 text-gold-400" />
                                        <span className="text-sm font-semibold text-white">{bet.stake}</span>
                                    </div>
                                    {bet.odds && (
                                        <div className="text-xs text-dark-400 mt-0.5">
                                            @ {parseFloat(bet.odds).toFixed(2)} → {bet.potential_payout}
                                        </div>
                                    )}
                                    {bet.status === 'won' && (
                                        <div className="text-sm font-bold text-accent-400 mt-1">
                                            +{bet.potential_payout}
                                        </div>
                                    )}
                                    {bet.status === 'voided' && (
                                        <div className="text-sm text-dark-400 mt-1">
                                            Refunded
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
