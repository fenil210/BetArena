import { useTournaments } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import { Trophy, ArrowRight, Calendar } from 'lucide-react';
import { formatDate } from '../utils/formatDate';
import { Badge, EmptyState, LoadingRows, PageHeader, Panel } from '../components/ui';

export default function TournamentsPage() {
    const { data: tournaments, isLoading } = useTournaments();

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Trophy className="h-6 w-6" />}
                title="Tournaments"
                description="Browse active competitions and jump into available tournament or match markets."
            />

            {isLoading ? (
                <LoadingRows count={3} />
            ) : tournaments?.length === 0 ? (
                <EmptyState
                    icon={<Trophy className="h-6 w-6" />}
                    title="No tournaments yet"
                    description="Your admin will set up tournaments soon."
                />
            ) : (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {tournaments.map((tournament) => (
                        <Panel key={tournament.id} as={Link} to={`/tournaments/${tournament.id}`} className="block p-5 transition hover:border-teal-300 hover:bg-teal-50/25">
                            <div className="flex items-start justify-between gap-4">
                                <div className="min-w-0">
                                    <h3 className="truncate text-lg font-semibold tracking-tight text-slate-950">{tournament.name}</h3>
                                    <div className="mt-4 flex flex-wrap items-center gap-2">
                                        <Badge status={tournament.status} />
                                        <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
                                            <Calendar className="h-3.5 w-3.5" />
                                            {formatDate(tournament.created_at)}
                                        </span>
                                    </div>
                                </div>
                                <ArrowRight className="h-5 w-5 shrink-0 text-slate-400" />
                            </div>
                            <p className="mt-4 text-sm text-slate-500">Competition ID {tournament.competition_id}</p>
                        </Panel>
                    ))}
                </div>
            )}
        </div>
    );
}
