import { useState } from 'react';
import {
    useTournaments,
    useTournamentEvents,
    useCreateMarket,
} from '../../hooks/useApi';
import { PlusCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminMarketCreatePage() {
    const { data: tournaments } = useTournaments();
    const [tournamentId, setTournamentId] = useState('');
    const [eventId, setEventId] = useState('');
    const { data: events } = useTournamentEvents(tournamentId);
    const createMarket = useCreateMarket();

    const [question, setQuestion] = useState('');
    const [marketType, setMarketType] = useState('match_winner');
    const [marketStatus, setMarketStatus] = useState('open');
    const [selections, setSelections] = useState([
        { label: '', odds: '' },
        { label: '', odds: '' },
    ]);

    const addSelection = () => setSelections([...selections, { label: '', odds: '' }]);

    const updateSelection = (i, field, val) => {
        const updated = [...selections];
        updated[i][field] = val;
        setSelections(updated);
    };

    const removeSelection = (i) => {
        if (selections.length <= 2) return;
        setSelections(selections.filter((_, idx) => idx !== i));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question || selections.some((s) => !s.label || !s.odds)) {
            toast.error('Fill in all fields');
            return;
        }

        const payload = {
            question,
            market_type: marketType,
            status: marketStatus,
            selections: selections.map((s) => ({
                label: s.label,
                odds: parseFloat(s.odds),
            })),
        };
        // Only include IDs if they are actually selected (not empty string)
        if (eventId) payload.event_id = eventId;
        if (tournamentId) payload.tournament_id = tournamentId;

        try {
            await createMarket.mutateAsync(payload);
            toast.success('Market created!');
            setQuestion('');
            setSelections([{ label: '', odds: '' }, { label: '', odds: '' }]);
        } catch (err) {
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? detail.map(d => d.msg).join(', ')
                : detail || 'Failed to create market';
            toast.error(msg);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl">
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <PlusCircle className="w-6 h-6 text-accent-400" />
                Create Market
            </h1>

            <form onSubmit={handleSubmit} className="glass-card p-6 space-y-5">
                {/* Tournament selection */}
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Tournament</label>
                    <select
                        value={tournamentId}
                        onChange={(e) => { setTournamentId(e.target.value); setEventId(''); }}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                    >
                        <option value="">Select tournament...</option>
                        {tournaments?.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                {/* Event selection (optional) */}
                {tournamentId && (
                    <div className="animate-fade-in">
                        <label className="block text-sm text-dark-400 mb-1">Event (optional — for match-level markets)</label>
                        <select
                            value={eventId}
                            onChange={(e) => setEventId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                        >
                            <option value="">Tournament-level market (no event)</option>
                            {events?.map((ev) => (
                                <option key={ev.id} value={ev.id}>{ev.title}</option>
                            ))}
                        </select>
                    </div>
                )}

                {/* Market question */}
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Question</label>
                    <input
                        value={question}
                        onChange={(e) => setQuestion(e.target.value)}
                        placeholder="e.g. Who will win the match?"
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                    />
                </div>

                {/* Market type */}
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Market Type</label>
                    <select
                        value={marketType}
                        onChange={(e) => setMarketType(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                    >
                        <option value="match_winner">Match Winner</option>
                        <option value="over_under">Over/Under</option>
                        <option value="both_teams_score">Both Teams Score</option>
                        <option value="first_scorer">First Scorer</option>
                        <option value="custom">Custom / Freeform</option>
                    </select>
                </div>

                {/* Initial Status */}
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Initial Status</label>
                    <select
                        value={marketStatus}
                        onChange={(e) => setMarketStatus(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                    >
                        <option value="coming_soon">Coming Soon</option>
                        <option value="open">Open (accepting bets now)</option>
                        <option value="locked">Locked</option>
                    </select>
                </div>

                {/* Selections */}
                <div>
                    <label className="block text-sm text-dark-400 mb-2">Selections & Odds</label>
                    <div className="space-y-2">
                        {selections.map((sel, i) => (
                            <div key={i} className="flex gap-2 items-center">
                                <input
                                    value={sel.label}
                                    onChange={(e) => updateSelection(i, 'label', e.target.value)}
                                    placeholder={`Selection ${i + 1}`}
                                    className="flex-1 px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                                />
                                <input
                                    value={sel.odds}
                                    onChange={(e) => updateSelection(i, 'odds', e.target.value)}
                                    placeholder="Odds"
                                    type="number"
                                    step="0.01"
                                    min="1.01"
                                    className="w-24 px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                                />
                                {selections.length > 2 && (
                                    <button
                                        type="button"
                                        onClick={() => removeSelection(i)}
                                        className="p-2 text-loss-400 hover:bg-loss-500/10 rounded-lg transition-colors"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        onClick={addSelection}
                        className="mt-2 text-sm text-accent-400 hover:text-accent-300 transition-colors"
                    >
                        + Add Selection
                    </button>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={createMarket.isPending}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                >
                    {createMarket.isPending ? (
                        <><Loader2 className="w-5 h-5 animate-spin" /> Creating...</>
                    ) : (
                        <><PlusCircle className="w-5 h-5" /> Create Market</>
                    )}
                </button>
            </form>
        </div>
    );
}
