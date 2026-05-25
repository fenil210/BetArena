import { useNotifications, useMarkAllNotificationsRead } from '../hooks/useApi';
import { Bell, ExternalLink, Target, CheckCircle, XCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/formatDate';
import { useEffect } from 'react';
import { EmptyState, PageHeader, Panel, cx } from '../components/ui';

const NOTIFICATION_ICONS = {
    new_market: <Target className="h-4 w-4" />,
    bet_won: <CheckCircle className="h-4 w-4" />,
    bet_lost: <XCircle className="h-4 w-4" />,
    market_settled: <CheckCircle className="h-4 w-4" />,
};

export default function NotificationsPage() {
    const { data: notifications, isLoading } = useNotifications();
    const markAllRead = useMarkAllNotificationsRead();
    const navigate = useNavigate();

    useEffect(() => {
        if (notifications?.some((notification) => !notification.is_read)) {
            markAllRead.mutate();
        }
    }, [notifications, markAllRead]);

    const unreadCount = notifications?.filter((notification) => !notification.is_read).length || 0;

    return (
        <div className="page-stack mx-auto max-w-3xl">
            <PageHeader
                icon={<Bell className="h-6 w-6" />}
                title="Notifications"
                description="Updates about new markets and bet results."
                actions={unreadCount > 0 && (
                    <span className="badge badge-open">{unreadCount} new</span>
                )}
            />

            {isLoading ? (
                <Panel className="p-5 text-sm text-slate-500">Loading notifications...</Panel>
            ) : notifications?.length === 0 ? (
                <EmptyState
                    icon={<Bell className="h-6 w-6" />}
                    title="No notifications yet"
                    description="New market and settlement alerts will appear here."
                />
            ) : (
                <Panel className="divide-y divide-slate-200 overflow-hidden">
                    {notifications.map((notification) => (
                        <button
                            key={notification.id}
                            onClick={() => notification.link && navigate(notification.link)}
                            className={cx(
                                'flex w-full gap-4 p-4 text-left transition',
                                notification.link && 'hover:bg-slate-50',
                                !notification.is_read && 'bg-teal-50/45'
                            )}
                        >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-slate-100 text-slate-600">
                                {NOTIFICATION_ICONS[notification.type] || <Bell className="h-4 w-4" />}
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="font-semibold text-slate-950">{notification.title}</p>
                                        <p className="mt-1 text-sm leading-5 text-slate-600">{notification.message}</p>
                                    </div>
                                    {!notification.is_read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-teal-800" />}
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-slate-500">
                                    <span>{formatDateTime(notification.created_at)}</span>
                                    {notification.link && (
                                        <span className="inline-flex items-center gap-1 text-teal-800">
                                            View
                                            <ExternalLink className="h-3 w-3" />
                                        </span>
                                    )}
                                </div>
                            </div>
                        </button>
                    ))}
                </Panel>
            )}
        </div>
    );
}
