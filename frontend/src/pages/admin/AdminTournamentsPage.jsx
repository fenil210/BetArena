import { useState } from 'react';
import {
    useTournaments,
    useBootstrapWorldCup,
    useSyncTeams,
    useSyncFixtures,
} from '../../hooks/useApi';
import client from '../../api/client';
import { Trophy, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, LoadingRows, PageHeader, Panel, SelectInput } from '../../components/ui';

export default function AdminTournamentsPage() {
    const { data: tournaments, isLoading, refetch } = useTournaments();
    const bootstrapWorldCup = useBootstrapWorldCup();

    const handleBootstrap = async (reset = false) => {
        try {
            const data = await bootstrapWorldCup.mutateAsync({ reset });
            toast.success(`World Cup ready: ${data.fixtures_stored} fixtures, ${data.markets_created} markets`);
            refetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'World Cup sync failed');
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
                        <Button onClick={() => handleBootstrap(false)} loading={bootstrapWorldCup.isPending}>
                            <RefreshCw className="h-4 w-4" />
                            Sync World Cup
                        </Button>
                        <Button variant="danger" onClick={() => handleBootstrap(true)} loading={bootstrapWorldCup.isPending}>
                            Reset and load
                        </Button>
                    </>
                )}
            />

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
