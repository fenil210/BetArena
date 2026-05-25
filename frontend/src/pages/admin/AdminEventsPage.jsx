import { useState } from 'react';
import {
    useTournaments,
    useTournamentEvents,
    useCreateEvent,
    useUpdateEventStatus,
    useDeleteEvent,
    useMatchesByMatchday,
    useMatchesByStage,
    useSeasonInfo,
} from '../../hooks/useApi';
import { CalendarPlus, Plus, Clock, Tv, CheckCircle, XCircle, Trash2, Search, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/formatDate';
import { Badge, Button, EmptyState, FormField, IconButton, LoadingRows, PageHeader, Panel, SelectInput, TextInput, cx } from '../../components/ui';

const STAGE_LABELS = {
    REGULAR_SEASON: 'Regular Season',
    LEAGUE_STAGE: 'League Stage',
    GROUP_STAGE: 'Group Stage',
    LAST_16: 'Round of 16',
    QUARTER_FINALS: 'Quarter Finals',
    SEMI_FINALS: 'Semi Finals',
    FINAL: 'Final',
    THIRD_PLACE: 'Third Place Play-off',
    PLAYOFF_ROUND_1: 'Play-off Round 1',
    PLAYOFF_ROUND_2: 'Play-off Round 2',
    PLAYOFFS: 'Playoffs',
    QUALIFICATION: 'Qualification',
    QUALIFICATION_ROUND_1: 'Qualification Round 1',
    QUALIFICATION_ROUND_2: 'Qualification Round 2',
    QUALIFICATION_ROUND_3: 'Qualification Round 3',
};

export default function AdminEventsPage() {
    const { data: tournaments } = useTournaments();
    const [selectedTournament, setSelectedTournament] = useState('');
    const { data: events, isLoading, refetch } = useTournamentEvents(selectedTournament);
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="page-stack">
            <PageHeader
                icon={<CalendarPlus className="h-6 w-6" />}
                title="Events and matches"
                description="Create match events manually or pre-fill them from football-data.org."
                actions={(
                    <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
                        <Plus className="h-4 w-4" />
                        Create event
                    </Button>
                )}
            />

            {showCreate && (
                <CreateEventForm
                    tournaments={tournaments}
                    onCreated={() => { setShowCreate(false); refetch(); }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            <Panel className="p-4">
                <FormField label="Tournament">
                    <SelectInput value={selectedTournament} onChange={(e) => setSelectedTournament(e.target.value)} className="sm:w-80">
                        <option value="">Choose a tournament...</option>
                        {tournaments?.map((tournament) => (
                            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                        ))}
                    </SelectInput>
                </FormField>
            </Panel>

            {!selectedTournament ? (
                <EmptyState icon={<CalendarPlus className="h-6 w-6" />} title="Select a tournament" description="Choose a tournament to see its events." />
            ) : isLoading ? (
                <LoadingRows count={3} />
            ) : events?.length === 0 ? (
                <EmptyState icon={<CalendarPlus className="h-6 w-6" />} title="No events yet" description="Create an event to add a match." />
            ) : (
                <Panel className="divide-y divide-slate-200 overflow-hidden">
                    {events.map((event) => (
                        <EventRow key={event.id} event={event} onRefetch={refetch} />
                    ))}
                </Panel>
            )}
        </div>
    );
}

function CreateEventForm({ tournaments, onCreated, onCancel }) {
    const createEvent = useCreateEvent();
    const [tournamentId, setTournamentId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [matchId, setMatchId] = useState('');
    const [useApiSource, setUseApiSource] = useState(false);
    const [fetchMode, setFetchMode] = useState('matchday');
    const [matchday, setMatchday] = useState('');
    const [selectedStage, setSelectedStage] = useState('');
    const [showMatchSelector, setShowMatchSelector] = useState(false);

    const { data: seasonInfo } = useSeasonInfo(tournamentId);
    const { data: matchesByMatchday, isLoading: loadingMatchday, refetch: refetchMatchday } = useMatchesByMatchday(tournamentId, parseInt(matchday, 10));
    const { data: matchesByStage, isLoading: loadingStage, refetch: refetchStage } = useMatchesByStage(tournamentId, selectedStage);

    const isLoading = fetchMode === 'matchday' ? loadingMatchday : loadingStage;
    const matchesData = fetchMode === 'matchday' ? matchesByMatchday : matchesByStage;
    const availableStages = seasonInfo?.stages || [];
    const hasStages = availableStages.length > 0;
    const hasMatchdays = seasonInfo?.current_matchday !== null && seasonInfo?.current_matchday !== undefined;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!tournamentId || !title) {
            toast.error('Tournament and title are required');
            return;
        }

        try {
            await createEvent.mutateAsync({
                tournament_id: tournamentId,
                match_id: matchId || null,
                title,
                description: description || null,
                starts_at: startsAt ? new Date(startsAt).toISOString() : null,
            });
            toast.success(`Event ${title} created`);
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create event');
        }
    };

    const handleFetchMatches = () => {
        if (!tournamentId) {
            toast.error('Please select a tournament first');
            return;
        }
        if (fetchMode === 'matchday') {
            if (!matchday || matchday < 1) {
                toast.error('Please enter a valid matchday');
                return;
            }
            setShowMatchSelector(true);
            refetchMatchday();
        } else {
            if (!selectedStage) {
                toast.error('Please select a stage');
                return;
            }
            setShowMatchSelector(true);
            refetchStage();
        }
    };

    const handleSelectMatch = (match) => {
        const homeName = match.home_team.short_name || match.home_team.name;
        const awayName = match.away_team.short_name || match.away_team.name;
        setTitle(`${homeName} vs ${awayName}`);

        let desc = '';
        if (match.stage && match.stage !== 'REGULAR_SEASON' && match.stage !== 'LEAGUE_STAGE') {
            desc = STAGE_LABELS[match.stage] || match.stage;
        }
        if (match.matchday) {
            desc = desc ? `${desc} - Matchday ${match.matchday}` : `Matchday ${match.matchday}`;
        }
        setDescription(desc);

        if (match.kickoff_at) {
            const date = new Date(match.kickoff_at);
            const localIso = new Date(date.getTime() - (date.getTimezoneOffset() * 60000))
                .toISOString()
                .slice(0, 16);
            setStartsAt(localIso);
        }
        setMatchId(match.id.toString());
        setShowMatchSelector(false);
        toast.success('Match selected');
    };

    return (
        <Panel as="form" onSubmit={handleSubmit} className="space-y-5 p-5">
            <h3 className="text-base font-semibold text-slate-950">New event</h3>

            <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Tournament" required>
                    <SelectInput
                        value={tournamentId}
                        onChange={(e) => {
                            setTournamentId(e.target.value);
                            setShowMatchSelector(false);
                            setMatchday('');
                            setSelectedStage('');
                        }}
                        required
                    >
                        <option value="">Select tournament...</option>
                        {tournaments?.map((tournament) => (
                            <option key={tournament.id} value={tournament.id}>{tournament.name}</option>
                        ))}
                    </SelectInput>
                </FormField>
                <FormField label="Start time">
                    <TextInput type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
                </FormField>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <button
                    type="button"
                    onClick={() => setUseApiSource(!useApiSource)}
                    className={cx(
                        'inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-semibold transition',
                        useApiSource ? 'border-teal-300 bg-teal-50 text-teal-900' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                    )}
                >
                    <Search className="h-4 w-4" />
                    {useApiSource ? 'Using football-data.org' : 'Fetch from football-data.org'}
                </button>
                {matchId && (
                    <span className="ml-3 inline-flex rounded-md bg-white px-2 py-1 text-xs font-semibold text-teal-800">
                        Match ID {matchId}
                    </span>
                )}

                {useApiSource && (
                    <div className="mt-4 space-y-4">
                        {tournamentId && (
                            <div className="flex flex-wrap gap-2">
                                <button
                                    type="button"
                                    onClick={() => { setFetchMode('matchday'); setShowMatchSelector(false); }}
                                    disabled={!hasMatchdays}
                                    className={cx('rounded-md border px-3 py-1.5 text-sm font-semibold', fetchMode === 'matchday' ? 'border-teal-700 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 disabled:opacity-50')}
                                >
                                    By matchday
                                </button>
                                <button
                                    type="button"
                                    onClick={() => { setFetchMode('stage'); setShowMatchSelector(false); }}
                                    disabled={!hasStages}
                                    className={cx('rounded-md border px-3 py-1.5 text-sm font-semibold', fetchMode === 'stage' ? 'border-teal-700 bg-teal-800 text-white' : 'border-slate-300 bg-white text-slate-700 disabled:opacity-50')}
                                >
                                    By stage
                                </button>
                            </div>
                        )}

                        {fetchMode === 'matchday' ? (
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                <FormField label="Matchday">
                                    <div className="flex gap-2">
                                        <TextInput type="number" min="1" max="50" value={matchday} onChange={(e) => setMatchday(e.target.value)} placeholder="27" />
                                        {hasMatchdays && (
                                            <Button type="button" onClick={() => setMatchday(seasonInfo.current_matchday.toString())}>
                                                Current {seasonInfo.current_matchday}
                                            </Button>
                                        )}
                                    </div>
                                </FormField>
                                <Button type="button" variant="primary" onClick={handleFetchMatches} loading={isLoading} disabled={!tournamentId}>
                                    <Search className="h-4 w-4" />
                                    Fetch matches
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                                <FormField label="Stage">
                                    <SelectInput value={selectedStage} onChange={(e) => setSelectedStage(e.target.value)}>
                                        <option value="">Select stage...</option>
                                        {availableStages.map((stage) => (
                                            <option key={stage} value={stage}>{STAGE_LABELS[stage] || stage}</option>
                                        ))}
                                    </SelectInput>
                                </FormField>
                                <Button type="button" variant="primary" onClick={handleFetchMatches} loading={isLoading} disabled={!tournamentId || !selectedStage}>
                                    <Trophy className="h-4 w-4" />
                                    Fetch matches
                                </Button>
                            </div>
                        )}

                        {showMatchSelector && matchesData && (
                            <div className="space-y-2">
                                <p className="text-sm font-medium text-slate-600">
                                    Showing {matchesData.matches?.length || 0} matches
                                </p>
                                {matchesData.matches?.length === 0 ? (
                                    <p className="text-sm text-slate-500">No matches found.</p>
                                ) : (
                                    <div className="grid max-h-80 gap-2 overflow-y-auto">
                                        {matchesData.matches.map((match) => (
                                            <MatchCard key={match.id} match={match} onSelect={() => handleSelectMatch(match)} />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            <FormField label="Title" required>
                <TextInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Juventus vs Como" required />
            </FormField>

            <FormField label="Description">
                <TextInput value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Matchday 26" />
            </FormField>

            <div className="flex gap-2">
                <Button type="submit" variant="primary" loading={createEvent.isPending}>Create event</Button>
                <Button type="button" onClick={onCancel}>Cancel</Button>
            </div>
        </Panel>
    );
}

function MatchCard({ match, onSelect }) {
    const stageLabel = match.stage && STAGE_LABELS[match.stage] ? STAGE_LABELS[match.stage] : match.stage;

    return (
        <button
            type="button"
            onClick={onSelect}
            className="w-full rounded-md border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:bg-teal-50/30"
        >
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                <div className="grid min-w-0 grid-cols-[1fr_auto_1fr] items-center gap-3">
                    <TeamName team={match.home_team} />
                    <span className="text-xs font-semibold uppercase text-slate-400">vs</span>
                    <TeamName team={match.away_team} />
                </div>
                <div className="text-left sm:text-right">
                    <Badge status={match.status === 'SCHEDULED' ? 'upcoming' : match.status === 'FINISHED' ? 'completed' : match.status?.toLowerCase()}>
                        {match.status}
                    </Badge>
                    {stageLabel && stageLabel !== 'Regular Season' && stageLabel !== 'League Stage' && (
                        <p className="mt-1 text-xs font-medium text-teal-800">{stageLabel}</p>
                    )}
                    {match.kickoff_at && <p className="mt-1 text-xs text-slate-500">{formatDateTime(match.kickoff_at)}</p>}
                </div>
            </div>
        </button>
    );
}

function TeamName({ team }) {
    return (
        <div className="flex min-w-0 items-center gap-2">
            {team.crest_url && <img src={team.crest_url} alt="" className="h-6 w-6 object-contain" />}
            <span className="truncate text-sm font-semibold text-slate-900">{team.short_name || team.name}</span>
        </div>
    );
}

function EventRow({ event, onRefetch }) {
    const updateStatus = useUpdateEventStatus();
    const deleteEvent = useDeleteEvent();

    const statusIcons = {
        upcoming: <Clock className="h-4 w-4 text-blue-700" />,
        live: <Tv className="h-4 w-4 text-teal-800" />,
        completed: <CheckCircle className="h-4 w-4 text-slate-500" />,
        cancelled: <XCircle className="h-4 w-4 text-red-700" />,
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateStatus.mutateAsync({ eventId: event.id, status: newStatus });
            toast.success(`Event status changed to ${newStatus}`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${event.title}"?\n\nThis will void all open bets and permanently remove the event, its markets, and all bets.`)) return;
        try {
            const result = await deleteEvent.mutateAsync(event.id);
            toast.success(`Deleted. ${result.bets_voided} bets voided, ${result.coins_refunded} coins refunded.`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete');
        }
    };

    return (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div className="min-w-0">
                <h3 className="truncate font-semibold text-slate-950">{event.title}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1 font-medium">
                        {statusIcons[event.status]}
                        {event.status}
                    </span>
                    {event.description && <span>{event.description}</span>}
                    {event.starts_at && <span>{formatDateTime(event.starts_at)}</span>}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <SelectInput
                    value={event.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updateStatus.isPending}
                    className="w-36 py-1.5 text-xs"
                >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                </SelectInput>
                <IconButton label="Delete event" onClick={handleDelete} disabled={deleteEvent.isPending} className="text-red-700 hover:bg-red-50">
                    <Trash2 className="h-4 w-4" />
                </IconButton>
            </div>
        </div>
    );
}
