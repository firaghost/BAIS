import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { api } from '../lib/api.js';

function normalizeLoginKey(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, ' ');
}

function getDeviceIdentifier(loginKey) {
    try {
        const normalized = normalizeLoginKey(loginKey) || 'anonymous';
        const storageKey = `bais_device_identifier:${normalized}`;
        const existing = localStorage.getItem(storageKey);
        if (existing) {
            return existing;
        }

        const value = `web-${crypto.randomUUID()}`;
        localStorage.setItem(storageKey, value);
        return value;
    } catch {
        return `web-${Math.random().toString(16).slice(2)}`;
    }
}

export function LoginPage() {
    const navigate = useNavigate();
    const location = useLocation();

    const from = useMemo(() => location.state?.from ?? '/dashboard', [location.state]);

    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    async function onSubmit(e) {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const deviceIdentifier = getDeviceIdentifier(login);

            const res = await api.post('/api/auth/login', {
                login,
                password,
                device_identifier: deviceIdentifier,
                device_name: 'web',
            });

            const token = res?.data?.token;

            if (!token) {
                setError('Login failed: token not returned.');
                return;
            }

            try {
                localStorage.setItem('bais_token', token);
            } catch {
                // ignore
            }

            try {
                const me = await api.get('/api/auth/me');
                const roles = Array.isArray(me?.data?.roles) ? me.data.roles : [];
                if (roles.includes('super-admin')) {
                    navigate('/super-admin/dashboard', { replace: true });
                    return;
                }
            } catch {
                // ignore
            }

            navigate(from, { replace: true });
        } catch (err) {
            const message = err?.response?.data?.message;
            setError(message || 'Login failed.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-50">
            <div className="mx-auto flex min-h-screen max-w-md items-center px-4">
                <div className="w-full rounded-2xl border border-slate-800 bg-slate-900/50 p-6 shadow">
                    <div className="mb-6">
                        <div className="text-lg font-semibold">BAIS Admin</div>
                        <div className="text-sm text-slate-400">Sign in to continue</div>
                    </div>

                    {error ? (
                        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
                            {error}
                        </div>
                    ) : null}

                    <form onSubmit={onSubmit} className="space-y-4">
                        <div>
                            <label className="mb-1 block text-xs text-slate-300">Email or Employee Code</label>
                            <input
                                value={login}
                                onChange={(e) => setLogin(e.target.value)}
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-500"
                                placeholder="test@example.com or SDB-001-2025"
                                autoComplete="username"
                                required
                            />
                        </div>

                        <div>
                            <label className="mb-1 block text-xs text-slate-300">Password</label>
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type="password"
                                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm outline-none focus:border-slate-500"
                                autoComplete="current-password"
                                required
                            />
                        </div>

                        <button
                            disabled={loading}
                            className="w-full rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-950 disabled:opacity-60"
                            type="submit"
                        >
                            {loading ? 'Signing in...' : 'Sign In'}
                        </button>

                        <div className="text-xs text-slate-400">
                            This login uses `POST /api/auth/login` and stores the returned token locally.
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
