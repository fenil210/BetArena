import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Trophy, Eye, EyeOff, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            const msg = err.response?.data?.detail || 'Login failed. Check your credentials.';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-950 flex items-center justify-center px-4">
            {/* Background glow effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-accent-500/5 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-500 to-emerald-400 shadow-glow-green mb-4">
                        <Trophy className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-3xl font-bold gradient-text">BetArena</h1>
                    <p className="text-dark-400 mt-2">
                        Private football betting platform
                    </p>
                </div>

                {/* Login card */}
                <div className="glass-card p-8">
                    <h2 className="text-xl font-semibold text-white mb-6">Sign in to your account</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-dark-300 mb-2">
                                Email address
                            </label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                autoComplete="email"
                                className="w-full px-4 py-3 rounded-xl bg-dark-700/60 border border-dark-500/40
                         text-white placeholder-dark-400 focus:outline-none focus:border-accent-500/50
                         focus:ring-1 focus:ring-accent-500/20 transition-colors"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-dark-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    autoComplete="current-password"
                                    className="w-full px-4 py-3 pr-12 rounded-xl bg-dark-700/60 border border-dark-500/40
                           text-white placeholder-dark-400 focus:outline-none focus:border-accent-500/50
                           focus:ring-1 focus:ring-accent-500/20 transition-colors"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-white transition-colors"
                                >
                                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Signing in...
                                </>
                            ) : (
                                'Sign in'
                            )}
                        </button>
                    </form>

                    <p className="text-center text-dark-400 text-sm mt-6">
                        Invite-only platform. Contact your admin for access.
                    </p>
                </div>
            </div>
        </div>
    );
}
