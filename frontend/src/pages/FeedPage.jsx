import { useState } from 'react';
import { useFeed } from '../hooks/useApi';
import { Zap, Target, Trophy, TrendingUp, ChevronDown } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';
import { Button, EmptyState, LoadingRows, PageHeader, Panel } from '../components/ui';

const actionIcons = {
    bet_placed: <Target className="h-4 w-4" />,
    market_settled: <Trophy className="h-4 w-4" />,
    market_opened: <TrendingUp className="h-4 w-4" />,
};

export default function FeedPage() {
    const [limit, setLimit] = useState(20);
    const { data: feed, isLoading } = useFeed(limit, 0);

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Zap className="h-6 w-6" />}
                title="Activity Feed"
                description="A chronological record of market openings, bets, and settlements."
            />

            {isLoading ? (
                <LoadingRows count={5} />
            ) : feed?.length === 0 ? (
                <EmptyState
                    icon={<Zap className="h-6 w-6" />}
                    title="No activity yet"
                    description="Activity will show here as bets are placed and markets settle."
                />
            ) : (
                <>
                    <Panel className="divide-y divide-slate-200 overflow-hidden">
                        {feed.map((item) => (
                            <div key={item.id} className="flex gap-4 p-4">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                    {actionIcons[item.action_type] || <Zap className="h-4 w-4" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <p className="text-sm font-medium leading-6 text-slate-800">{item.description}</p>
                                    <p className="mt-1 text-xs text-slate-500">{formatDateTime(item.created_at)}</p>
                                </div>
                            </div>
                        ))}
                    </Panel>

                    <div className="text-center">
                        <Button onClick={() => setLimit((current) => current + 20)}>
                            <ChevronDown className="h-4 w-4" />
                            Load more
                        </Button>
                    </div>
                </>
            )}
        </div>
    );
}
