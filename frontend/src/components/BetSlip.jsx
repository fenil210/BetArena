import { useState } from 'react';
import { usePlaceBet } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { X, Coins, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, IconButton, TextInput, cx } from './ui';

export default function BetSlip({ market, selection, onClose }) {
    const { user, refreshUser } = useAuth();
    const placeBet = usePlaceBet();
    const [stake, setStake] = useState('');

    const stakeNum = parseInt(stake) || 0;
    const odds = parseFloat(selection.odds);
    const payout = Math.floor(stakeNum * odds);
    const profit = payout - stakeNum;
    const canPlace = stakeNum > 0 && stakeNum <= (user?.balance || 0);
    const quickStakes = [50, 100, 250, 500];

    const handlePlace = async () => {
        if (!canPlace) return;

        try {
            await placeBet.mutateAsync({
                selection_id: selection.id,
                stake: stakeNum,
            });
            toast.success(`Bet confirmed: ${stakeNum} coins on ${selection.label}`);
            await refreshUser();
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to place bet');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 p-0 sm:items-center sm:p-4">
            <button className="absolute inset-0 cursor-default" onClick={onClose} aria-label="Close bet slip" />

            <div className="relative w-full max-w-md rounded-t-lg border border-slate-200 bg-white shadow-2xl sm:rounded-lg">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-800">Bet slip</p>
                        <h3 className="mt-1 text-lg font-semibold text-slate-950">Confirm selection</h3>
                    </div>
                    <IconButton label="Close bet slip" onClick={onClose}>
                        <X className="h-4 w-4" />
                    </IconButton>
                </div>

                <div className="space-y-5 p-5">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm leading-5 text-slate-600">{market.question}</p>
                        <div className="mt-3 flex items-center justify-between gap-3">
                            <p className="font-semibold text-slate-950">{selection.label}</p>
                            <span className="rounded-md border border-teal-200 bg-white px-2.5 py-1 text-lg font-semibold text-teal-900">
                                {odds.toFixed(2)}
                            </span>
                        </div>
                    </div>

                    <div>
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <label className="text-sm font-medium text-slate-700">Stake</label>
                            <span className="text-xs font-medium text-slate-500">
                                Balance: {user?.balance?.toLocaleString()} coins
                            </span>
                        </div>
                        <div className="relative">
                            <Coins className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-amber-700" />
                            <TextInput
                                type="number"
                                value={stake}
                                onChange={(e) => setStake(e.target.value)}
                                placeholder="Enter stake"
                                min="1"
                                max={user?.balance}
                                className="pl-10 text-base font-semibold"
                                autoFocus
                            />
                        </div>

                        <div className="mt-2 grid grid-cols-5 gap-2">
                            {quickStakes.map((quickStake) => (
                                <button
                                    key={quickStake}
                                    onClick={() => setStake(String(Math.min(quickStake, user?.balance || 0)))}
                                    className="rounded-md border border-slate-300 bg-white px-2 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                                >
                                    {quickStake}
                                </button>
                            ))}
                            <button
                                onClick={() => setStake(String(user?.balance || 0))}
                                className="rounded-md border border-amber-200 bg-amber-50 px-2 py-2 text-sm font-semibold text-amber-900 transition hover:bg-amber-100"
                            >
                                Max
                            </button>
                        </div>
                    </div>

                    {stakeNum > 0 && (
                        <div className="rounded-lg border border-teal-200 bg-teal-50 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-teal-900">Potential payout</span>
                                <span className="flex items-center gap-1 text-xl font-semibold text-teal-950">
                                    <Coins className="h-5 w-5 text-amber-700" />
                                    {payout.toLocaleString()}
                                </span>
                            </div>
                            <div className="mt-1 flex items-center justify-between text-xs font-medium text-teal-800">
                                <span>Projected profit</span>
                                <span className={cx(profit >= 0 ? 'text-teal-900' : 'text-red-700')}>
                                    {profit >= 0 ? '+' : ''}{profit.toLocaleString()}
                                </span>
                            </div>
                        </div>
                    )}

                    {stakeNum > (user?.balance || 0) && (
                        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-center text-sm font-medium text-red-700">
                            Insufficient balance
                        </p>
                    )}

                    <Button
                        variant="primary"
                        onClick={handlePlace}
                        disabled={!canPlace}
                        loading={placeBet.isPending}
                        className="w-full py-3"
                    >
                        <CheckCircle className="h-5 w-5" />
                        {stakeNum > 0 ? `Place bet: ${stakeNum} coins` : 'Enter stake to place bet'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
