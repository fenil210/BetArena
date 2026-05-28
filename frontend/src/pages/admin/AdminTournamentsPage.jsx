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
import { Badge, Button, FormField, LoadingRows, PageHeader, Panel, SelectInput, TextInput } from '../../components/ui';

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
            toast.success('Tournament created');
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
            toast.success(`Synced: ${data.created} created, ${data.updated} updated`);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Sync failed');
        }
    };

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Trophy className="h-6 w-6" />}
                title="Tournaments"
                description="Keep the World Cup schedule, teams, and fixtures synchronized."
                actions={(
                    <>
                        <Button onClick={handleSyncComps} loading={syncComps.isPending}>
                            <RefreshCw className="h-4 w-4" />
                            Sync World Cup
                        </Button>
                        <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
                            <Plus className="h-4 w-4" />
                            Create
                        </Button>
                    </>
                )}
            />

            {showCreate && (
                <Panel as="form" onSubmit={handleCreate} className="space-y-4 p-5">
                    <h3 className="text-base font-semibold text-slate-950">New tournament</h3>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <FormField label="Tournament name">
                            <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="FIFA World Cup 2026" />
                        </FormField>
                        <FormField label="Competition">
                            <SelectInput value={compId} onChange={(e) => setCompId(e.target.value)}>
                                <option value="">Select competition...</option>
                                {competitions?.map((competition) => (
                                    <option key={competition.id} value={competition.id}>{competition.name} ({competition.code})</option>
                                ))}
                            </SelectInput>
                        </FormField>
                    </div>
                    <div className="flex gap-2">
                        <Button type="submit" variant="primary" loading={creating}>Create tournament</Button>
                        <Button type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
                    </div>
                </Panel>
            )}

            {isLoading ? (
                <LoadingRows count={3} />
            ) : (
                <Panel className="divide-y divide-slate-200 overflow-hidden">
                    {tournaments?.map((tournament) => (
                        <TournamentRow key={tournament.id} tournament={tournament} onRefetch={refetch} />
                    ))}
                </Panel>
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
            const action = type === 'teams' ? syncTeams : syncFixtures;
            const data = await action.mutateAsync();
            toast.success(`${type}: ${data.created} created, ${data.updated} updated`);
        } catch (err) {
            toast.error(err.response?.data?.detail || `${type} sync failed`);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setUpdatingStatus(true);
        try {
            await client.patch(`/admin/tournaments/${tournament.id}`, { status: newStatus });
            toast.success(`Status changed to ${newStatus}`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setUpdatingStatus(false);
        }
    };

    return (
        <div className="grid gap-4 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
            <div>
                <h3 className="font-semibold text-slate-950">{tournament.name}</h3>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge status={tournament.status} />
                    <span className="text-xs font-medium text-slate-500">World Cup fixture source</span>
                </div>
            </div>
            <div className="flex flex-wrap gap-2">
                <Button onClick={() => handleSync('teams')} loading={syncTeams.isPending} className="text-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync teams
                </Button>
                <Button onClick={() => handleSync('fixtures')} loading={syncFixtures.isPending} className="text-xs">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Sync fixtures
                </Button>
                <SelectInput
                    value={tournament.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={updatingStatus}
                    className="w-36 py-1.5 text-xs"
                >
                    <option value="upcoming">Upcoming</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                </SelectInput>
                {updatingStatus && <Loader2 className="h-4 w-4 animate-spin text-slate-500" />}
            </div>
        </div>
    );
}
