import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useUnreadNotificationCount } from '../hooks/useApi';
import {
    Trophy,
    Coins,
    Bell,
    LogOut,
    Shield,
    Menu,
    X,
    Moon,
    Sun,
} from 'lucide-react';
import { useState } from 'react';
import { cx, IconButton } from './ui';
import { useTheme } from '../context/ThemeContext';

const navItems = [
    { to: '/', label: 'Dashboard' },
    { to: '/tournaments', label: 'Tournaments' },
    { to: '/bets', label: 'My Bets' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/feed', label: 'Feed' },
];

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const { data: unreadCount } = useUnreadNotificationCount();
    const { isDark, toggleTheme } = useTheme();

    if (!user) return null;

    return (
        <nav className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
                <div className="flex items-center gap-8">
                    <Link to="/" className="flex items-center gap-2" onClick={() => setMenuOpen(false)}>
                        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-teal-800 text-white">
                            <Trophy className="h-5 w-5" />
                        </span>
                        <span className="hidden text-lg font-semibold tracking-tight text-slate-950 sm:block">BetArena</span>
                    </Link>

                    <div className="hidden items-center gap-1 md:flex">
                        {navItems.map((item) => (
                            <NavLink key={item.to} to={item.to} current={location.pathname}>
                                {item.label}
                            </NavLink>
                        ))}
                        {user.is_admin && (
                            <NavLink to="/admin" current={location.pathname} admin>
                                Admin
                            </NavLink>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="hidden items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 sm:flex">
                        <Coins className="h-4 w-4 text-amber-700" />
                        {user.balance?.toLocaleString()}
                    </div>

                    <Link
                        to="/notifications"
                        className="relative flex h-9 w-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-950"
                        onClick={() => setMenuOpen(false)}
                    >
                        <Bell className="h-5 w-5" />
                        {unreadCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-teal-800 px-1 text-[11px] font-semibold text-white">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </Link>

                    <IconButton
                        label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
                        onClick={toggleTheme}
                        className="theme-toggle"
                    >
                        {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </IconButton>

                    <div className="hidden items-center gap-1 md:flex">
                        <Link
                            to="/profile"
                            className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
                        >
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
                                {user.username?.[0]?.toUpperCase()}
                            </span>
                            <span className="max-w-32 truncate">{user.username}</span>
                        </Link>
                        <IconButton label="Logout" onClick={logout}>
                            <LogOut className="h-4 w-4" />
                        </IconButton>
                    </div>

                    <button
                        onClick={() => setMenuOpen((open) => !open)}
                        className="flex h-9 w-9 items-center justify-center rounded-md text-slate-600 transition hover:bg-slate-100 md:hidden"
                        aria-label="Toggle navigation"
                    >
                        {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                    </button>
                </div>
            </div>

            {menuOpen && (
                <div className="border-t border-slate-200 bg-white md:hidden">
                    <div className="space-y-1 px-4 py-3">
                        <div className="mb-2 flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">
                            <span className="flex items-center gap-2">
                                <Coins className="h-4 w-4" />
                                Balance
                            </span>
                            {user.balance?.toLocaleString()}
                        </div>
                        {navItems.map((item) => (
                            <MobileLink key={item.to} to={item.to} current={location.pathname} onClick={() => setMenuOpen(false)}>
                                {item.label}
                            </MobileLink>
                        ))}
                        <MobileLink to="/notifications" current={location.pathname} onClick={() => setMenuOpen(false)}>
                            Notifications
                        </MobileLink>
                        <button
                            onClick={toggleTheme}
                            className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                        >
                            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            {isDark ? 'Light theme' : 'Dark theme'}
                        </button>
                        <MobileLink to="/profile" current={location.pathname} onClick={() => setMenuOpen(false)}>
                            Profile
                        </MobileLink>
                        {user.is_admin && (
                            <MobileLink to="/admin" current={location.pathname} onClick={() => setMenuOpen(false)} admin>
                                Admin Panel
                            </MobileLink>
                        )}
                        <button
                            onClick={logout}
                            className="mt-2 flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold text-red-700 transition hover:bg-red-50"
                        >
                            <LogOut className="h-4 w-4" />
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

function NavLink({ to, current, children, admin = false }) {
    const isActive = to === '/' ? current === '/' : current.startsWith(to);
    return (
        <Link
            to={to}
            className={cx(
                'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition',
                isActive
                    ? 'bg-slate-100 text-slate-950'
                    : admin
                        ? 'text-amber-800 hover:bg-amber-50'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-950'
            )}
        >
            {admin && <Shield className="h-3.5 w-3.5" />}
            {children}
        </Link>
    );
}

function MobileLink({ to, current, children, onClick, admin = false }) {
    const isActive = to === '/' ? current === '/' : current.startsWith(to);
    return (
        <Link
            to={to}
            onClick={onClick}
            className={cx(
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition',
                isActive ? 'bg-slate-100 text-slate-950' : 'text-slate-600 hover:bg-slate-50',
                admin && !isActive && 'text-amber-800'
            )}
        >
            {admin && <Shield className="h-4 w-4" />}
            {children}
        </Link>
    );
}
