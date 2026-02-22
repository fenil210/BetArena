import { useState } from 'react';
import { useUsers } from '../../hooks/useApi';
import client from '../../api/client';
import { Users, Coins, Shield, Loader2, UserCheck, UserX, UserPlus, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AdminUsersPage() {
    const { data: users, isLoading, refetch } = useUsers();
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Users className="w-6 h-6 text-accent-400" />
                    User Management
                </h1>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
                    <UserPlus className="w-4 h-4" />
                    Create User
                </button>
            </div>

            {/* Create user form */}
            {showCreate && (
                <CreateUserForm
                    onCreated={() => { setShowCreate(false); refetch(); }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            {isLoading ? (
                <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="glass-card p-4 animate-pulse">
                            <div className="h-4 bg-dark-700 rounded w-1/3 mb-2" />
                            <div className="h-3 bg-dark-700 rounded w-1/4" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-3">
                    {users?.map((u) => (
                        <UserRow key={u.id} userItem={u} onRefetch={refetch} />
                    ))}
                </div>
            )}
        </div>
    );
}

/* ─────── Create User Form ─────── */
function CreateUserForm({ onCreated, onCancel }) {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !email || !password) {
            toast.error('All fields are required');
            return;
        }
        setLoading(true);
        try {
            await client.post('/auth/users', { username, email, password, is_admin: false });
            toast.success(`User "${username}" created!`);
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="glass-card p-5 space-y-4 animate-fade-in">
            <h3 className="font-semibold text-white">New User</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Username *</label>
                    <input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="e.g. john_doe"
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Email *</label>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. john@example.com"
                        className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm text-dark-400 mb-1">Password *</label>
                    <div className="relative">
                        <input
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Min 6 chars"
                            className="w-full px-4 py-2.5 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white focus:outline-none focus:border-accent-500/50 transition-colors pr-10"
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPw(!showPw)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white"
                        >
                            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                    </div>
                </div>
            </div>
            <div className="flex gap-2">
                <button type="submit" disabled={loading} className="btn-primary flex items-center gap-2">
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Create User
                </button>
                <button type="button" onClick={onCancel} className="btn-secondary">Cancel</button>
            </div>
        </form>
    );
}

function UserRow({ userItem, onRefetch }) {
    const [adjustAmount, setAdjustAmount] = useState('');
    const [adjustReason, setAdjustReason] = useState('');
    const [showAdjust, setShowAdjust] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleAdjust = async () => {
        const amount = parseInt(adjustAmount);
        if (!amount) return;
        setLoading(true);
        try {
            await client.post(`/admin/users/${userItem.id}/adjust-balance`, { 
                amount, 
                reason: adjustReason 
            });
            toast.success(`Balance adjusted by ${amount > 0 ? '+' : ''}${amount}`);
            setShowAdjust(false);
            setAdjustAmount('');
            setAdjustReason('');
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setLoading(false);
        }
    };

    const handleToggleActive = async () => {
        setLoading(true);
        try {
            const action = userItem.is_active ? 'deactivate' : 'activate';
            await client.post(`/admin/users/${userItem.id}/${action}`);
            toast.success(`User ${action}d`);
            onRefetch();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="glass-card p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white ${userItem.is_admin ? 'bg-gradient-to-br from-gold-400 to-amber-600' : 'bg-gradient-to-br from-accent-600 to-teal-500'
                        }`}>
                        {userItem.username[0].toUpperCase()}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{userItem.username}</span>
                            {userItem.is_admin && (
                                <span className="badge bg-gold-500/20 text-gold-400">
                                    <Shield className="w-3 h-3 mr-0.5" /> Admin
                                </span>
                            )}
                            {!userItem.is_active && (
                                <span className="badge bg-loss-500/20 text-loss-400">Inactive</span>
                            )}
                        </div>
                        <p className="text-sm text-dark-400">{userItem.email}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-dark-700/50">
                        <Coins className="w-4 h-4 text-gold-400" />
                        <span className="font-semibold text-gold-400">{userItem.balance?.toLocaleString()}</span>
                    </div>

                    <button
                        onClick={() => setShowAdjust(!showAdjust)}
                        className="btn-secondary text-xs"
                    >
                        Adjust
                    </button>

                    <button
                        onClick={handleToggleActive}
                        disabled={loading || userItem.is_admin}
                        className={`p-2 rounded-lg transition-colors ${userItem.is_active
                            ? 'text-loss-400 hover:bg-loss-500/10'
                            : 'text-accent-400 hover:bg-accent-500/10'
                            } disabled:opacity-30`}
                        title={userItem.is_active ? 'Deactivate' : 'Activate'}
                    >
                        {userItem.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {showAdjust && (
                <div className="mt-3 space-y-2 animate-fade-in">
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            placeholder="Amount (negative to deduct)"
                            className="flex-1 px-4 py-2 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white text-sm focus:outline-none focus:border-accent-500/50"
                        />
                        <button onClick={handleAdjust} disabled={loading} className="btn-primary text-sm flex items-center gap-1">
                            {loading && <Loader2 className="w-3 h-3 animate-spin" />}
                            Apply
                        </button>
                    </div>
                    <input
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Reason (optional)"
                        className="w-full px-4 py-2 rounded-xl bg-dark-700/60 border border-dark-500/40 text-white text-sm focus:outline-none focus:border-accent-500/50"
                    />
                </div>
            )}
        </div>
    );
}
