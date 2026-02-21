import { useState } from 'react';
import { useFeed } from '../hooks/useApi';
import { Zap, Target, Trophy, TrendingUp, ChevronDown } from 'lucide-react';
import { formatDateTime } from '../utils/formatDate';

export default function FeedPage() {
    const [limit, setLimit] = useState(20);
    const { data: feed, isLoading } = useFeed(limit, 0);

    const actionIcons = {
        bet_placed: <Target className="w-4 h-4" />,
        market_settled: <Trophy className="w-4 h-4" />,
        market_opened: <TrendingUp className="w-4 h-4" />,
    };

    const actionColors = {
        bet_placed: 'bg-accent-500/20 text-accent-400',
        market_settled: 'bg-gold-500/20 text-gold-400',
        market_opened: 'bg-blue-500/20 text-blue-400',
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex items-center gap-3">
                <Zap className="w-6 h-6 text-gold-400" />
                <h1 className="text-2xl font-bold text-white">Activity Feed</h1>
            </div>

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass-card p-4 animate-pulse">
                            <div className="h-4 bg-dark-700 rounded w-3/4 mb-2" />
                            <div className="h-3 bg-dark-700 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : feed?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <Zap className="w-12 h-12 text-dark-600 mx-auto mb-4" />
                    <p className="text-dark-400 text-lg">No activity yet</p>
                    <p className="text-dark-500 text-sm mt-1">
                        Activity will show here as bets are placed and markets settled.
                    </p>
                </div>
            ) : (
                <>
                    <div className="space-y-3">
                        {feed.map((item) => (
                            <div key={item.id} className="glass-card px-5 py-4 flex items-start gap-4">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${actionColors[item.action_type] || 'bg-dark-600/50 text-dark-300'
                                    }`}>
                                    {actionIcons[item.action_type] || <Zap className="w-4 h-4" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-dark-200">{item.description}</p>
                                    <p className="text-xs text-dark-500 mt-1">
                                        {formatDateTime(item.created_at)}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Load more */}
                    <div className="text-center">
                        <button
                            onClick={() => setLimit((l) => l + 20)}
                            className="btn-secondary inline-flex items-center gap-2"
                        >
                            <ChevronDown className="w-4 h-4" />
                            Load More
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
