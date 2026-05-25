import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Trophy, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { Button, IconButton, TextInput } from '../components/ui';

export default function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email || !password) {
            toast.error('Please enter both email and password');
            return;
        }

        setLoading(true);
        try {
            await login(email, password);
            toast.success('Welcome back');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Login failed. Check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-stone-50 px-4 py-8 text-slate-950">
            <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-6xl items-center">
                <div className="grid w-full gap-10 lg:grid-cols-[1fr_440px] lg:items-center">
                    <section className="hidden lg:block">
                        <div className="max-w-xl">
                            <div className="mb-6 inline-flex items-center gap-2 rounded-md border border-teal-200 bg-teal-50 px-3 py-1.5 text-sm font-semibold text-teal-900">
                                <ShieldCheck className="h-4 w-4" />
                                Private prediction market
                            </div>
                            <h1 className="text-5xl font-semibold tracking-tight text-slate-950">
                                BetArena keeps football predictions focused, fair, and easy to run.
                            </h1>
                            <p className="mt-5 max-w-lg text-base leading-7 text-slate-600">
                                Built for a private group, with virtual coins, controlled markets, admin settlement, and a simple record of every bet.
                            </p>
                        </div>
                    </section>

                    <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
                        <div className="border-b border-slate-200 px-7 py-6">
                            <div className="flex items-center gap-3">
                                <span className="flex h-11 w-11 items-center justify-center rounded-md bg-teal-800 text-white">
                                    <Trophy className="h-6 w-6" />
                                </span>
                                <div>
                                    <p className="text-xl font-semibold tracking-tight text-slate-950">BetArena</p>
                                    <p className="text-sm text-slate-500">Invite-only football betting</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 px-7 py-6">
                            <div>
                                <label htmlFor="email" className="form-label">Email address</label>
                                <TextInput
                                    id="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="you@example.com"
                                    autoComplete="email"
                                />
                            </div>

                            <div>
                                <label htmlFor="password" className="form-label">Password</label>
                                <div className="relative">
                                    <TextInput
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter password"
                                        autoComplete="current-password"
                                        className="pr-11"
                                    />
                                    <IconButton
                                        type="button"
                                        label={showPassword ? 'Hide password' : 'Show password'}
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-1 top-1/2 -translate-y-1/2"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </IconButton>
                                </div>
                            </div>

                            <Button type="submit" variant="primary" loading={loading} className="w-full py-3">
                                Sign in
                            </Button>

                            <p className="text-center text-sm text-slate-500">
                                Access is managed by your BetArena admin.
                            </p>
                        </form>
                    </section>
                </div>
            </div>
        </div>
    );
}
