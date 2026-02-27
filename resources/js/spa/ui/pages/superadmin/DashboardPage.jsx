import React, { useEffect, useMemo, useState } from 'react';

import { safeGet } from '../../lib/api.js';
import { useMe } from '../../lib/useMe.js';
import { formatIso, formatModelType } from '../../lib/format.js';
import { Icon } from '../../shared/Icon.jsx';

function KpiCard({ label, value, icon, accent = 'primary' }) {
    const accentClass = accent === 'gold' ? 'bg-[#C9A227]' : 'bg-[#0a1f43]';

    return (
        <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white p-5 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] transition-colors hover:border-[#C9A227]">
            <div className="flex items-start justify-between">
                <div>
                    <div className="text-sm font-medium text-slate-500">{label}</div>
                    <div className="mt-1 text-3xl font-bold text-[#0a1f43]">{value}</div>
                </div>
                <div className="rounded-lg bg-[#0a1f43]/5 p-2 text-[#0a1f43]">
                    <Icon name={icon} className="h-5 w-5" />
                </div>
            </div>
            <div className={['absolute bottom-0 left-0 h-1 w-full', accentClass].join(' ')} />
        </div>
    );
}

export function SuperAdminDashboard() {
    const { roles } = useMe();
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [days, setDays] = useState(7);
    const [latencyMs, setLatencyMs] = useState(null);
    const [page, setPage] = useState(1);

    useEffect(() => {
        let active = true;

        setState({ status: 'loading', data: null, error: null });

        (async () => {
            const startedAt = performance.now();
            const res = await safeGet(`/api/system-admin/dashboard/overview?days=${days}&page=${page}`);
            const elapsed = Math.round(performance.now() - startedAt);

            if (!active) {
                return;
            }

            setLatencyMs(elapsed);

            if (!res.ok) {
                setState({ status: 'error', data: null, error: res.error });
                return;
            }

            setState({ status: 'success', data: res.data, error: null });
        })();

        return () => {
            active = false;
        };
    }, [days, page]);

    const today = useMemo(() => new Date(), []);
    const dateLabel = today.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    const canSeeSystemAdmin = Array.isArray(roles) && roles.includes('super-admin');

    const kpis = state.data?.kpis ?? {};
    const urgent = state.data?.urgent_actions ?? {};
    const chart = state.data?.charts?.geo_validation_failures ?? { labels: [], values: [] };
    const systemStatus = state.data?.system_status?.status ?? '—';
    const recentLogs = Array.isArray(state.data?.recent_logs?.data) ? state.data.recent_logs.data : [];
    const logsMeta = state.data?.recent_logs?.meta ?? null;
    const updatedAt = state.data?.timestamp ?? null;

    const chartMax = Math.max(1, ...(Array.isArray(chart.values) ? chart.values : []));
    const chartBars = (Array.isArray(chart.values) ? chart.values : []).map((v) => {
        const n = Number.isFinite(v) ? v : 0;
        const pct = Math.max(2, Math.round((n / chartMax) * 100));
        return { value: n, pct };
    });

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Dashboard Overview</h2>
                    <p className="mt-1 text-sm text-slate-500">Real-time insights across the enterprise banking network.</p>
                    {!canSeeSystemAdmin ? <p className="mt-2 text-sm text-amber-700">You are not viewing the System Admin dashboard.</p> : null}
                </div>
                <div className="hidden text-right sm:block">
                    <div className="text-sm font-medium text-slate-800">{dateLabel}</div>
                    <div className="text-xs text-slate-500">Last updated: {updatedAt ?? '—'}</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KpiCard label="Total Branches" value={kpis.total_branches ?? '—'} icon="store" />
                <KpiCard label="Total Employees" value={kpis.total_employees ?? '—'} icon="users" accent="gold" />
                <KpiCard label="Active Sessions" value={kpis.active_sessions ?? '—'} icon="activity" />
                <KpiCard label="Compliance Score" value={kpis.compliance_score ?? '—'} icon="badgeCheck" accent="gold" />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)] lg:col-span-2">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="text-lg font-bold text-slate-800">Geo-Validation Failures</div>
                        <select
                            className="rounded border-slate-200 bg-transparent text-sm"
                            value={days}
                            onChange={(e) => setDays(parseInt(e.target.value, 10) || 7)}
                        >
                            <option value={7}>Last 7 Days</option>
                            <option value={30}>Last 30 Days</option>
                        </select>
                    </div>

                    <div className="relative h-64 w-full">
                        <div className="absolute inset-0 flex flex-col justify-between text-xs text-slate-400">
                            <div className="h-0 w-full border-b border-slate-100" />
                            <div className="h-0 w-full border-b border-slate-100" />
                            <div className="h-0 w-full border-b border-slate-100" />
                            <div className="h-0 w-full border-b border-slate-100" />
                            <div className="h-0 w-full border-b border-slate-100" />
                        </div>

                        <div className="absolute inset-0 flex items-end justify-between gap-2 px-2 pt-4">
                            {chartBars.map((b, idx) => (
                                <div key={idx} className="relative h-full w-full">
                                    <div
                                        className="absolute bottom-0 w-full rounded-t-sm bg-blue-50"
                                        style={{ height: `${b.pct}%` }}
                                        title={String(b.value)}
                                    />
                                </div>
                            ))}
                        </div>

                        <svg className="pointer-events-none absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 100">
                            <path
                                d="M0 80 L 50 65 L 100 75 L 150 55 L 200 85 L 250 70 L 300 90 L 350 80 L 400 60 L 450 75 L 500 85 L 550 70 L 600 80 L 650 90 L 700 85 L 750 75 L 800 65 L 850 70 L 900 80 L 950 90"
                                fill="none"
                                stroke="#C9A227"
                                strokeWidth="2"
                            />
                        </svg>
                    </div>

                    <div className="mt-2 flex justify-between px-1 text-xs text-slate-400">
                        {(Array.isArray(chart.labels) ? chart.labels : []).map((d, idx) => (
                            <span key={`${d}-${idx}`}>{d}</span>
                        ))}
                    </div>
                </div>

                <div className="flex flex-col gap-4">
                    <div className="relative overflow-hidden rounded-lg bg-[#0a1f43] p-6 text-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)]">
                        <div className="pointer-events-none absolute -right-4 -top-4 text-white/5">
                            <Icon name="shield" className="h-24 w-24" />
                        </div>
                        <div className="relative text-lg font-bold">System Status</div>
                        <div className="relative mt-4 space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">Health</span>
                                <span className="text-sm font-semibold text-[#C9A227]">{systemStatus}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-300">API Latency</span>
                                <span className="text-sm font-semibold text-green-400">{latencyMs === null ? '—' : `${latencyMs}ms`}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 rounded-lg border border-slate-200 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)]">
                        <div className="mb-4 text-lg font-bold text-slate-800">Urgent Actions</div>
                        <div className="space-y-3">
                            <div className="rounded border border-red-100 bg-red-50 p-3">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined mt-0.5 text-xl text-red-500">warning</span>
                                    <div>
                                        <div className="text-sm font-medium text-slate-800">Suspicious logins (24h)</div>
                                        <div className="text-xs text-slate-500">{urgent.suspicious_logins_24h ?? 0}</div>
                                        <button
                                            type="button"
                                            className="mt-1 text-xs font-medium text-red-600 hover:underline"
                                            onClick={() => {
                                                window.location.assign('/audit');
                                            }}
                                        >
                                            Review Now
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded border border-amber-100 bg-amber-50 p-3">
                                <div className="flex items-start gap-3">
                                    <span className="material-symbols-outlined mt-0.5 text-xl text-amber-500">update</span>
                                    <div>
                                        <div className="text-sm font-medium text-slate-800">Device sync pending</div>
                                        <div className="text-xs text-slate-500">{urgent.device_sync_pending ?? 0}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)]">
                <div className="flex items-center justify-between border-b border-slate-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="text-lg font-bold text-slate-800">Recent System Logs</div>
                        <span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Immutable</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="flex items-center gap-1 rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                            onClick={() => {
                                window.location.assign('/audit');
                            }}
                        >
                            <Icon name="filter" className="h-4 w-4" />
                            Filter
                        </button>
                        <button
                            type="button"
                            className="flex items-center gap-1 rounded border border-slate-200 px-3 py-1.5 text-sm text-slate-500 transition-colors hover:bg-slate-50"
                            onClick={() => {
                                const payload = {
                                    exported_at: new Date().toISOString(),
                                    recent_logs: recentLogs,
                                };
                                const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = 'system-admin-recent-logs.json';
                                document.body.appendChild(a);
                                a.click();
                                a.remove();
                                URL.revokeObjectURL(url);
                            }}
                        >
                            <Icon name="download" className="h-4 w-4" />
                            Export
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="px-6 py-4">Timestamp</th>
                                <th className="px-6 py-4">Event</th>
                                <th className="px-6 py-4">Actor</th>
                                <th className="px-6 py-4">Action</th>
                                <th className="px-6 py-4 text-right">Model</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {state.status === 'loading' ? (
                                <tr>
                                    <td className="px-6 py-4 text-slate-500" colSpan={5}>
                                        Loading…
                                    </td>
                                </tr>
                            ) : null}

                            {state.status === 'error' ? (
                                <tr>
                                    <td className="px-6 py-4 text-slate-500" colSpan={5}>
                                        Failed to load dashboard overview.
                                    </td>
                                </tr>
                            ) : null}

                            {state.status === 'success' && recentLogs.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-4 text-slate-500" colSpan={5}>
                                        No logs.
                                    </td>
                                </tr>
                            ) : null}

                            {recentLogs.map((row) => (
                                <tr key={row.id} className="cursor-pointer transition-colors hover:bg-slate-50">
                                    <td className="px-6 py-4 font-mono text-slate-600">{formatIso(row.created_at)}</td>
                                    <td className="px-6 py-4 font-mono text-xs text-slate-500">{row.id}</td>
                                    <td className="px-6 py-4 font-medium text-slate-800">{row.actor_name ?? row.user_id ?? '—'}</td>
                                    <td className="px-6 py-4 text-slate-600">{row.action ?? '—'}</td>
                                    <td className="px-6 py-4 text-right text-slate-500">
                                        {formatModelType(row.model_type) + (row.model_id ? `#${row.model_id}` : '')}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 p-4">
                    <span className="text-xs text-slate-500">
                        Page {logsMeta?.page ?? 1} of {logsMeta?.last_page ?? 1}
                    </span>
                    <div className="flex gap-1">
                        <button
                            type="button"
                            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-500 disabled:opacity-50"
                            disabled={!logsMeta?.has_prev}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="rounded border border-slate-300 bg-white px-3 py-1 text-xs text-slate-500 disabled:opacity-50"
                            disabled={!logsMeta?.has_next}
                            onClick={() => setPage((p) => p + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
