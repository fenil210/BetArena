import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';

import MainLayout from './layouts/MainLayout';
import AdminLayout from './layouts/AdminLayout';
import ProtectedRoute from './components/ProtectedRoute';

import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TournamentsPage from './pages/TournamentsPage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import EventDetailPage from './pages/EventDetailPage';
import MyBetsPage from './pages/MyBetsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import FeedPage from './pages/FeedPage';
import ProfilePage from './pages/ProfilePage';

import AdminDashboardPage from './pages/admin/AdminDashboardPage';
import AdminTournamentsPage from './pages/admin/AdminTournamentsPage';
import AdminEventsPage from './pages/admin/AdminEventsPage';
import AdminMarketCreatePage from './pages/admin/AdminMarketCreatePage';
import AdminMarketsPage from './pages/admin/AdminMarketsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30_000, // 30s
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected user routes */}
            <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/tournaments" element={<TournamentsPage />} />
              <Route path="/tournaments/:id" element={<TournamentDetailPage />} />
              <Route path="/events/:id" element={<EventDetailPage />} />
              <Route path="/bets" element={<MyBetsPage />} />
              <Route path="/leaderboard" element={<LeaderboardPage />} />
              <Route path="/feed" element={<FeedPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            {/* Admin routes */}
            <Route element={<ProtectedRoute adminOnly><AdminLayout /></ProtectedRoute>}>
              <Route path="/admin" element={<AdminDashboardPage />} />
              <Route path="/admin/tournaments" element={<AdminTournamentsPage />} />
              <Route path="/admin/events" element={<AdminEventsPage />} />
              <Route path="/admin/markets/create" element={<AdminMarketCreatePage />} />
              <Route path="/admin/markets/manage" element={<AdminMarketsPage />} />
              <Route path="/admin/users" element={<AdminUsersPage />} />
            </Route>

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>

        {/* Toast notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#1e2433',
              color: '#e1e5eb',
              border: '1px solid rgba(90, 101, 120, 0.3)',
              borderRadius: '12px',
            },
            success: {
              iconTheme: { primary: '#22c55e', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ef4444', secondary: '#fff' },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}
