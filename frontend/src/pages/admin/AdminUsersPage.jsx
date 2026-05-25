import { useState } from 'react';
import { useUsers } from '../../hooks/useApi';
import client from '../../api/client';
import { Users, Coins, Shield, UserCheck, UserX, UserPlus, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import { Badge, Button, FormField, IconButton, LoadingRows, PageHeader, Panel, TextInput, cx } from '../../components/ui';

export default function AdminUsersPage() {
    const { data: users, isLoading, refetch } = useUsers();
    const [showCreate, setShowCreate] = useState(false);

    return (
        <div className="page-stack">
            <PageHeader
                icon={<Users className="h-6 w-6" />}
                title="User management"
                description="Create users, adjust coin balances, and activate or deactivate accounts."
                actions={(
                    <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
                        <UserPlus className="h-4 w-4" />
                        Create user
                    </Button>
                )}
            />

            {showCreate && (
                <CreateUserForm
                    onCreated={() => { setShowCreate(false); refetch(); }}
                    onCancel={() => setShowCreate(false)}
                />
            )}

            {isLoading ? (
                <LoadingRows count={5} />
            ) : (
                <Panel className="divide-y divide-slate-200 overflow-hidden">
                    {users?.map((user) => (
                        <UserRow key={user.id} userItem={user} onRefetch={refetch} />
                    ))}
                </Panel>
            )}
        </div>
    );
}

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
            toast.success(`User ${username} created`);
            onCreated();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Panel as="form" onSubmit={handleSubmit} className="space-y-4 p-5">
            <h3 className="text-base font-semibold text-slate-950">New user</h3>
            <div className="grid gap-4 lg:grid-cols-3">
                <FormField label="Username" required>
                    <TextInput value={username} onChange={(e) => setUsername(e.target.value)} placeholder="john_doe" required />
                </FormField>
                <FormField label="Email" required>
                    <TextInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="john@example.com" required />
                </FormField>
                <FormField label="Password" required>
                    <div className="relative">
                        <TextInput
                            type={showPw ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Minimum 6 characters"
                            className="pr-10"
                            required
                        />
                        <IconButton type="button" label="Toggle password" onClick={() => setShowPw(!showPw)} className="absolute right-1 top-1/2 -translate-y-1/2">
                            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </IconButton>
                    </div>
                </FormField>
            </div>
            <div className="flex gap-2">
                <Button type="submit" variant="primary" loading={loading}>Create user</Button>
                <Button type="button" onClick={onCancel}>Cancel</Button>
            </div>
        </Panel>
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
                reason: adjustReason,
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
        <div className="p-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="flex min-w-0 items-center gap-3">
                    <div className={cx('flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white', userItem.is_admin ? 'bg-amber-800' : 'bg-slate-900')}>
                        {userItem.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="font-semibold text-slate-950">{userItem.username}</span>
                            {userItem.is_admin && <Badge status="locked"><Shield className="h-3 w-3" /> Admin</Badge>}
                            {!userItem.is_active && <Badge status="voided">Inactive</Badge>}
                        </div>
                        <p className="mt-1 truncate text-sm text-slate-500">{userItem.email}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900">
                        <Coins className="h-4 w-4" />
                        {userItem.balance?.toLocaleString()}
                    </span>
                    <Button onClick={() => setShowAdjust(!showAdjust)} className="py-1.5 text-xs">Adjust</Button>
                    <IconButton
                        label={userItem.is_active ? 'Deactivate' : 'Activate'}
                        onClick={handleToggleActive}
                        disabled={loading || userItem.is_admin}
                        className={userItem.is_active ? 'text-red-700 hover:bg-red-50' : 'text-teal-800 hover:bg-teal-50'}
                    >
                        {userItem.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                    </IconButton>
                </div>
            </div>

            {showAdjust && (
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                        <TextInput
                            type="number"
                            value={adjustAmount}
                            onChange={(e) => setAdjustAmount(e.target.value)}
                            placeholder="Amount, negative to deduct"
                        />
                        <Button onClick={handleAdjust} variant="primary" loading={loading}>Apply</Button>
                    </div>
                    <TextInput
                        type="text"
                        value={adjustReason}
                        onChange={(e) => setAdjustReason(e.target.value)}
                        placeholder="Reason, optional"
                        className="mt-2"
                    />
                </div>
            )}
        </div>
    );
}
