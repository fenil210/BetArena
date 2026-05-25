import { useState } from 'react';
import { useMyBets } from '../hooks/useApi';
import { Ticket, Coins, CheckCircle, XCircle, Clock, Ban } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { Badge, EmptyState, LoadingRows, PageHeader, Panel, Tabs } from '../components/ui';

const TABS = [
    { key: '', label: 'All' },
    { key: 'open', label: 'Open' },
    { key: 'won', label: 'Won' },
    { key: 'lost', label: 'Lost' },
    { key: 'voided', label: 'Voided' },
];

const statusIcon = {
    open: <Clock className="h-4 w-4 text-blue-700" />,
    won: <CheckCircle className="h-4 w-4 text-teal-800" />,
    lost: <XCircle className="h-4 w-4 text-red-700" />,
    voided: <Ban className="h-4 w-4 text-slate-500" />,
};

export default function MyBetsPage() {
    const [activeTab, setActiveTab] = useState('');
    const { data: bets, isLoading } = useMyBets(activeTab || undefined);

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Ticket className="h-6 w-6" />}
                title="My Bets"
                description="Review your open, settled, lost, and voided predictions."
            />

            <Tabs items={TABS} activeKey={activeTab} onChange={setActiveTab} />

            {isLoading ? (
                <LoadingRows count={3} />
            ) : bets?.length === 0 ? (
                <EmptyState
                    icon={<Ticket className="h-6 w-6" />}
                    title={activeTab ? `No ${activeTab} bets` : 'No bets placed yet'}
                    description="Browse markets and place your first prediction."
                />
            ) : (
                <Panel className="divide-y divide-slate-200 overflow-hidden">
                    {bets.map((bet) => (
                        <div key={bet.id} className="grid gap-4 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
                            <div className="min-w-0">
                                <div className="mb-2 flex items-center gap-2">
                                    {statusIcon[bet.status]}
                                    <Badge status={bet.status} />
                                </div>
                                <p className="truncate text-base font-semibold text-slate-950">
                                    {bet.selection_label || 'Selection'}
                                </p>
                                <p className="mt-1 truncate text-sm text-slate-600">
                                    {bet.market_question || 'Market'}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">{formatDateTime(bet.placed_at)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-right">
                                <div className="flex items-center justify-end gap-1 text-sm font-semibold text-slate-950">
                                    <Coins className="h-4 w-4 text-amber-700" />
                                    {bet.stake}
                                </div>
                                {bet.odds && (
                                    <p className="mt-1 text-xs font-medium text-slate-500">
                                        @ {parseFloat(bet.odds).toFixed(2)} to {bet.potential_payout}
                                    </p>
                                )}
                                {bet.status === 'won' && (
                                    <p className="mt-1 text-sm font-semibold text-teal-800">+{bet.potential_payout}</p>
                                )}
                                {bet.status === 'voided' && (
                                    <p className="mt-1 text-sm font-semibold text-slate-500">Refunded</p>
                                )}
                            </div>
                        </div>
                    ))}
                </Panel>
            )}
        </div>
    );
}
