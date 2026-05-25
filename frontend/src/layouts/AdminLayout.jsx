import { Outlet, Link, useLocation } from 'react-router-dom';
import Navbar from '../components/Navbar';
import {
    LayoutDashboard,
    Trophy,
    CalendarPlus,
    PlusCircle,
    Target,
    Users,
} from 'lucide-react';
import { cx } from '../components/ui';

const adminLinks = [
    { to: '/admin', icon: LayoutDashboard, label: 'Overview' },
    { to: '/admin/tournaments', icon: Trophy, label: 'Tournaments' },
    { to: '/admin/events', icon: CalendarPlus, label: 'Events' },
    { to: '/admin/markets/create', icon: PlusCircle, label: 'Create Market' },
    { to: '/admin/markets/manage', icon: Target, label: 'Manage Markets' },
    { to: '/admin/users', icon: Users, label: 'Users' },
];

export default function AdminLayout() {
    const location = useLocation();

    return (
        <div className="app-shell">
            <Navbar />
            <div className="app-main">
                <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
                    <aside className="hidden lg:block">
                        <div className="sticky top-24 rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="border-b border-slate-200 px-3 pb-3">
                                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Admin</p>
                                <p className="mt-1 text-sm text-slate-600">Operations console</p>
                            </div>
                            <nav className="mt-3 space-y-1">
                                {adminLinks.map((link) => (
                                    <AdminLink key={link.to} link={link} current={location.pathname} />
                                ))}
                            </nav>
                        </div>
                    </aside>

                    <div className="lg:hidden">
                        <div className="flex gap-2 overflow-x-auto rounded-lg border border-slate-200 bg-white p-2 shadow-sm">
                            {adminLinks.map((link) => (
                                <AdminLink key={link.to} link={link} current={location.pathname} mobile />
                            ))}
                        </div>
                    </div>

                    <div className="min-w-0">
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}

function AdminLink({ link, current, mobile = false }) {
    const Icon = link.icon;
    const isActive = link.to === '/admin' ? current === '/admin' : current.startsWith(link.to);

    return (
        <Link
            to={link.to}
            className={cx(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition',
                mobile && 'shrink-0 whitespace-nowrap',
                isActive
                    ? 'bg-teal-50 text-teal-900'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            )}
        >
            <Icon className="h-4 w-4" />
            {link.label}
        </Link>
    );
}
