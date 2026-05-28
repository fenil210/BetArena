import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTournament, useTournamentEvents, useTournamentMarkets } from '../hooks/useApi';
import MarketCard from '../components/MarketCard';
import { Trophy, Calendar, ArrowRight, Filter, CircleDot, Clock3, MapPin } from 'lucide-react';
import { formatDateInZone, formatDateTimeInZone } from '../utils/formatDate';
import { Badge, EmptyState, LoadingRows, PageHeader, Panel, SelectInput, TextInput } from '../components/ui';

const STATUS_OPTIONS = [
    { value: 'all', label: 'All matches' },
    { value: 'upcoming', label: 'Upcoming' },
    { value: 'live', label: 'Live' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
];

const VIEW_OPTIONS = [
    { value: 'week', label: 'Weekly' },
    { value: 'date', label: 'Daily' },
    { value: 'team', label: 'Team' },
    { value: 'group', label: 'Group' },
    { value: 'slot', label: 'Time slot' },
    { value: 'tbd', label: 'TBD' },
];

const SLOT_OPTIONS = [
    { value: 'all', label: 'All slots' },
    { value: 'night', label: '00:00-05:59' },
    { value: 'morning', label: '06:00-11:59' },
    { value: 'afternoon', label: '12:00-17:59' },
    { value: 'evening', label: '18:00-23:59' },
];

function stageLabel(stage) {
    return String(stage || 'Fixtures').replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function groupLabel(group) {
    return String(group || 'Ungrouped').replaceAll('_', ' ');
}

function getEventTime(event) {
    return event.starts_at ? new Date(event.starts_at).getTime() : Number.MAX_SAFE_INTEGER;
}

function getWeekNumber(event, firstTime) {
    const eventTime = event.starts_at ? new Date(event.starts_at).getTime() : null;
    if (!eventTime || !firstTime) return null;
    return Math.floor((eventTime - firstTime) / (7 * 24 * 60 * 60 * 1000)) + 1;
}

function slotKey(event, timeZone) {
    if (!event.starts_at) return 'all';
    const hour = Number(new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hour12: false, timeZone }).format(new Date(event.starts_at)));
    if (hour < 6) return 'night';
    if (hour < 12) return 'morning';
    if (hour < 18) return 'afternoon';
    return 'evening';
}

function hasTbdTeam(event) {
    const home = event.match?.home_team;
    const away = event.match?.away_team;
    return !home?.name || !away?.name || event.title.toLowerCase().includes('tbd');
}

function getTeams(events) {
    const teams = new Map();
    events.forEach((event) => {
        [event.match?.home_team, event.match?.away_team].forEach((team) => {
            if (team?.name) teams.set(team.name, team.short_name || team.name);
        });
    });
    return Array.from(teams.entries()).sort((a, b) => a[1].localeCompare(b[1]));
}

function groupEvents(events, mode, firstTime, timeZone) {
    const groups = new Map();
    events.forEach((event) => {
        let label = 'Fixtures';
        if (mode === 'week') {
            const week = getWeekNumber(event, firstTime);
            label = `${week ? `Week ${week}` : 'Schedule TBA'} - ${stageLabel(event.match?.stage)}`;
        } else if (mode === 'date') {
            label = event.starts_at ? formatDateInZone(event.starts_at, timeZone) : 'Date TBA';
        } else if (mode === 'team') {
            label = 'Team fixtures';
        } else if (mode === 'group') {
            label = groupLabel(event.match?.group_name);
        } else if (mode === 'slot') {
            const slot = SLOT_OPTIONS.find((item) => item.value === slotKey(event, timeZone));
            label = `${slot?.label || 'Time slot'} ${timeZone === 'Asia/Kolkata' ? 'IST' : 'UTC'}`;
        } else if (mode === 'tbd') {
            label = 'Knockout and TBD fixtures';
        }
        if (!groups.has(label)) groups.set(label, []);
        groups.get(label).push(event);
    });

    return Array.from(groups.entries()).map(([label, items]) => ({ label, items }));
}

