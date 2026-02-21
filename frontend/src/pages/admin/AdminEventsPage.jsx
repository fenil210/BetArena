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
import { CalendarPlus, Plus, Loader2, Clock, Tv, CheckCircle, XCircle, Trash2, Search, Trophy } from 'lucide-react';
import toast from 'react-hot-toast';
import { formatDateTime } from '../../utils/formatDate';

// Stage labels for display
const STAGE_LABELS = {
    'REGULAR_SEASON': 'Regular Season',
    'LEAGUE_STAGE': 'League Stage',
    'GROUP_STAGE': 'Group Stage',
    'LAST_16': 'Round of 16',
    'QUARTER_FINALS': 'Quarter Finals',
    'SEMI_FINALS': 'Semi Finals',
    'FINAL': 'Final',
    'THIRD_PLACE': 'Third Place Play-off',
    'PLAYOFF_ROUND_1': 'Play-off Round 1',
    'PLAYOFF_ROUND_2': 'Play-off Round 2',
    'PLAYOFFS': 'Playoffs',
    'QUALIFICATION': 'Qualification',
    'QUALIFICATION_ROUND_1': 'Qualification Round 1',
    'QUALIFICATION_ROUND_2': 'Qualification Round 2',
    'QUALIFICATION_ROUND_3': 'Qualification Round 3',
};

