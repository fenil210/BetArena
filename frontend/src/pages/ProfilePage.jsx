import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { User, Coins, Shield, Calendar, Lock, Loader2 } from 'lucide-react';
import client from '../api/client';
import toast from 'react-hot-toast';
import { formatDate } from '../utils/formatDate';

export default function ProfilePage() {
    const { user, refreshUser } = useAuth();
    const [showPwForm, setShowPwForm] = useState(false);
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [loading, setLoading] = useState(false);

    const handleChangePw = async (e) => {
        e.preventDefault();
        if (!currentPw || !newPw) return;
        setLoading(true);
        try {
            await client.post('/auth/change-password', {
                current_password: currentPw,
                new_password: newPw,
            });
            toast.success('Password changed!');
            setShowPwForm(false);
            setCurrentPw('');
            setNewPw('');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
            <div className="flex items-center gap-3">
                <User className="w-6 h-6 text-accent-400" />
                <h1 className="text-2xl font-bold text-white">Profile</h1>
            </div>

            {/* Profile card */}
            <div className="glass-card p-6">
                <div className="flex items-center gap-4 mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-teal-400 flex items-center justify-center text-2xl font-bold text-white shadow-glow-green">
                        {user.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">{user.username}</h2>
                        <p className="text-dark-400">{user.email}</p>
                        {user.is_admin && (
                            <span className="badge bg-gold-500/20 text-gold-400 mt-1">
                                <Shield className="w-3 h-3 mr-1" /> Admin
                            </span>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-dark-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Coins className="w-4 h-4 text-gold-400" />
                            <span className="text-xs text-dark-400">Balance</span>
                        </div>
                        <p className="text-2xl font-bold text-gold-400">{user.balance?.toLocaleString()}</p>
                    </div>
                    <div className="bg-dark-700/40 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <Calendar className="w-4 h-4 text-accent-400" />
                            <span className="text-xs text-dark-400">Joined</span>
                        </div>
                        <p className="text-lg font-semibold text-white">
                            {formatDate(user.created_at)}
                        </p>
                    </div>
                </div>
            </div>

            {/* Change password */}
            <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Lock className="w-5 h-5 text-dark-400" />
                        Security
                    </h3>
                    {!showPwForm && (
                        <button onClick={() => setShowPwForm(true)} className="btn-secondary text-sm">
                            Change Password
                        </button>
                    )}
                </div>

                {showPwForm && (
                    <form onSubmit={handleChangePw} className="space-y-4 animate-fade-in">
                        <div>
                            <label className="block text-sm text-dark-400 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={currentPw}
                                onChange={(e) => setCurrentPw(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40
                         text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                                autoFocus
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-dark-400 mb-1">New Password</label>
                            <input
                                type="password"
                                value={newPw}
                                onChange={(e) => setNewPw(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40
                         text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                                Update
                            </button>
                            <button type="button" onClick={() => setShowPwForm(false)} className="btn-secondary">
                                Cancel
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
