import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
    LayoutDashboard,
    Trophy,
    CalendarPlus,
    PlusCircle,
    Target,
    Users,
    ChevronRight,
} from 'lucide-react';

const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/admin/tournaments', icon: Trophy, label: 'Tournaments' },
    { to: '/admin/events', icon: CalendarPlus, label: 'Events' },
    { to: '/admin/markets/create', icon: PlusCircle, label: 'Create Market' },
    { to: '/admin/markets/manage', icon: Target, label: 'Manage Markets' },
    { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function AdminLayout() {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-dark-950">
            <Navbar />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Sidebar — desktop */}
                    <aside className="hidden lg:block w-60 shrink-0">
                        <div className="glass-card p-3 sticky top-24">
                            <h3 className="text-xs font-semibold text-dark-400 uppercase tracking-wider px-3 mb-2">
                                Admin Panel
                            </h3>
                            <nav className="space-y-1">
                                {adminLinks.map((link) => {
                                    const Icon = link.icon;
                                    const isActive =
                                        link.to === '/admin'
                                            ? location.pathname === '/admin'
                                            : location.pathname.startsWith(link.to);

                                    return (
                                        <Link
                                            key={link.to}
                                            to={link.to}
                                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isActive
                                                ? 'bg-accent-600/15 text-accent-400'
                                                : 'text-dark-300 hover:bg-dark-700/50 hover:text-white'
                                                }`}
                                        >
                                            <Icon className="w-4 h-4" />
                                            {link.label}
                                            {isActive && <ChevronRight className="w-4 h-4 ml-auto" />}
                                        </Link>
                                    );
                                })}
                            </nav>
                        </div>
                    </aside>

                    {/* Mobile admin nav */}
                    <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {adminLinks.map((link) => {
                            const Icon = link.icon;
                            const isActive =
                                link.to === '/admin'
                                    ? location.pathname === '/admin'
                                    : location.pathname.startsWith(link.to);

                            return (
                                <Link
                                    key={link.to}
                                    to={link.to}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${isActive
                                        ? 'bg-accent-600/15 text-accent-400'
                                        : 'bg-dark-800/60 text-dark-300 hover:bg-dark-700/50'
                                        }`}
                                >
                                    <Icon className="w-4 h-4" />
                                    {link.label}
                                </Link>
                            );
                        })}
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}