export default function AdminEventsPage() {
    const { data: tournaments } = useTournaments();
    const [selectedTournament, setSelectedTournament] = useState('');
    const { data: events, isLoading, refetch } = useTournamentEvents(selectedTournament);
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <CalendarPlus className="w-6 h-6 text-accent-400" />
                    Events / Matches
                </h1>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
                    <Plus className="w-4 h-4" />
                    Create Event
                </button>
            </div>

            {/* Create form */}
            {showCreate && (
                <CreateEventForm
                    tournaments={tournaments}
                    onCreated={() => { setShowCreate(false); refetch(); }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            {/* Tournament filter */}
            <div>
                <label className="block text-sm text-dark-400 mb-1">Select Tournament</label>
                <select
                    value={selectedTournament}
                    onChange={(e) => setSelectedTournament(e.target.value)}
                    className="w-full sm:w-72 px-4 py-2.5 rounded-xl bg-dark-800/80 border border-dark-600/40
                   text-white text-sm focus:outline-none focus:border-accent-500/50"
                >
                    <option value="">Choose a tournament...</option>
                    {tournaments?.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>

            {/* Events list */}
            {!selectedTournament ? (
                <div className="glass-card p-12 text-center">
                    <CalendarPlus className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400">Select a tournament to see its events</p>
                </div>
            ) : isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-5 bg-dark-700 rounded w-1/2 mb-2" />
                            <div className="h-4 bg-dark-700 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            ) : events?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <CalendarPlus className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">No events yet</p>
                    <p className="text-dark-500 text-sm mt-1">Click "Create Event" to add a match.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {events.map((ev) => (
                        <EventRow key={ev.id} event={ev} onRefetch={refetch} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────── Create Event Form ─────── */
function CreateEventForm({ tournaments, onCreated, onCancel }) {
    const createEvent = useCreateEvent();
    const [tournamentId, setTournamentId] = useState('');
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [startsAt, setStartsAt] = useState('');
    const [matchId, setMatchId] = useState('');

    // Match fetcher state
    const [useApiSource, setUseApiSource] = useState(false);
    const [fetchMode, setFetchMode] = useState('matchday'); // 'matchday' | 'stage'
    const [matchday, setMatchday] = useState('');
    const [selectedStage, setSelectedStage] = useState('');
    const [showMatchSelector, setShowMatchSelector] = useState(false);

    // Season info (includes stages)
    const { data: seasonInfo } = useSeasonInfo(tournamentId);
    
    // Fetch matches by matchday
    const { 
        data: matchesByMatchday, 
        isLoading: loadingMatchday, 
        refetch: refetchMatchday 
    } = useMatchesByMatchday(tournamentId, parseInt(matchday, 10));

    // Fetch matches by stage
    const { 
        data: matchesByStage, 
        isLoading: loadingStage, 
        refetch: refetchStage 
    } = useMatchesByStage(tournamentId, selectedStage);

    const isLoading = fetchMode === 'matchday' ? loadingMatchday : loadingStage;
    const matchesData = fetchMode === 'matchday' ? matchesByMatchday : matchesByStage;

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
            toast.success(`Event "${title}" created!`);
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
        } else {
            if (!selectedStage) {
                toast.error('Please select a stage');
                return;
            }
        }
        setShowMatchSelector(true);
        if (fetchMode === 'matchday') {
            refetchMatchday();
        } else {
            refetchStage();
        }
    };

    const handleSelectMatch = (match) => {
        const homeName = match.home_team.short_name || match.home_team.name;
        const awayName = match.away_team.short_name || match.away_team.name;
        setTitle(`${homeName} vs ${awayName}`);
        
        // Build description with stage info if available
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
                .toISOString().slice(0, 16);
            setStartsAt(localIso);
        }
        setMatchId(match.id.toString());
        setShowMatchSelector(false);
        toast.success('Match selected! Form has been pre-filled.');
    };

    const handleUseCurrentMatchday = () => {
        if (seasonInfo?.current_matchday) {
            setMatchday(seasonInfo.current_matchday.toString());
        }
    };

    // Get available stages for dropdown
    const availableStages = seasonInfo?.stages || [];
    const hasStages = availableStages.length > 0;
    const hasMatchdays = seasonInfo?.current_matchday !== null && seasonInfo?.current_matchday !== undefined;

    return (
        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-white">New Event / Match</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Tournament *</label>
                    <select
                        value={tournamentId}
                        onChange={(e) => {
                            setTournamentId(e.target.value);
                            setShowMatchSelector(false);
                            setMatchday('');
                            setSelectedStage('');
                        }}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                        required
                    >
                        <option value="">Select tournament...</option>
                        {tournaments?.map((t) => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm text-dark-400 mb-1">Start Time</label>
                    <input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* API Source Toggle */}
            <div className="flex items-center gap-3 pt-2">
                <button
                    type="button"
                    onClick={() => setUseApiSource(!useApiSource)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all ${
                        useApiSource
                            ? 'bg-accent-600/20 text-accent-400 border border-accent-500/30'
                            : 'bg-dark-700/60 text-dark-400 border border-dark-500/30'
                    }`}
                >
                    <Search className="w-4 h-4" />
                    {useApiSource ? 'Using API Data' : 'Fetch from football-data.org'}
                </button>
                {matchId && (
                    <span className="text-xs text-accent-400 bg-accent-600/10 px-2 py-1 rounded">
                        Match ID: {matchId}
                    </span>
                )}
            </div>

            {/* Match Fetcher Section */}
            {useApiSource && (
                <div className="bg-dark-800/50 rounded-xl p-4 space-y-4 border border-dark-600/30">
                    {/* Mode Toggle - show when tournament is selected */}
                    {tournamentId && (
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => { setFetchMode('matchday'); setShowMatchSelector(false); }}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                    fetchMode === 'matchday'
                                        ? 'bg-accent-600 text-white'
                                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                                }`}
                                disabled={!hasMatchdays}
                            >
                                By Matchday
                            </button>
                            <button
                                type="button"
                                onClick={() => { setFetchMode('stage'); setShowMatchSelector(false); }}
                                className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                                    fetchMode === 'stage'
                                        ? 'bg-accent-600 text-white'
                                        : 'bg-dark-700 text-dark-400 hover:bg-dark-600'
                                }`}
                                disabled={!hasStages}
                                title={hasStages ? 'Filter by knockout stage' : 'No stages available for this tournament'}
                            >
                                By Stage
                            </button>
                        </div>
                    )}

                    {/* Matchday Input */}
                    {fetchMode === 'matchday' && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-sm text-dark-400 mb-1">Matchday</label>
                                <div className="flex gap-2">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={matchday}
                                        onChange={(e) => setMatchday(e.target.value)}
                                        placeholder="e.g. 27"
                                        className="flex-1 px-4 py-2 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                                    />
                                    {hasMatchdays && (
                                        <button
                                            type="button"
                                            onClick={handleUseCurrentMatchday}
                                            className="px-3 py-2 rounded-xl bg-dark-600/50 text-dark-300 text-sm hover:bg-dark-600 transition-colors"
                                            title="Use current matchday"
                                        >
                                            Current ({seasonInfo.current_matchday})
                                        </button>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={handleFetchMatches}
                                    disabled={isLoading || !tournamentId}
                                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Search className="w-4 h-4" />
                                    Fetch Matches
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Stage Selector */}
                    {fetchMode === 'stage' && (
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <label className="block text-sm text-dark-400 mb-1">Stage</label>
                                <select
                                    value={selectedStage}
                                    onChange={(e) => setSelectedStage(e.target.value)}
                                    className="w-full px-4 py-2 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                                >
                                    <option value="">Select stage...</option>
                                    {availableStages.map((stage) => (
                                        <option key={stage} value={stage}>
                                            {STAGE_LABELS[stage] || stage}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    type="button"
                                    onClick={handleFetchMatches}
                                    disabled={isLoading || !tournamentId || !selectedStage}
                                    className="btn-primary flex items-center gap-2 disabled:opacity-50"
                                >
                                    {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                                    <Trophy className="w-4 h-4" />
                                    Fetch Matches
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Match Selector */}
                    {showMatchSelector && matchesData && (
                        <div className="space-y-2 animate-fade-in">
                            <p className="text-sm text-dark-400">
                                Showing {matchesData.matches?.length || 0} matches
                                {fetchMode === 'matchday' && matchesData.matchday && ` for Matchday ${matchesData.matchday}`}
                                {fetchMode === 'stage' && matchesData.stage && ` for ${STAGE_LABELS[matchesData.stage] || matchesData.stage}`}
                            </p>
                            {matchesData.matches?.length === 0 ? (
                                <p className="text-dark-500 text-sm">No matches found.</p>
                            ) : (
                                <div className="grid grid-cols-1 gap-2 max-h-80 overflow-y-auto">
                                    {matchesData.matches.map((match) => (
                                        <MatchCard
                                            key={match.id}
                                            match={match}
                                            onSelect={() => handleSelectMatch(match)}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            <div>
                <label className="block text-sm text-dark-400 mb-1">Title *</label>
                <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Juventus vs Como"
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                    required
                />
            </div>

            <div>
                <label className="block text-sm text-dark-400 mb-1">Description</label>
                <input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="e.g. Match Day 26"
                    className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                />
            </div>

            <div className="flex gap-2">
                <button type="submit" disabled={createEvent.isPending} className="btn-primary flex items-center gap-2">
                    {createEvent.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create Event
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            </div>
        </form>
    );
}

/* ─────── Match Card for Selection ─────── */
function MatchCard({ match, onSelect }) {
    const statusColors = {
        SCHEDULED: 'text-blue-400',
        LIVE: 'text-accent-400',
        IN_PLAY: 'text-accent-400',
        PAUSED: 'text-yellow-400',
        FINISHED: 'text-dark-400',
        POSTPONED: 'text-loss-400',
        SUSPENDED: 'text-loss-400',
        CANCELLED: 'text-loss-400',
    };

    const statusLabels = {
        SCHEDULED: 'Upcoming',
        LIVE: 'Live',
        IN_PLAY: 'Live',
        PAUSED: 'Paused',
        FINISHED: 'Finished',
        POSTPONED: 'Postponed',
        SUSPENDED: 'Suspended',
        CANCELLED: 'Cancelled',
    };

    const stageLabel = match.stage && STAGE_LABELS[match.stage] ? STAGE_LABELS[match.stage] : match.stage;

    return (
        <button
            type="button"
            onClick={onSelect}
            className="w-full text-left p-3 rounded-xl bg-dark-700/40 hover:bg-dark-700/70 border border-dark-600/30 
                       hover:border-accent-500/30 transition-all group"
        >
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Home Team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {match.home_team.crest_url && (
                            <img src={match.home_team.crest_url} alt="" className="w-6 h-6 object-contain" />
                        )}
                        <span className="text-white font-medium truncate">
                            {match.home_team.short_name || match.home_team.name}
                        </span>
                    </div>

                    {/* VS */}
                    <span className="text-dark-500 text-sm">vs</span>

                    {/* Away Team */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        {match.away_team.crest_url && (
                            <img src={match.away_team.crest_url} alt="" className="w-6 h-6 object-contain" />
                        )}
                        <span className="text-white font-medium truncate">
                            {match.away_team.short_name || match.away_team.name}
                        </span>
                    </div>
                </div>

                {/* Status & Stage */}
                <div className="text-right shrink-0">
                    <span className={`text-xs font-medium ${statusColors[match.status] || 'text-dark-400'}`}>
                        {statusLabels[match.status] || match.status}
                    </span>
                    {stageLabel && stageLabel !== 'Regular Season' && stageLabel !== 'League Stage' && (
                        <p className="text-xs text-accent-400">{stageLabel}</p>
                    )}
                    {match.kickoff_at && (
                        <p className="text-xs text-dark-500">
                            {formatDateTime(match.kickoff_at)}
                        </p>
                    )}
                </div>
            </div>
        </button>
    );
}

/* ─────── Event Row ─────── */
function EventRow({ event, onRefetch }) {
    const updateStatus = useUpdateEventStatus();
    const deleteEvent = useDeleteEvent();

    const statusIcons = {
        upcoming: <Clock className="w-4 h-4 text-blue-400" />,
        live: <Tv className="w-4 h-4 text-accent-400" />,
        completed: <CheckCircle className="w-4 h-4 text-dark-400" />,
        cancelled: <XCircle className="w-4 h-4 text-loss-400" />,
    };

    const handleStatusChange = async (newStatus) => {
        try {
            await updateStatus.mutateAsync({ eventId: event.id, status: newStatus });
            toast.success(`Event status → ${newStatus}`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        }
    };

    const handleDelete = async () => {
        if (!window.confirm(`Delete "${event.title}"?\n\nThis will void all open bets (refund stakes) and permanently remove the event, its markets, and all bets.`)) return;
        try {
            const result = await deleteEvent.mutateAsync(event.id);
            toast.success(`Deleted! ${result.bets_voided} bets voided, ${result.coins_refunded} coins refunded.`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete');
        }
    };

    return (
        <div className="glass-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-white">{event.title}</h3>
                    <div className="flex items-center gap-3 mt-1 text-sm">
                        <div className="flex items-center gap-1">
                            {statusIcons[event.status]}
                            <span className={`capitalize ${event.status === 'live' ? 'text-accent-400' :
                                event.status === 'upcoming' ? 'text-blue-400' :
                                    event.status === 'cancelled' ? 'text-loss-400' : 'text-dark-400'
                                }`}>
                                {event.status}
                            </span>
                        </div>
                        {event.description && (
                            <span className="text-dark-500">• {event.description}</span>
                        )}
                        {event.starts_at && (
                            <span className="text-dark-500">
                                • {formatDateTime(event.starts_at)}
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <select
                        value={event.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updateStatus.isPending}
                        className="px-3 py-1.5 rounded-lg bg-dark-700/60 border border-dark-500/40 text-xs text-white focus:outline-none shrink-0"
                    >
                        <option value="upcoming">Upcoming</option>
                        <option value="live">Live</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                    <button
                        onClick={handleDelete}
                        disabled={deleteEvent.isPending}
                        className="p-1.5 rounded-lg text-dark-500 hover:text-loss-400 hover:bg-loss-400/10 transition-all"
                        title="Delete event"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
