import { useState } from 'react';
import {
    useTournaments,
    useTournamentEvents,
    useCreateMarket,
} from '../../hooks/useApi';
import { PlusCircle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, FormField, PageHeader, Panel, SelectInput, TextInput } from '../../components/ui';

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

    const updateSelection = (index, field, value) => {
        const updated = [...selections];
        updated[index][field] = value;
        setSelections(updated);
    };

    const removeSelection = (index) => {
        if (selections.length <= 2) return;
        setSelections(selections.filter((_, currentIndex) => currentIndex !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!question || selections.some((selection) => !selection.label || !selection.odds)) {
            toast.error('Fill in all fields');
            return;
        }

        const payload = {
            question,
            market_type: marketType,
            status: marketStatus,
            selections: selections.map((selection) => ({
                label: selection.label,
                odds: parseFloat(selection.odds),
            })),
        };
        if (eventId) payload.event_id = eventId;
        if (tournamentId) payload.tournament_id = tournamentId;

        try {
            await createMarket.mutateAsync(payload);
            toast.success('Market created');
            setQuestion('');
            setSelections([{ label: '', odds: '' }, { label: '', odds: '' }]);
        } catch (err) {
            const detail = err.response?.data?.detail;
            const msg = Array.isArray(detail)
                ? detail.map((item) => item.msg).join(', ')
                : detail || 'Failed to create market';
            toast.error(msg);
        }
    };

    return (
        <div className="page-stack max-w-3xl">
            <PageHeader
                icon={<PlusCircle className="h-6 w-6" />}
                title="Create market"
                description="Configure the market context, question, opening state, and odds."
            />

            <Panel as="form" onSubmit={handleSubmit} className="space-y-6 p-5">
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Tournament">
                        <SelectInput value={tournamentId} onChange={(e) => { setTournamentId(e.target.value); setEventId(''); }}>
                            <option value="">Select tournament...</option>
                            {tournaments?.map((tournament) => (
                                <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                            ))}
                        </SelectInput>
                    </FormField>

                    {tournamentId && (
                        <FormField label="Event" hint="Leave empty for a tournament-level market.">
                            <SelectInput value={eventId} onChange={(e) => setEventId(e.target.value)}>
                                <option value="">Tournament-level market</option>
                                {events?.map((event) => (
                                    <option key={event.id} value={event.id}>{event.title}</option>
                                ))}
                            </SelectInput>
                        </FormField>
                    )}
                </div>

                <FormField label="Question">
                    <TextInput value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Who will win the match?" />
                </FormField>

                <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Market type">
                        <SelectInput value={marketType} onChange={(e) => setMarketType(e.target.value)}>
                            <option value="match_winner">Match Winner</option>
                            <option value="over_under">Over/Under</option>
                            <option value="both_teams_score">Both Teams Score</option>
                            <option value="first_scorer">First Scorer</option>
                            <option value="custom">Custom / Freeform</option>
                        </SelectInput>
                    </FormField>
                    <FormField label="Initial status">
                        <SelectInput value={marketStatus} onChange={(e) => setMarketStatus(e.target.value)}>
                            <option value="coming_soon">Coming Soon</option>
                            <option value="open">Open</option>
                            <option value="locked">Locked</option>
                        </SelectInput>
                    </FormField>
                </div>

                <div>
                    <div className="mb-2 flex items-center justify-between gap-3">
                        <label className="form-label mb-0">Selections and odds</label>
                        <button type="button" onClick={addSelection} className="text-sm font-semibold text-teal-800 hover:text-teal-950">
                            Add selection
                        </button>
                    </div>
                    <div className="space-y-2">
                        {selections.map((selection, index) => (
                            <div key={index} className="grid grid-cols-[1fr_110px_auto] gap-2">
                                <TextInput
                                    value={selection.label}
                                    onChange={(e) => updateSelection(index, 'label', e.target.value)}
                                    placeholder={`Selection ${index + 1}`}
                                />
                                <TextInput
                                    value={selection.odds}
                                    onChange={(e) => updateSelection(index, 'odds', e.target.value)}
                                    placeholder="Odds"
                                    type="number"
                                    step="0.01"
                                    min="1.01"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeSelection(index)}
                                    disabled={selections.length <= 2}
                                    className="icon-button text-red-700 disabled:text-slate-300"
                                    aria-label="Remove selection"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

                <Button type="submit" variant="primary" loading={createMarket.isPending} className="w-full py-3">
                    <PlusCircle className="h-5 w-5" />
                    Create market
                </Button>
            </Panel>
        </div>
    );
}
