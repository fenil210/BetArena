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
} from 'lucide-react';
import { useState } from 'react';

export default function Navbar() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [menuOpen, setMenuOpen] = useState(false);
    const { data: unreadCount } = useUnreadNotificationCount();

    if (!user) return null;

    return (
        <nav className="sticky top-0 z-50 bg-dark-900/80 backdrop-blur-lg border-b border-dark-700/50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2 group">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-500 to-emerald-400 flex items-center justify-center shadow-glow-green group-hover:scale-105 transition-transform">
                            <Trophy className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold gradient-text hidden sm:block">
                            BetArena
                        </span>
                    </Link>

                    {/* Desktop nav links */}
                    <div className="hidden md:flex items-center gap-1">
                        <NavLink to="/" current={location.pathname}>Dashboard</NavLink>
                        <NavLink to="/tournaments" current={location.pathname}>Tournaments</NavLink>
                        <NavLink to="/bets" current={location.pathname}>My Bets</NavLink>
                        <NavLink to="/leaderboard" current={location.pathname}>Leaderboard</NavLink>
                        <NavLink to="/feed" current={location.pathname}>Feed</NavLink>
                        {user.is_admin && (
                            <NavLink to="/admin" current={location.pathname} admin>
                                Admin
                            </NavLink>
                        )}
                    </div>

                    {/* Right section */}
                    <div className="flex items-center gap-3">
                        {/* Balance */}
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-dark-800/80 border border-dark-600/40">
                            <Coins className="w-4 h-4 text-gold-400" />
                            <span className="text-sm font-semibold text-gold-400">
                                {user.balance?.toLocaleString()}
                            </span>
                        </div>

                        {/* Notifications */}
                        <Link
                            to="/notifications"
                            className="p-2 rounded-xl hover:bg-dark-700/60 transition-colors relative"
                        >
                            <Bell className="w-5 h-5 text-dark-300" />
                            {unreadCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-accent-500 text-white text-xs font-bold flex items-center justify-center">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                        </Link>

                        {/* Profile + Logout (desktop) */}
                        <div className="hidden md:flex items-center gap-2">
                            <Link
                                to="/profile"
                                className="flex items-center gap-2 px-3 py-1.5 rounded-xl hover:bg-dark-700/60 transition-colors"
                            >
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent-500 to-teal-400 flex items-center justify-center text-xs font-bold text-white">
                                    {user.username?.[0]?.toUpperCase()}
                                </div>
                                <span className="text-sm text-dark-200">{user.username}</span>
                            </Link>
                            <button
                                onClick={logout}
                                className="p-2 rounded-xl hover:bg-dark-700/60 transition-colors text-dark-400 hover:text-loss-400"
                                title="Logout"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mobile menu toggle */}
                        <button
                            onClick={() => setMenuOpen(!menuOpen)}
                            className="md:hidden p-2 rounded-xl hover:bg-dark-700/60 transition-colors"
                        >
                            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile dropdown menu */}
            {menuOpen && (
                <div className="md:hidden border-t border-dark-700/50 bg-dark-900/95 backdrop-blur-lg animate-fade-in">
                    <div className="px-4 py-3 space-y-1">
                        <MobileLink to="/" label="Dashboard" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/tournaments" label="Tournaments" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/bets" label="My Bets" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/leaderboard" label="Leaderboard" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/feed" label="Feed" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/notifications" label="Notifications" onClick={() => setMenuOpen(false)} />
                        <MobileLink to="/profile" label="Profile" onClick={() => setMenuOpen(false)} />
                        {user.is_admin && (
                            <MobileLink to="/admin" label="Admin Panel" onClick={() => setMenuOpen(false)} admin />
                        )}
                        <button
                            onClick={logout}
                            className="w-full text-left px-4 py-2.5 rounded-xl text-loss-400 hover:bg-dark-700/60 transition-colors text-sm font-medium"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            )}
        </nav>
    );
}

function NavLink({ to, current, children, admin }) {
    const isActive = current === to || (to !== '/' && current.startsWith(to));
    return (
        <Link
            to={to}
            className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${isActive
                    ? 'bg-accent-600/15 text-accent-400'
                    : admin
                        ? 'text-gold-400 hover:bg-gold-500/10'
                        : 'text-dark-300 hover:bg-dark-700/60 hover:text-white'
                }`}
        >
            {admin && <Shield className="w-3.5 h-3.5 inline mr-1" />}
            {children}
        </Link>
    );
}

function MobileLink({ to, label, onClick, admin }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className={`block px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${admin
                    ? 'text-gold-400 hover:bg-gold-500/10'
                    : 'text-dark-200 hover:bg-dark-700/60'
                }`}
        >
            {admin && <Shield className="w-3.5 h-3.5 inline mr-1" />}
            {label}
        </Link>
    );
}
