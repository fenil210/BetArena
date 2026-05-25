import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2, Trophy } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-stone-50">
                <div className="rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
                    <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-md bg-teal-800 text-white">
                        <Trophy className="h-5 w-5" />
                    </div>
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-teal-800" />
                    <p className="mt-3 text-sm font-medium text-slate-600">Loading BetArena</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (adminOnly && !user.is_admin) {
        return <Navigate to="/" replace />;
    }

    return children;
}
