import { createContext, useState, useEffect, useCallback } from 'react';
import client from '../api/client';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Load user on mount if token exists
    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) {
            fetchUser();
        } else {
            setLoading(false);
        }
    }, []);

    const fetchUser = async () => {
        try {
            const { data } = await client.get('/auth/me');
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
        } catch {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            setUser(null);
        } finally {
            setLoading(false);
        }
    };

    const login = useCallback(async (email, password) => {
        const { data } = await client.post('/auth/login', { email, password });
        localStorage.setItem('token', data.access_token);
        await fetchUser();
        return data;
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        window.location.href = '/login';
    }, []);

    const refreshUser = useCallback(async () => {
        await fetchUser();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}
