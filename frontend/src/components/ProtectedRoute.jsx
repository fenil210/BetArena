import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Loader2 } from 'lucide-react';

export default function ProtectedRoute({ children, adminOnly = false }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-dark-950">
                <Loader2 className="w-8 h-8 text-accent-500 animate-spin" />
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