export default function TournamentDetailPage() {
    const { id } = useParams();
    const [statusFilter, setStatusFilter] = useState('all');
    const [viewMode, setViewMode] = useState('week');
    const [selectedWeek, setSelectedWeek] = useState('all');
    const [selectedDate, setSelectedDate] = useState('');
    const [selectedTeam, setSelectedTeam] = useState('all');
    const [selectedGroup, setSelectedGroup] = useState('all');
    const [selectedSlot, setSelectedSlot] = useState('all');
    const [timeMode, setTimeMode] = useState(() => localStorage.getItem('betarena_time_mode') || 'UTC');

    const timeZone = timeMode === 'IST' ? 'Asia/Kolkata' : 'UTC';
    const timeSuffix = timeMode;

    useEffect(() => {
        localStorage.setItem('betarena_time_mode', timeMode);
    }, [timeMode]);

    const { data: tournament, isLoading: loadingT } = useTournament(id);
    const { data: events, isLoading: loadingE } = useTournamentEvents(id, statusFilter);
    const { data: markets } = useTournamentMarkets(id);

    const sortedEvents = useMemo(() => [...(events || [])].sort((a, b) => getEventTime(a) - getEventTime(b)), [events]);
    const firstTime = sortedEvents.find((event) => event.starts_at)?.starts_at
        ? new Date(sortedEvents.find((event) => event.starts_at).starts_at).getTime()
        : null;

    const teams = getTeams(sortedEvents);
    const groups = Array.from(new Set(sortedEvents.map((event) => event.match?.group_name).filter(Boolean))).sort();
    const weeks = Array.from(new Set(sortedEvents.map((event) => getWeekNumber(event, firstTime)).filter(Boolean))).sort((a, b) => a - b);

    const filteredEvents = sortedEvents.filter((event) => {
        if (viewMode === 'week' && selectedWeek !== 'all' && String(getWeekNumber(event, firstTime)) !== selectedWeek) return false;
        if (viewMode === 'date' && selectedDate && formatDateInZone(event.starts_at, timeZone) !== selectedDate) return false;
        if (viewMode === 'team' && selectedTeam !== 'all') {
            const home = event.match?.home_team?.name;
            const away = event.match?.away_team?.name;
            if (home !== selectedTeam && away !== selectedTeam) return false;
        }
        if (viewMode === 'group' && selectedGroup !== 'all' && event.match?.group_name !== selectedGroup) return false;
        if (viewMode === 'slot' && selectedSlot !== 'all' && slotKey(event, timeZone) !== selectedSlot) return false;
        if (viewMode === 'tbd' && !hasTbdTeam(event)) return false;
        return true;
    });

    const eventGroups = groupEvents(filteredEvents, viewMode, firstTime, timeZone);

    if (loadingT) return <LoadingRows count={2} />;
    if (!tournament) return <EmptyState title="Tournament not found" description="The requested tournament could not be loaded." />;

    return (
        <div className="page-stack">
            <Panel className="p-5 sm:p-6">
                <PageHeader
                    icon={<Trophy className="h-6 w-6" />}
                    eyebrow="World Cup schedule"
                    title={tournament.name}
                    description="Browse fixtures by week, day, team, group, kickoff slot, or TBD knockout placeholders."
                    actions={<Badge status={tournament.status} />}
                />
            </Panel>

            {markets && markets.length > 0 && (
                <section className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-teal-800" />
                        <h2 className="text-base font-semibold text-slate-950">Tournament markets</h2>
                    </div>
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                        {markets.map((market) => <MarketCard key={market.id} market={market} />)}
                    </div>
                </section>
            )}

            <section className="space-y-3">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-teal-800" />
                        <h2 className="text-base font-semibold text-slate-950">Fixtures</h2>
                    </div>
                    <button
                        type="button"
                        onClick={() => setTimeMode(timeMode === 'UTC' ? 'IST' : 'UTC')}
                        className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                        Showing {timeMode}. Switch to {timeMode === 'UTC' ? 'IST' : 'UTC'}
                    </button>
                </div>

                <Panel className="p-4">
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                        <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">View</span>
                            <SelectInput value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
                                {VIEW_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </SelectInput>
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Match state</span>
                            <SelectInput value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                                {STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </SelectInput>
                        </label>
                        {viewMode === 'week' && (
                            <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Week</span>
                                <SelectInput value={selectedWeek} onChange={(e) => setSelectedWeek(e.target.value)}>
                                    <option value="all">All weeks</option>
                                    {weeks.map((week) => <option key={week} value={week}>Week {week}</option>)}
                                </SelectInput>
                            </label>
                        )}
                        {viewMode === 'date' && (
                            <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Date</span>
                                <TextInput type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
                            </label>
                        )}
                        {viewMode === 'team' && (
                            <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Team</span>
                                <SelectInput value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
                                    <option value="all">All teams</option>
                                    {teams.map(([name, label]) => <option key={name} value={name}>{label}</option>)}
                                </SelectInput>
                            </label>
                        )}
                        {viewMode === 'group' && (
                            <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Group</span>
                                <SelectInput value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
                                    <option value="all">All groups</option>
                                    {groups.map((group) => <option key={group} value={group}>{groupLabel(group)}</option>)}
                                </SelectInput>
                            </label>
                        )}
                        {viewMode === 'slot' && (
                            <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Kickoff slot</span>
                                <SelectInput value={selectedSlot} onChange={(e) => setSelectedSlot(e.target.value)}>
                                    {SLOT_OPTIONS.map((slot) => <option key={slot.value} value={slot.value}>{slot.label}</option>)}
                                </SelectInput>
                            </label>
                        )}
                    </div>
                </Panel>

                {loadingE ? (
                    <LoadingRows count={3} />
                ) : filteredEvents.length === 0 ? (
                    <EmptyState icon={<Calendar className="h-6 w-6" />} title="No fixtures match this view" description="Try another week, team, group, date, or kickoff slot." />
                ) : (
                    <div className="space-y-4">
                        {eventGroups.map((group) => (
                            <Panel key={group.label} className="overflow-hidden">
                                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                                    <h3 className="text-sm font-semibold text-slate-950">{group.label}</h3>
                                    <span className="text-xs font-semibold text-slate-500">{group.items.length} fixtures</span>
                                </div>
                                <div className="divide-y divide-slate-200">
                                    {group.items.map((event) => (
                                        <FixtureRow key={event.id} event={event} timeZone={timeZone} timeSuffix={timeSuffix} />
                                    ))}
                                </div>
                            </Panel>
                        ))}
                    </div>
                )}
            </section>
        </div>
    );
}

function FixtureRow({ event, timeZone, timeSuffix }) {
    const home = event.match?.home_team;
    const away = event.match?.away_team;
    const homeName = home?.short_name || home?.name || 'TBD';
    const awayName = away?.short_name || away?.name || 'TBD';

    return (
        <Link to={`/events/${event.id}`} className="match-row group flex items-center justify-between gap-4 p-4 transition hover:bg-slate-50">
            <div className="min-w-0">
                <h3 className="flex items-center gap-2 truncate text-base font-semibold text-slate-950">
                    {event.status === 'live' && <CircleDot className="h-4 w-4 shrink-0 text-teal-800" />}
                    {home?.crest_url && <img src={home.crest_url} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                    <span className="truncate">{homeName} vs {awayName}</span>
                    {away?.crest_url && <img src={away.crest_url} alt="" className="h-5 w-5 shrink-0 object-contain" />}
                </h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge status={event.status} />
                    {event.match?.group_name && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{groupLabel(event.match.group_name)}</span>}
                    {event.match?.stage && <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{stageLabel(event.match.stage)}</span>}
                    {event.starts_at && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                            <Clock3 className="h-3.5 w-3.5" />
                            {formatDateTimeInZone(event.starts_at, timeZone, timeSuffix)}
                        </span>
                    )}
                </div>
                <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <MapPin className="h-3.5 w-3.5" />
                    {event.match?.venue || event.description || 'Venue TBA'}
                </p>
            </div>
            <ArrowRight className="h-5 w-5 shrink-0 text-slate-400 transition group-hover:text-teal-800" />
        </Link>
    );
}
