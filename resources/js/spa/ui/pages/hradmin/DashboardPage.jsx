import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { safeGet, safePost } from '../../lib/api.js';
import { useBranchScope } from '../../lib/useBranchScope.js';
import { Icon } from '../../shared/Icon.jsx';

function pctBadgeClass(value) {
    const v = Number.isFinite(value) ? value : 0;
    if (v > 0) {
        return 'text-emerald-700 bg-emerald-50 border-emerald-100';
    }
    if (v < 0) {
        return 'text-red-700 bg-red-50 border-red-100';
    }
    return 'text-slate-600 bg-slate-100 border-slate-200';
}

function pctIcon(value) {
    const v = Number.isFinite(value) ? value : 0;
    if (v > 0) {
        return 'trendingUp';
    }
    if (v < 0) {
        return 'trendingDown';
    }
    return 'minus';
}

function heatClass(attendancePercent) {
    const v = Number.isFinite(attendancePercent) ? attendancePercent : 0;
    if (v >= 90) {
        return 'bg-emerald-600 text-white';
    }
    if (v >= 75) {
        return 'bg-emerald-500/80';
    }
    if (v >= 55) {
        return 'bg-emerald-500/50';
    }
    if (v >= 35) {
        return 'bg-emerald-500/30';
    }
    if (v >= 15) {
        return 'bg-emerald-500/20';
    }
    if (v > 0) {
        return 'bg-emerald-500/10';
    }
    return 'bg-slate-50 border border-slate-100';
}

function startOfMonth(ym) {
    const [y, m] = String(ym).split('-').map((x) => parseInt(x, 10));
    if (!Number.isFinite(y) || !Number.isFinite(m)) {
        return new Date();
    }
    return new Date(y, m - 1, 1);
}

function shiftMonth(ym, delta) {
    const d = startOfMonth(ym);
    d.setMonth(d.getMonth() + delta);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    return `${y}-${m}`;
}

function formatRange(startDate, endDate) {
    try {
        const start = new Date(`${startDate}T00:00:00`);
        const end = new Date(`${endDate}T00:00:00`);
        const opts = { month: 'short', day: '2-digit' };
        const a = start.toLocaleDateString(undefined, opts);
        const b = end.toLocaleDateString(undefined, opts);
        return startDate === endDate ? a : `${a} - ${b}`;
    } catch {
        return `${startDate} - ${endDate}`;
    }
}

