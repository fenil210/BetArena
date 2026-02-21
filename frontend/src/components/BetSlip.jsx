import { useState } from 'react';
import { usePlaceBet } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { X, Coins, Loader2, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function BetSlip({ market, selection, onClose }) {
    const { user, refreshUser } = useAuth();
    const placeBet = usePlaceBet();
    const [stake, setStake] = useState('');

    const stakeNum = parseInt(stake) || 0;
    const odds = parseFloat(selection.odds);
    const payout = Math.floor(stakeNum * odds);
    const canPlace = stakeNum > 0 && stakeNum <= (user?.balance || 0);

    const quickStakes = [50, 100, 250, 500];

    const handlePlace = async () => {
        if (!canPlace) return;

        try {
            await placeBet.mutateAsync({
                selection_id: selection.id,
                stake: stakeNum,
            });
            toast.success(`Bet confirmed! ${stakeNum} coins on "${selection.label}"`);
            await refreshUser();
            onClose();
        } catch (err) {
            const msg = err.response?.data?.detail || 'Failed to place bet';
            toast.error(msg);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Slip card */}
            <div className="relative w-full sm:max-w-md bg-dark-800 border border-dark-600/50 rounded-t-2xl sm:rounded-2xl animate-slide-up shadow-2xl">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-dark-700/50">
                    <h3 className="font-semibold text-white">Place Bet</h3>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-lg hover:bg-dark-700/60 transition-colors"
                    >
                        <X className="w-5 h-5 text-dark-400" />
                    </button>
                </div>

                <div className="p-4 space-y-4">
                    {/* Market + Selection */}
                    <div className="bg-dark-700/40 rounded-xl p-4 space-y-2">
                        <p className="text-sm text-dark-400">{market.question}</p>
                        <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{selection.label}</span>
                            <span className="text-lg font-bold text-accent-400">
                                {odds.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    {/* Stake input */}
                    <div>
                        <label className="block text-sm text-dark-400 mb-2">
                            Stake (Balance: {user?.balance?.toLocaleString()} coins)
                        </label>
                        <div className="relative">
                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gold-400" />
                            <input
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                placeholder="Enter stake"
                                min="1"
                                max={user?.balance}
                                className="w-full pl-10 pr-4 py-3 rounded-xl bg-dark-700/60 border border-dark-500/40
                         text-white placeholder-dark-400 focus:outline-none focus:border-accent-500/50
                         focus:ring-1 focus:ring-accent-500/20 transition-colors text-lg font-semibold"
                                autoFocus
                            />
                        </div>

                        {/* Quick stake buttons */}
                        <div className="flex gap-2 mt-2">
                            {quickStakes.map((qs) => (
                                <button
                                    key={qs}
                                    onClick={() => setStake(String(Math.min(qs, user?.balance || 0)))}
                                    className="flex-1 py-2 rounded-lg bg-dark-700/50 border border-dark-600/30
                           text-sm font-medium text-dark-300 hover:bg-dark-600/50
                           hover:text-white transition-colors"
                                >
                                    {qs}
                                </button>
                            ))}
                            <button
                                onClick={() => setStake(String(user?.balance || 0))}
                                className="flex-1 py-2 rounded-lg bg-gold-500/10 border border-gold-500/20
                         text-sm font-medium text-gold-400 hover:bg-gold-500/20
                         transition-colors"
                            >
                                MAX
                            </button>
                        </div>
                    </div>

                    {/* Payout preview */}
                    {stakeNum > 0 && (
                        <div className="bg-accent-500/5 border border-accent-500/20 rounded-xl p-4 animate-fade-in">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-dark-400">Potential Payout</span>
                                <span className="text-xl font-bold text-accent-400 flex items-center gap-1">
                                    <Coins className="w-5 h-5 text-gold-400" />
                                    {payout.toLocaleString()}
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-dark-500 mt-1">
                                <span>Profit</span>
                                <span className="text-accent-400">+{(payout - stakeNum).toLocaleString()}</span>
                            </div>
                        </div>
                    )}

                    {/* Insufficient balance warning */}
                    {stakeNum > (user?.balance || 0) && (
                        <p className="text-sm text-loss-400 text-center">
                            Insufficient balance!
                        </p>
                    )}

                    {/* Place bet button */}
                    <button
                        onClick={handlePlace}
                        disabled={!canPlace || placeBet.isPending}
                        className="btn-primary w-full flex items-center justify-center gap-2 py-3"
                    >
                        {placeBet.isPending ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Placing bet...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                Place Bet — {stakeNum > 0 ? `${stakeNum} coins` : 'Enter stake'}
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
