import { useNotifications, useMarkAllNotificationsRead } from '../hooks/useApi';
import { Bell, Check, ExternalLink, Loader2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { formatDateTime } from '../utils/formatDate';
import { useEffect } from 'react';

const NOTIFICATION_ICONS = {
    new_market: '🎯',
    bet_won: '🎉',
    bet_lost: '😞',
    market_settled: '✅',
    default: '🔔',
};

export default function NotificationsPage() {
    const { data: notifications, isLoading } = useNotifications();
    const markAllRead = useMarkAllNotificationsRead();
    const navigate = useNavigate();

    // Auto-mark all as read when page loads
    useEffect(() => {
        if (notifications?.some(n => !n.is_read)) {
            markAllRead.mutate();
        }
    }, [notifications]);

    const handleNotificationClick = (notification) => {
        if (notification.link) {
            navigate(notification.link);
        }
    };

    const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

    return (
        <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6 text-accent-400" />
                    <h1 className="text-2xl font-bold text-white">Notifications</h1>
                    {unreadCount > 0 && (
                        <span className="badge bg-accent-500 text-white">
                            {unreadCount} new
                        </span>
                    )}
                </div>
            </div>

            {/* Notifications List */}
            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="glass-card p-5 animate-pulse">
                            <div className="h-5 bg-dark-700 rounded w-3/4 mb-2" />
                            <div className="h-4 bg-dark-700 rounded w-1/2" />
                        </div>
                    ))}
                </div>
            ) : notifications?.length === 0 ? (
                <div className="glass-card p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-dark-800 flex items-center justify-center mx-auto mb-4">
                        <Bell className="w-8 h-8 text-dark-500" />
                    </div>
                    <p className="text-dark-400 text-lg">No notifications yet</p>
                    <p className="text-dark-500 text-sm mt-1">
                        We'll notify you when new markets are added or your bets are settled
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {notifications.map((notification) => (
                        <NotificationCard
                            key={notification.id}
                            notification={notification}
                            onClick={() => handleNotificationClick(notification)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function NotificationCard({ notification, onClick }) {
    const icon = NOTIFICATION_ICONS[notification.type] || NOTIFICATION_ICONS.default;
    const hasLink = !!notification.link;

    return (
        <div 
            onClick={hasLink ? onClick : undefined}
            className={`glass-card p-5 transition-all ${
                notification.is_read 
                    ? 'opacity-70' 
                    : 'border-l-4 border-l-accent-500 bg-dark-800/30'
            } ${hasLink ? 'cursor-pointer hover:bg-dark-800/70' : ''}`}
        >
            <div className="flex items-start gap-4">
                {/* Icon */}
                <div className="text-3xl shrink-0">{icon}</div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                        <div>
                            <h3 className="font-semibold text-white">
                                {notification.title}
                            </h3>
                            <p className="text-dark-300 mt-1">
                                {notification.message}
                            </p>
                        </div>
                    </div>
                    
                    {/* Footer with date and link indicator */}
                    <div className="flex items-center gap-3 mt-3">
                        <span className="text-xs text-dark-500">
                            {formatDateTime(notification.created_at)}
                        </span>
                        
                        {hasLink && (
                            <span className="text-xs text-accent-400 flex items-center gap-1">
                                Click to view
                                <ExternalLink className="w-3 h-3" />
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
