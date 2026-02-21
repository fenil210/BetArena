import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import client from '../api/client';

// ─── Tournaments ─────────────────────────
export function useTournaments() {
    return useQuery({
        queryKey: ['tournaments'],
        queryFn: () => client.get('/tournaments').then(r => r.data),
    });
}

export function useTournament(id) {
    return useQuery({
        queryKey: ['tournaments', id],
        queryFn: () => client.get(`/tournaments/${id}`).then(r => r.data),
        enabled: !!id,
    });
}

// ─── Events ─────────────────────────
export function useTournamentEvents(tournamentId) {
    return useQuery({
        queryKey: ['events', tournamentId],
        queryFn: () => client.get(`/tournaments/${tournamentId}/events`).then(r => r.data),
        enabled: !!tournamentId,
    });
}

export function useEvent(id) {
    return useQuery({
        queryKey: ['event', id],
        queryFn: () => client.get(`/events/${id}`).then(r => r.data),
        enabled: !!id,
    });
}

// ─── Markets ─────────────────────────
export function useEventMarkets(eventId) {
    return useQuery({
        queryKey: ['markets', 'event', eventId],
        queryFn: () => client.get(`/events/${eventId}/markets`).then(r => r.data),
        enabled: !!eventId,
    });
}

export function useTournamentMarkets(tournamentId) {
    return useQuery({
        queryKey: ['markets', 'tournament', tournamentId],
        queryFn: () => client.get(`/tournaments/${tournamentId}/markets`).then(r => r.data),
        enabled: !!tournamentId,
    });
}

export function useMarket(id) {
    return useQuery({
        queryKey: ['market', id],
        queryFn: () => client.get(`/markets/${id}`).then(r => r.data),
        enabled: !!id,
    });
}

// ─── Bets ─────────────────────────
export function useMyBets(status) {
    const params = status ? `?status=${status}` : '';
    return useQuery({
        queryKey: ['bets', 'me', status],
        queryFn: () => client.get(`/bets/me${params}`).then(r => r.data),
    });
}

export function usePlaceBet() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (betData) => client.post('/bets', betData).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['bets'] });
            qc.invalidateQueries({ queryKey: ['leaderboard'] });
        },
    });
}

// ─── Leaderboard ─────────────────────────
export function useLeaderboard() {
    return useQuery({
        queryKey: ['leaderboard'],
        queryFn: () => client.get('/leaderboard').then(r => r.data),
        refetchInterval: 30000, // Auto-refresh every 30s
    });
}

export function useTournamentLeaderboard(tournamentId) {
    return useQuery({
        queryKey: ['leaderboard', tournamentId],
        queryFn: () => client.get(`/leaderboard/${tournamentId}`).then(r => r.data),
        enabled: !!tournamentId,
        refetchInterval: 30000,
    });
}

// ─── Feed ─────────────────────────
export function useFeed(limit = 20, offset = 0) {
    return useQuery({
        queryKey: ['feed', limit, offset],
        queryFn: () => client.get(`/feed?limit=${limit}&offset=${offset}`).then(r => r.data),
        refetchInterval: 15000, // Auto-refresh every 15s
    });
}

// ─── Notifications ─────────────────────────
export function useNotifications() {
    return useQuery({
        queryKey: ['notifications'],
        queryFn: () => client.get('/notifications').then(r => r.data),
        refetchInterval: 30000,
    });
}

// ─── Admin: Sync ─────────────────────────
export function useSyncCompetitions() {
    return useMutation({
        mutationFn: () => client.post('/admin/sync/competitions').then(r => r.data),
    });
}

export function useSyncTeams(tournamentId) {
    return useMutation({
        mutationFn: () => client.post(`/admin/tournaments/${tournamentId}/sync-teams`).then(r => r.data),
    });
}

export function useSyncFixtures(tournamentId) {
    return useMutation({
        mutationFn: () => client.post(`/admin/tournaments/${tournamentId}/sync-fixtures`).then(r => r.data),
    });
}

export function useSyncSquad() {
    return useMutation({
        mutationFn: (teamId) => client.post(`/admin/teams/${teamId}/sync-squad`).then(r => r.data),
    });
}

// ─── Admin: Data ─────────────────────────
export function useCompetitions() {
    return useQuery({
        queryKey: ['admin', 'competitions'],
        queryFn: () => client.get('/admin/competitions').then(r => r.data),
    });
}

export function useCompetitionTeams(competitionId) {
    return useQuery({
        queryKey: ['admin', 'teams', competitionId],
        queryFn: () => client.get(`/admin/competitions/${competitionId}/teams`).then(r => r.data),
        enabled: !!competitionId,
    });
}

export function useTeamPlayers(teamId) {
    return useQuery({
        queryKey: ['admin', 'players', teamId],
        queryFn: () => client.get(`/admin/teams/${teamId}/players`).then(r => r.data),
        enabled: !!teamId,
    });
}

// ─── Admin: Users ─────────────────────────
export function useUsers() {
    return useQuery({
        queryKey: ['admin', 'users'],
        queryFn: () => client.get('/admin/users').then(r => r.data),
    });
}

// ─── Admin: Market Actions ─────────────────────────
export function useCreateMarket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => client.post('/admin/markets', data).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['markets'] });
        },
    });
}

export function useCreateEvent() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (data) => client.post('/admin/events', data).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['events'] });
        },
    });
}

export function useUpdateEventStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ eventId, status }) =>
            client.patch(`/admin/events/${eventId}`, { status }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['events'] });
        },
    });
}

export function useUpdateMarketStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ marketId, status }) =>
            client.patch(`/admin/markets/${marketId}/status`, { status }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['markets'] });
        },
    });
}

export function useSettleMarket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ marketId, winning_selection_id }) =>
            client.post(`/admin/markets/${marketId}/settle`, { winning_selection_id }).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['markets'] });
            qc.invalidateQueries({ queryKey: ['leaderboard'] });
            qc.invalidateQueries({ queryKey: ['bets'] });
        },
    });
}

export function useVoidMarket() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (marketId) => client.post(`/admin/markets/${marketId}/void`).then(r => r.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ['markets'] });
            qc.invalidateQueries({ queryKey: ['bets'] });
        },
    });
}
