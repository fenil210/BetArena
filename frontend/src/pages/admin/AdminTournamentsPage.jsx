import { useState } from 'react';
import {
    useTournaments,
    useCompetitions,
    useSyncCompetitions,
    useSyncTeams,
    useSyncFixtures,
} from '../../hooks/useApi';
import client from '../../api/client';
import { Trophy, RefreshCw, Plus, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminTournamentsPage() {
    const { data: tournaments, isLoading, refetch } = useTournaments();
    const { data: competitions } = useCompetitions();
    const syncComps = useSyncCompetitions();
    const [showCreate, setShowCreate] = useState(false);
    const [name, setName] = useState('');
    const [compId, setCompId] = useState('');
    const [creating, setCreating] = useState(false);

    const handleCreate = async (e) => {
        e.preventDefault();
        if (!name || !compId) return;
        setCreating(true);
        try {
            await client.post('/admin/tournaments', {
                name,
                competition_id: parseInt(compId),
            });
            toast.success('Tournament created!');
            setShowCreate(false);
            setName('');
            setCompId('');
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setCreating(false);
        }
    };

    const handleSyncComps = async () => {
        try {
            const data = await syncComps.mutateAsync();
            toast.success(`Synced! Created: ${data.created}, Updated: ${data.updated}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Sync failed');
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Trophy className="w-6 h-6 text-accent-400" />
                    Tournaments
                </h1>
                <div className="flex gap-2">
                    <button onClick={handleSyncComps} disabled={syncComps.isPending} className="btn-secondary flex items-center gap-2 text-sm">
                        {syncComps.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        Sync Competitions
                    </button>
                    <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" />
                        Create
                    </button>
                </div>
            </div>

            {/* Create form */}
            {showCreate && (
                <form onSubmit={handleCreate} className="glass-card p-5 space-y-4 animate-fade-in">
                    <h3 className="font-semibold text-white">New Tournament</h3>
                    <div>
                        <label className="block text-sm text-dark-400 mb-1">Tournament Name</label>
                        <input
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="e.g. FIFA World Cup 2026"
                            className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                        />
                    </div>
                    <div>
                        <label className="block text-sm text-dark-400 mb-1">Competition</label>
                        <select
                            value={compId}
                            onChange={(e) => setCompId(e.target.value)}
                            className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50"
                        >
                            <option value="">Select competition...</option>
                            {competitions?.map((c) => (
                                <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={creating} className="btn-primary flex items-center gap-2">
                            {creating && <Loader2 className="w-4 h-4 animate-spin" />}
                            Create Tournament
                        </button>
                        <button type="button" onClick={() => setShowCreate(false)} className="btn-secondary">
                            Cancel
                        </button>
                    </div>
                </form>
            )}

            {/* Tournaments list */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-5 bg-dark-700 rounded w-1/2 mb-2" />
                            <div className="h-4 bg-dark-700 rounded w-1/3" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {tournaments?.map((t) => (
                        <TournamentRow key={t.id} tournament={t} onRefetch={refetch} />
                    ))}
                </div>
            )}
        </div>
    );
}

function TournamentRow({ tournament, onRefetch }) {
    const syncTeams = useSyncTeams(tournament.id);
    const syncFixtures = useSyncFixtures(tournament.id);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const handleSync = async (type) => {
        try {
            const fn = type === 'teams' ? syncTeams : syncFixtures;
            const data = await fn.mutateAsync();
            toast.success(`${type}: Created ${data.created}, Updated ${data.updated}`);
        } catch (err) {
            toast.error(err.response?.data?.detail || `${type} sync failed`);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await client.patch(`/admin/tournaments/${tournament.id}`, { status: newStatus });
            toast.success(`Status → ${newStatus}`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setUpdatingStatus(false);
        }
    };

    return (
        <div className="glass-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-white">{tournament.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                        <span className={`badge badge-${tournament.status === 'active' ? 'open' : tournament.status === 'upcoming' ? 'coming-soon' : 'settled'}`}>
                            {tournament.status}
                        </span>
                        <span className="text-xs text-dark-500">ID: {tournament.competition_id}</span>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button
                        onClick={() => handleSync('teams')}
                        disabled={syncTeams.isPending}
                        className="btn-secondary text-xs flex items-center gap-1"
                    >
                        {syncTeams.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Sync Teams
                    </button>
                    <button
                        onClick={() => handleSync('fixtures')}
                        disabled={syncFixtures.isPending}
                        className="btn-secondary text-xs flex items-center gap-1"
                    >
                        {syncFixtures.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
                        Sync Fixtures
                    </button>
                    <select
                        value={tournament.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={updatingStatus}
                        className="px-3 py-1.5 rounded-lg bg-dark-700/60 border border-dark-500/40 text-xs text-white focus:outline-none"
                    >
                        <option value="upcoming">Upcoming</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>
            </div>
        </div>
    );
}