export function HrAdminDashboard() {
    const { branchId } = useBranchScope();
    const [month, setMonth] = useState(() => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${y}-${m}`;
    });
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [busy, setBusy] = useState({});

    const nowLabel = useMemo(() => {
        try {
            const d = new Date();
            return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
        } catch {
            return '';
        }
    }, []);

    const refresh = useCallback(async () => {
        setState((s) => ({ ...s, status: 'loading', error: null }));
        const branchParam = branchId ? `&branch_id=${branchId}` : '';
        const res = await safeGet(`/api/hr-admin/dashboard/overview?month=${encodeURIComponent(month)}${branchParam}`);

        if (!res.ok) {
            setState({ status: 'error', data: null, error: res.error });
            return;
        }

        setState({ status: 'success', data: res.data, error: null });
    }, [branchId, month]);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const kpis = state.data?.kpis ?? null;
    const heatmap = state.data?.heatmap ?? null;
    const pending = state.data?.pending_leave_requests ?? { count: 0, items: [] };
    const attention = Array.isArray(state.data?.late_attention) ? state.data.late_attention : [];

    const calendar = useMemo(() => {
        const days = Array.isArray(heatmap?.days) ? heatmap.days : [];
        const firstWeekdayIso = days.length > 0 ? Number(days[0]?.weekday ?? 1) : 1;
        const prefix = Math.max(0, Math.min(6, firstWeekdayIso - 1));
        const cells = [];

        for (let i = 0; i < prefix; i += 1) {
            cells.push({ kind: 'blank', key: `b-${i}` });
        }

        for (const d of days) {
            cells.push({ kind: 'day', key: d.date, data: d });
        }

        while (cells.length % 7 !== 0) {
            cells.push({ kind: 'blank', key: `t-${cells.length}` });
        }

        return cells;
    }, [heatmap]);

    const onApprove = async (id) => {
        const key = `approve-${id}`;
        setBusy((b) => ({ ...b, [key]: true }));
        const res = await safePost(`/api/leaves/requests/${id}/approve`, {});
        setBusy((b) => ({ ...b, [key]: false }));

        if (!res.ok) {
            setState((s) => ({ ...s, status: 'error', error: res.error }));
            return;
        }

        window.dispatchEvent(new Event('bais:navMetaRefresh'));
        await refresh();
    };

    const onReject = async (id) => {
        const reason = window.prompt('Rejection reason (optional):') ?? '';
        const key = `reject-${id}`;
        setBusy((b) => ({ ...b, [key]: true }));
        const res = await safePost(`/api/leaves/requests/${id}/reject`, { rejection_reason: reason || null });
        setBusy((b) => ({ ...b, [key]: false }));

        if (!res.ok) {
            setState((s) => ({ ...s, status: 'error', error: res.error }));
            return;
        }

        window.dispatchEvent(new Event('bais:navMetaRefresh'));
        await refresh();
    };

    const onSendWarning = async (employeeId) => {
        const key = `warn-${employeeId}`;
        setBusy((b) => ({ ...b, [key]: true }));
        const res = await safePost('/api/hr-admin/warnings', { employee_id: employeeId });
        setBusy((b) => ({ ...b, [key]: false }));

        if (!res.ok) {
            setState((s) => ({ ...s, status: 'error', error: res.error }));
            return;
        }
    };

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
                    <p className="mt-1 flex items-center gap-2 text-slate-500">
                        <Icon name="calendar" className="h-4 w-4 text-slate-500" />
                        <span>
                            Real-time overview for <span className="font-medium text-slate-900">{nowLabel || '—'}</span>
                        </span>
                    </p>
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        onClick={() => window.location.assign('/reports')}
                    >
                        <Icon name="download" className="h-4 w-4" />
                        Export Report
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-900 active:translate-y-0.5"
                        onClick={() => window.location.assign('/corrections')}
                    >
                        <Icon name="add" className="h-4 w-4 text-white" />
                        Log Exception
                    </button>
                </div>
            </div>

            {state.status === 'error' ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">Failed to load dashboard.</div>
            ) : null}

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="group relative flex cursor-default flex-col gap-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
                    <div className="absolute -right-2 -top-2 p-4 opacity-5 transition-opacity duration-500 group-hover:opacity-10">
                        <span className="material-symbols-outlined text-8xl text-emerald-600">check_circle</span>
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Present Today</span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">{kpis?.present_today ?? '—'}</span>
                        <span
                            className={[
                                'flex items-center gap-0.5 rounded-full border px-2 py-1 text-xs font-semibold',
                                pctBadgeClass(kpis?.present_trend_percent),
                            ].join(' ')}
                        >
                            <Icon name={pctIcon(kpis?.present_trend_percent)} className="h-3.5 w-3.5" />
                            {kpis?.present_trend_percent ?? 0}%
                        </span>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${Math.max(0, Math.min(100, Number(kpis?.present_today_percent ?? 0)))}%` }}
                        />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">{kpis?.present_today_percent ?? 0}% of active workforce</div>
                </div>

                <div className="group relative flex cursor-default flex-col gap-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
                    <div className="absolute -right-2 -top-2 p-4 opacity-5 transition-opacity duration-500 group-hover:opacity-10">
                        <span className="material-symbols-outlined text-8xl text-amber-500">schedule</span>
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Late Arrivals</span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">{kpis?.late_arrivals ?? '—'}</span>
                        <span
                            className={[
                                'flex items-center gap-0.5 rounded-full border px-2 py-1 text-xs font-semibold',
                                pctBadgeClass(kpis?.late_trend_percent),
                            ].join(' ')}
                        >
                            <Icon name={pctIcon(kpis?.late_trend_percent)} className="h-3.5 w-3.5" />
                            {kpis?.late_trend_percent ?? 0}%
                        </span>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-amber-500"
                            style={{
                                width: `${Math.max(
                                    0,
                                    Math.min(100, kpis?.active_employees ? (Number(kpis?.late_arrivals ?? 0) / kpis.active_employees) * 100 : 0),
                                )}%`,
                            }}
                        />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">Avg delay varies by department</div>
                </div>

                <div className="group relative flex cursor-default flex-col gap-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
                    <div className="absolute -right-2 -top-2 p-4 opacity-5 transition-opacity duration-500 group-hover:opacity-10">
                        <span className="material-symbols-outlined text-8xl text-red-500">cancel</span>
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">Absent</span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">{kpis?.absent ?? '—'}</span>
                        <span
                            className={[
                                'flex items-center gap-0.5 rounded-full border px-2 py-1 text-xs font-semibold',
                                pctBadgeClass(kpis?.absent_trend_percent),
                            ].join(' ')}
                        >
                            <Icon name={pctIcon(kpis?.absent_trend_percent)} className="h-3.5 w-3.5" />
                            {kpis?.absent_trend_percent ?? 0}%
                        </span>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-red-500"
                            style={{
                                width: `${Math.max(
                                    0,
                                    Math.min(100, kpis?.active_employees ? (Number(kpis?.absent ?? 0) / kpis.active_employees) * 100 : 0),
                                )}%`,
                            }}
                        />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">Excludes approved leave</div>
                </div>

                <div className="group relative flex cursor-default flex-col gap-1 overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)] transition-all duration-300 hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
                    <div className="absolute -right-2 -top-2 p-4 opacity-5 transition-opacity duration-500 group-hover:opacity-10">
                        <span className="material-symbols-outlined text-8xl text-blue-500">flight_takeoff</span>
                    </div>
                    <span className="text-sm font-semibold uppercase tracking-wider text-slate-500">On Leave</span>
                    <div className="mt-2 flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">{kpis?.on_leave ?? '—'}</span>
                        <span className="rounded-full border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Planned</span>
                    </div>
                    <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                            className="h-full rounded-full bg-blue-500"
                            style={{
                                width: `${Math.max(
                                    0,
                                    Math.min(100, kpis?.active_employees ? (Number(kpis?.on_leave ?? 0) / kpis.active_employees) * 100 : 0),
                                )}%`,
                            }}
                        />
                    </div>
                    <div className="mt-2 text-xs text-slate-400">Approved leave only</div>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                <div className="flex flex-col gap-6 xl:col-span-2">
                    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
                        <div className="mb-6 flex items-center justify-between">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                <Icon name="calendar" className="h-5 w-5 text-[#1E3A8A]" />
                                Monthly Attendance Heatmap
                            </h3>
                            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 p-1">
                                <button
                                    type="button"
                                    className="rounded p-1 text-slate-500 transition-all hover:bg-white hover:shadow-sm"
                                    onClick={() => setMonth((m) => shiftMonth(m, -1))}
                                    aria-label="Previous month"
                                >
                                    <Icon name="chevronLeft" className="h-5 w-5" />
                                </button>
                                <span className="min-w-[140px] px-2 text-center text-sm font-semibold text-slate-700">{heatmap?.label ?? '—'}</span>
                                <button
                                    type="button"
                                    className="rounded p-1 text-slate-500 transition-all hover:bg-white hover:shadow-sm"
                                    onClick={() => setMonth((m) => shiftMonth(m, 1))}
                                    aria-label="Next month"
                                >
                                    <Icon name="chevronRight" className="h-5 w-5" />
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="mb-2 grid grid-cols-7 gap-1.5">
                                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                                    <div
                                        key={d}
                                        className={[
                                            'text-center text-xs font-semibold uppercase tracking-wider',
                                            d === 'Sat' || d === 'Sun' ? 'text-amber-500/70' : 'text-slate-400',
                                        ].join(' ')}
                                    >
                                        {d}
                                    </div>
                                ))}
                            </div>

                            <div className="grid h-48 grid-cols-7 gap-1.5">
                                {calendar.map((cell) => {
                                    if (cell.kind === 'blank') {
                                        return <div key={cell.key} className="h-full rounded-md bg-slate-50 border border-slate-100" />;
                                    }

                                    const d = cell.data;
                                    const cls = heatClass(d.attendance_percent);
                                    const title = `${d.date} • ${d.attendance_percent}%`;

                                    const isToday = (() => {
                                        try {
                                            const today = new Date();
                                            const y = today.getFullYear();
                                            const m = String(today.getMonth() + 1).padStart(2, '0');
                                            const dd = String(today.getDate()).padStart(2, '0');
                                            return d.date === `${y}-${m}-${dd}`;
                                        } catch {
                                            return false;
                                        }
                                    })();

                                    return (
                                        <div
                                            key={cell.key}
                                            title={title}
                                            className={[
                                                'relative flex h-full cursor-pointer items-center justify-center rounded-md text-xs font-medium transition-all hover:ring-2 hover:ring-emerald-400',
                                                cls,
                                                isToday ? 'ring-2 ring-offset-2 ring-[#1E3A8A]' : '',
                                            ].join(' ')}
                                        >
                                            {isToday ? <span className="font-bold">{d.day}</span> : null}
                                            {!isToday && d.attendance_percent >= 90 ? (
                                                <span className="opacity-0 transition-opacity group-hover:opacity-100">{d.attendance_percent}%</span>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1">
                                        <span className="mr-1 text-[10px] font-medium">Low</span>
                                        <div className="h-4 w-4 rounded-sm bg-emerald-500/10" />
                                        <div className="h-4 w-4 rounded-sm bg-emerald-500/40" />
                                        <div className="h-4 w-4 rounded-sm bg-emerald-500/70" />
                                        <div className="h-4 w-4 rounded-sm bg-emerald-500" />
                                        <span className="ml-1 text-[10px] font-medium">High Attendance</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="flex items-center gap-1.5 rounded border border-blue-100 bg-blue-50 px-2 py-1 text-blue-700">
                                        <Icon name="clock" className="h-3.5 w-3.5" />
                                        Avg. Check-in: <strong>{heatmap?.avg_check_in_time ?? '—'}</strong>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
                        <div className="flex items-center justify-between border-b border-slate-100 p-6">
                            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                                <Icon name="calendar" className="h-5 w-5 text-[#1E3A8A]" />
                                Pending Leave Requests
                            </h3>
                            <button
                                type="button"
                                className="flex items-center gap-1 text-sm font-semibold text-[#1E3A8A] hover:text-blue-900 hover:underline"
                                onClick={() => window.location.assign('/leaves')}
                            >
                                View All
                                <Icon name="chevronRight" className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="divide-y divide-slate-100">
                            {state.status === 'loading' ? <div className="p-4 text-sm text-slate-500">Loading…</div> : null}

                            {state.status === 'success' && (pending?.items?.length ?? 0) === 0 ? (
                                <div className="p-4 text-sm text-slate-500">No pending leave requests.</div>
                            ) : null}

                            {(Array.isArray(pending?.items) ? pending.items : []).map((row) => (
                                <div
                                    key={row.id}
                                    className="flex flex-col gap-4 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="relative">
                                            <div className="h-12 w-12 rounded-full bg-slate-200" />
                                            <div className="absolute bottom-0 right-0 h-4 w-4 rounded-full border-2 border-white bg-amber-400" title="Pending" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-900">{row.employee_name}</p>
                                            <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                                                <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                                                    {String(row.leave_type).replace(/_/g, ' ')}
                                                </span>
                                                <span>•</span>
                                                <span className="flex items-center gap-1">
                                                    <span className="material-symbols-outlined text-[12px]">calendar_month</span>
                                                    {formatRange(row.start_date, row.end_date)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex w-full items-center gap-2 sm:w-auto">
                                        <button
                                            type="button"
                                            className="flex flex-1 items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-500 transition-all hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:flex-none"
                                            disabled={Boolean(busy[`reject-${row.id}`])}
                                            onClick={() => onReject(row.id)}
                                        >
                                            <Icon name="x" className="h-4 w-4" />
                                            Reject
                                        </button>
                                        <button
                                            type="button"
                                            className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-[#1E3A8A] px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-blue-900 sm:flex-none"
                                            disabled={Boolean(busy[`approve-${row.id}`])}
                                            onClick={() => onApprove(row.id)}
                                        >
                                            <Icon name="checkCircle" className="h-4 w-4" />
                                            Approve
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
                        <div className="border-b border-slate-100 bg-gradient-to-r from-red-50 to-white p-5">
                            <div className="mb-1 flex items-center gap-2 text-red-700">
                                <Icon name="triangleAlert" className="h-5 w-5 text-red-600" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-red-800">Attention Required</h3>
                            </div>
                            <p className="ml-8 text-xs font-medium text-red-600/80">Chronic late arrivals detected (3+ this month)</p>
                        </div>

                        <div className="flex flex-1 flex-col gap-4 p-5">
                            {state.status === 'loading' ? <div className="text-sm text-slate-500">Loading…</div> : null}

                            {state.status === 'success' && attention.length === 0 ? (
                                <div className="text-sm text-slate-500">No employees flagged this month.</div>
                            ) : null}

                            {attention.map((row) => {
                                const badgeClass =
                                    row.late_count >= 4
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : 'bg-amber-100 text-amber-700 border-amber-200';
                                const barClass = row.late_count >= 4 ? 'bg-red-400' : 'bg-amber-400';
                                const key = `warn-${row.employee_id}`;

                                return (
                                    <div
                                        key={row.employee_id}
                                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-white p-4 transition-all hover:border-red-200 hover:shadow-md"
                                    >
                                        <div className={['absolute left-0 top-0 bottom-0 w-1', barClass].join(' ')} />
                                        <div className="mb-3 flex items-start justify-between pl-2">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-slate-200" />
                                                <div>
                                                    <div className="text-sm font-bold text-slate-900">{row.employee_name}</div>
                                                    <div className="text-xs text-slate-500">{row.department ?? '—'}</div>
                                                </div>
                                            </div>
                                            <span className={['rounded-full border px-2 py-1 text-[10px] font-bold', badgeClass].join(' ')}>
                                                {row.late_count}x
                                            </span>
                                        </div>

                                        <div className="mb-3 flex items-center gap-1 pl-2 text-xs text-slate-600">
                                            <Icon name="history" className="h-4 w-4 text-amber-500" />
                                            Avg. delay: <span className="font-bold text-slate-800">{row.avg_late_minutes} mins</span>
                                        </div>

                                        <div className="flex gap-2 pl-2">
                                            <button
                                                type="button"
                                                className="flex-1 rounded border border-slate-200 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
                                                onClick={() => window.location.assign('/attendance')}
                                            >
                                                View Log
                                            </button>
                                            <button
                                                type="button"
                                                className="flex-1 rounded border border-red-100 bg-red-50 py-1.5 text-xs font-medium text-red-700 transition-colors hover:bg-red-100 disabled:opacity-60"
                                                disabled={Boolean(busy[key])}
                                                onClick={() => onSendWarning(row.employee_id)}
                                            >
                                                Send Warning
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="bg-slate-50 p-3 text-center">
                            <button
                                type="button"
                                className="flex items-center justify-center gap-1 text-xs font-bold text-[#1E3A8A] hover:text-blue-900 hover:underline"
                                onClick={() => window.location.assign('/reports')}
                            >
                                View Full Late Report
                                <Icon name="chevronRight" className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    <div className="group relative overflow-hidden rounded-xl bg-gradient-to-br from-[#1E3A8A] to-[#0A1F44] p-6 text-white shadow-lg">
                        <div className="absolute -mr-16 -mt-16 right-0 top-0 h-48 w-48 rounded-full bg-white/5 blur-3xl transition-colors duration-500 group-hover:bg-white/10" />
                        <div className="absolute -ml-10 -mb-10 bottom-0 left-0 h-32 w-32 rounded-full bg-blue-500/20 blur-2xl transition-colors duration-500 group-hover:bg-blue-500/30" />
                        <h3 className="relative z-10 mb-6 flex items-center gap-2 text-lg font-bold">
                            <Icon name="activity" className="h-5 w-5" />
                            Department Bulk Actions
                        </h3>
                        <div className="relative z-10 flex flex-col gap-3">
                            <button
                                type="button"
                                className="group/btn flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium transition-all hover:border-white/40 hover:bg-white/20"
                                onClick={() => window.location.assign('/payroll')}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon name="checkCircle" className="h-4 w-4 opacity-70" />
                                    Approve All Overtime
                                </span>
                                <Icon
                                    name="chevronRight"
                                    className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover/btn:translate-x-0 group-hover/btn:opacity-100"
                                />
                            </button>
                            <button
                                type="button"
                                className="group/btn flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium transition-all hover:border-white/40 hover:bg-white/20"
                                onClick={() => window.location.assign('/employees')}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon name="mail" className="h-4 w-4 opacity-70" />
                                    Send Reminder (Missing)
                                </span>
                                <Icon
                                    name="chevronRight"
                                    className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover/btn:translate-x-0 group-hover/btn:opacity-100"
                                />
                            </button>
                            <button
                                type="button"
                                className="group/btn flex w-full items-center justify-between rounded-lg border border-white/20 bg-white/10 px-4 py-3 text-sm font-medium transition-all hover:border-white/40 hover:bg-white/20"
                                onClick={() => window.location.assign('/reports')}
                            >
                                <span className="flex items-center gap-2">
                                    <Icon name="fileText" className="h-4 w-4 opacity-70" />
                                    Download Monthly PDF
                                </span>
                                <Icon
                                    name="chevronRight"
                                    className="h-4 w-4 -translate-x-2 opacity-0 transition-all group-hover/btn:translate-x-0 group-hover/btn:opacity-100"
                                />
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
