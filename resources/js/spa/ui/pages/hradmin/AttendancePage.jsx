import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { safeGet, safePatch, safePost } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';

function isoToday() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function toDateTimeLocal(value) {
    const v = String(value || '').trim();
    if (!v) {
        return '';
    }

    if (v.includes('T')) {
        return v.slice(0, 16);
    }

    if (v.includes(' ')) {
        const [date, time] = v.split(' ');
        if (!date || !time) {
            return '';
        }
        const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
        return `${date}T${hhmm}`;
    }

    return '';
}

function toBackendDateTime(value) {
    const v = String(value || '').trim();
    if (!v) {
        return '';
    }

    if (v.includes('T')) {
        const [date, time] = v.split('T');
        if (!date || !time) {
            return v;
        }
        const hhmm = time.length >= 5 ? time.slice(0, 5) : time;
        return `${date} ${hhmm}:00`;
    }

    return v;
}

function formatTime(iso) {
    if (!iso) {
        return '—';
    }

    try {
        const cleaned = String(iso).endsWith('Z') ? String(iso).slice(0, -1) : String(iso);
        const d = new Date(cleaned);
        if (Number.isNaN(d.getTime())) {
            return '—';
        }

        return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '—';
    }
}

function formatBreak(checkIn, checkOut) {
    if (!checkIn || !checkOut) {
        return '—';
    }

    try {
        const a = new Date(checkIn);
        const b = new Date(checkOut);
        const diffMs = b.getTime() - a.getTime();
        if (!Number.isFinite(diffMs) || diffMs <= 0) {
            return '—';
        }

        const minutes = Math.round(diffMs / (60 * 1000));
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;

        if (hrs <= 0) {
            return `${mins}m`;
        }

        return `${hrs}h ${String(mins).padStart(2, '0')}m`;
    } catch {
        return '—';
    }
}

function statusBadge(status) {
    if (status === 'on_time') {
        return { label: 'On-time', cls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' };
    }

    if (status === 'late') {
        return { label: 'Late', cls: 'bg-red-50 text-red-700 border-red-100', dot: 'bg-red-500' };
    }

    if (status === 'absent') {
        return { label: 'Absent', cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' };
    }

    return { label: 'Exception', cls: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500' };
}

function toCsv(rows) {
    const header = [
        'employee_name',
        'employee_code',
        'branch_name',
        'log_date',
        'check_in_time',
        'check_out_time',
        'late_minutes',
        'status',
    ];

    const escape = (v) => {
        const s = v === null || v === undefined ? '' : String(v);
        if (/[\n\r,\"]/g.test(s)) {
            return `"${s.replaceAll('"', '""')}"`;
        }
        return s;
    };

    const lines = [header.join(',')];

    for (const r of rows) {
        lines.push(
            [
                r.employee_name,
                r.employee_code,
                r.branch_name,
                r.log_date,
                r.check_in_time,
                r.check_out_time,
                r.late_minutes,
                r.derived_status,
            ]
                .map(escape)
                .join(','),
        );
    }

    return lines.join('\n');
}

function downloadText(filename, content, type = 'text/plain') {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function HrAdminAttendance() {
    const [departments, setDepartments] = useState([]);

    const [filters, setFilters] = useState(() => {
        const t = isoToday();
        return {
            from: t,
            to: t,
            department: '',
            status: '',
            search: '',
        };
    });

    const [table, setTable] = useState({ status: 'loading', data: [], meta: null, error: null });

    const [viewRow, setViewRow] = useState(null);
    const [editRow, setEditRow] = useState(null);
    const [manualOpen, setManualOpen] = useState(false);
    const [busy, setBusy] = useState(false);

    const importRef = useRef(null);

    const loadDepartments = useCallback(async () => {
        const res = await safeGet('/api/hr-admin/attendance/departments');
        const list = res.ok && Array.isArray(res.data?.data) ? res.data.data : [];
        setDepartments(list);
    }, []);

    const fetchTable = useCallback(
        async (page = 1) => {
            const params = new URLSearchParams();
            if (filters.from) params.set('from', filters.from);
            if (filters.to) params.set('to', filters.to);
            if (filters.department) params.set('department', filters.department);
            if (filters.status) params.set('status', filters.status);
            if (filters.search) params.set('search', filters.search);
            params.set('page', String(page));
            params.set('per_page', '20');

            setTable((t) => ({ ...t, status: 'loading', error: null }));
            const res = await safeGet(`/api/hr-admin/attendance/logs?${params.toString()}`);

            if (!res.ok) {
                setTable({ status: 'error', data: [], meta: null, error: res.error });
                return;
            }

            const payload = res.data?.data;
            const rows = Array.isArray(payload?.data) ? payload.data : [];
            const meta = payload?.meta ?? null;
            setTable({ status: 'success', data: rows, meta, error: null });
        },
        [filters],
    );

    useEffect(() => {
        loadDepartments();
    }, [loadDepartments]);

    useEffect(() => {
        fetchTable(1);
    }, [fetchTable]);

    const summary = useMemo(() => {
        const meta = table.meta;
        if (!meta) {
            return null;
        }

        const page = Number(meta.page ?? 1);
        const perPage = Number(meta.per_page ?? 20);
        const total = Number(meta.total ?? 0);
        const start = total === 0 ? 0 : (page - 1) * perPage + 1;
        const end = Math.min(total, page * perPage);

        return { start, end, total };
    }, [table.meta]);

    const onRefresh = async () => {
        await fetchTable(table.meta?.page ?? 1);
    };

    const onExport = async () => {
        const params = new URLSearchParams();
        if (filters.from) params.set('from', filters.from);
        if (filters.to) params.set('to', filters.to);
        if (filters.department) params.set('department', filters.department);
        if (filters.status) params.set('status', filters.status);
        if (filters.search) params.set('search', filters.search);
        params.set('page', '1');
        params.set('per_page', '100');

        setBusy(true);
        const res = await safeGet(`/api/hr-admin/attendance/logs?${params.toString()}`);
        setBusy(false);

        if (!res.ok) {
            setTable((t) => ({ ...t, status: 'error', error: res.error }));
            return;
        }

        const payload = res.data?.data;
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const csv = toCsv(rows);

        const name = `attendance-${filters.from || isoToday()}-${filters.to || isoToday()}.csv`;
        downloadText(name, csv, 'text/csv');
    };

    const onImportClick = () => {
        importRef.current?.click();
    };

    const onImportSelected = async (file) => {
        if (!file) {
            return;
        }

        const form = new FormData();
        form.append('file', file);

        setBusy(true);
        const res = await safePost('/api/hr-admin/attendance/import', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        setBusy(false);

        if (!res.ok) {
            setTable((t) => ({ ...t, status: 'error', error: res.error }));
            return;
        }

        await fetchTable(1);
    };

    const onSaveEdit = async (payload) => {
        if (!editRow?.attendance_id) {
            setEditRow(null);
            return;
        }

        setBusy(true);
        const res = await safePatch(`/api/attendance/logs/${editRow.attendance_id}`, payload);
        setBusy(false);

        if (!res.ok) {
            setTable((t) => ({ ...t, status: 'error', error: res.error }));
            return;
        }

        setEditRow(null);
        await fetchTable(table.meta?.page ?? 1);
    };

    const onManualCreate = async (payload) => {
        setBusy(true);
        const res = await safePost('/api/hr-admin/attendance/logs', payload);
        setBusy(false);

        if (!res.ok) {
            setTable((t) => ({ ...t, status: 'error', error: res.error }));
            return;
        }

        setManualOpen(false);
        await fetchTable(1);
    };

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Attendance Management</h1>
                    <p className="mt-1 text-sm text-slate-500">Manage and review daily employee attendance logs (Head Office).</p>
                </div>
                <div className="flex gap-3">
                    <input
                        ref={importRef}
                        type="file"
                        accept=".csv,text/csv"
                        className="hidden"
                        onChange={(e) => {
                            const file = e.target.files?.[0] ?? null;
                            e.target.value = '';
                            onImportSelected(file);
                        }}
                    />

                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                        disabled={busy}
                        onClick={onImportClick}
                    >
                        <Icon name="upload" className="h-4 w-4" />
                        Import CSV
                    </button>

                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg bg-[#1E3A8A] px-4 py-2 text-sm font-medium text-white shadow-lg shadow-blue-900/20 transition-colors hover:bg-blue-900 active:translate-y-0.5"
                        onClick={() => setManualOpen(true)}
                    >
                        <Icon name="add" className="h-4 w-4 text-white" />
                        Manual Entry
                    </button>
                </div>
            </div>

            <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
                    <div className="relative w-full md:w-auto">
                        <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="calendar" className="h-4 w-4" />
                        </div>
                        <div className="grid w-full grid-cols-2 gap-2 md:w-auto">
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
                                value={filters.from}
                                onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value, to: e.target.value }))}
                            />
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-3 text-sm text-slate-700 shadow-sm focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A]"
                                value={filters.to}
                                onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="hidden h-8 w-px bg-slate-200 md:block" />

                    <div className="relative w-full md:w-auto">
                        <select
                            className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm transition-colors hover:bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] md:w-48"
                            value={filters.department}
                            onChange={(e) => setFilters((f) => ({ ...f, department: e.target.value }))}
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="chevronRight" className="h-4 w-4 rotate-90" />
                        </div>
                    </div>

                    <div className="relative w-full md:w-auto">
                        <select
                            className="w-full appearance-none cursor-pointer rounded-lg border border-slate-200 bg-slate-50 py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm transition-colors hover:bg-white focus:border-[#1E3A8A] focus:ring-1 focus:ring-[#1E3A8A] md:w-40"
                            value={filters.status}
                            onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
                        >
                            <option value="">Status: All</option>
                            <option value="on_time">On-time</option>
                            <option value="late">Late</option>
                            <option value="absent">Absent</option>
                            <option value="exception">Exception</option>
                        </select>
                        <div className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="chevronRight" className="h-4 w-4 rotate-90" />
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end md:self-auto">
                    <button
                        type="button"
                        className="rounded-lg border border-transparent p-2 text-slate-500 transition-colors hover:border-slate-200 hover:bg-slate-100 hover:text-slate-800"
                        title="Refresh"
                        disabled={busy}
                        onClick={onRefresh}
                    >
                        <Icon name="refreshCw" className="h-4 w-4" />
                    </button>
                    <button
                        type="button"
                        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900"
                        disabled={busy}
                        onClick={onExport}
                    >
                        <Icon name="download" className="h-4 w-4" />
                        Export
                    </button>
                </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50">
                                <th className="w-64 px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Employee Name</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">ID</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Office</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Clock In</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Clock Out</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Break Time</th>
                                <th className="px-6 py-4 text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {table.status === 'loading' ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={8}>
                                        Loading…
                                    </td>
                                </tr>
                            ) : null}

                            {table.status === 'error' ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={8}>
                                        Failed to load attendance logs.
                                    </td>
                                </tr>
                            ) : null}

                            {table.status === 'success' && table.data.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-6 text-sm text-slate-500" colSpan={8}>
                                        No results.
                                    </td>
                                </tr>
                            ) : null}

                            {table.data.map((row) => {
                                const badge = statusBadge(row.derived_status);
                                const lateRow = row.derived_status === 'late';

                                return (
                                    <tr
                                        key={`${row.log_date}-${row.employee_id}-${row.attendance_id ?? 'na'}`}
                                        className={['group transition-colors hover:bg-slate-50/80', lateRow ? 'bg-red-50/30' : ''].join(' ')}
                                    >
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 bg-slate-200 text-xs font-bold text-slate-700">
                                                    {(row.employee_name || '—')
                                                        .split(' ')
                                                        .filter(Boolean)
                                                        .slice(0, 2)
                                                        .map((p) => p[0]?.toUpperCase())
                                                        .join('') || '—'}
                                                </div>
                                                <div>
                                                    <div className="text-sm font-semibold text-slate-900">{row.employee_name}</div>
                                                    <div className="text-xs text-slate-500">{row.department ?? '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-sm text-slate-600">{row.employee_code}</td>
                                        <td className="px-6 py-3 text-sm text-slate-600">Head Office</td>
                                        <td className={['px-6 py-3 text-sm font-medium', lateRow ? 'text-red-600' : 'text-slate-900'].join(' ')}>
                                            {formatTime(row.check_in_time)}
                                        </td>
                                        <td className="px-6 py-3 text-sm text-slate-500">{formatTime(row.check_out_time)}</td>
                                        <td className="px-6 py-3 text-sm text-slate-500">{formatBreak(row.check_in_time, row.check_out_time)}</td>
                                        <td className="px-6 py-3">
                                            <span
                                                className={[
                                                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                                                    badge.cls,
                                                ].join(' ')}
                                            >
                                                <span className={['h-1.5 w-1.5 rounded-full', badge.dot].join(' ')} />
                                                {badge.label}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <div className="flex items-center justify-end gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                                                <button
                                                    type="button"
                                                    className="rounded p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#1E3A8A]"
                                                    title="View Log"
                                                    onClick={() => setViewRow(row)}
                                                >
                                                    <Icon name="eye" className="h-4 w-4" />
                                                </button>
                                                {row.attendance_id ? (
                                                    <button
                                                        type="button"
                                                        className="rounded p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-[#1E3A8A]"
                                                        title="Edit"
                                                        onClick={() => setEditRow(row)}
                                                    >
                                                        <Icon name="edit_note" className="h-4 w-4" />
                                                    </button>
                                                ) : null}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                    <p className="text-sm text-slate-500">
                        {summary ? (
                            <>
                                Showing <span className="font-medium text-slate-900">{summary.start}-{summary.end}</span> of{' '}
                                <span className="font-medium text-slate-900">{summary.total}</span> results
                            </>
                        ) : (
                            '—'
                        )}
                    </p>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!table.meta?.has_prev || busy}
                            onClick={() => fetchTable((table.meta?.page ?? 1) - 1)}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                            disabled={!table.meta?.has_next || busy}
                            onClick={() => fetchTable((table.meta?.page ?? 1) + 1)}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {viewRow ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div className="text-sm font-bold text-slate-900">Attendance Log</div>
                            <button
                                type="button"
                                className="rounded p-2 text-slate-500 hover:bg-slate-100"
                                onClick={() => setViewRow(null)}
                            >
                                <Icon name="x" className="h-4 w-4" />
                            </button>
                        </div>
                        <div className="space-y-3 px-5 py-4 text-sm">
                            <div className="flex justify-between">
                                <span className="text-slate-500">Employee</span>
                                <span className="font-medium text-slate-900">{viewRow.employee_name}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Date</span>
                                <span className="font-medium text-slate-900">{viewRow.log_date}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Clock In</span>
                                <span className="font-medium text-slate-900">{formatTime(viewRow.check_in_time)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Clock Out</span>
                                <span className="font-medium text-slate-900">{formatTime(viewRow.check_out_time)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">Late Minutes</span>
                                <span className="font-medium text-slate-900">{viewRow.late_minutes ?? 0}</span>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                            <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setViewRow(null)}
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {editRow ? <EditModal row={editRow} busy={busy} onClose={() => setEditRow(null)} onSave={onSaveEdit} /> : null}

            {manualOpen ? (
                <ManualEntryModal
                    busy={busy}
                    onClose={() => setManualOpen(false)}
                    onSave={onManualCreate}
                />
            ) : null}
        </div>
    );
}

function EditModal({ row, busy, onClose, onSave }) {
    const [checkIn, setCheckIn] = useState(toDateTimeLocal(row.check_in_time));
    const [checkOut, setCheckOut] = useState(toDateTimeLocal(row.check_out_time));
    const [reason, setReason] = useState('');

    const canSave = (() => {
        if (busy || reason.trim().length < 3) {
            return false;
        }

        if (checkOut && !checkIn && !row.check_in_time) {
            return false;
        }

        return true;
    })();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <div className="text-sm font-bold text-slate-900">Edit Attendance</div>
                        <div className="text-xs text-slate-500">{row.employee_name}</div>
                    </div>
                    <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
                        <Icon name="x" className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                            <div className="mb-1 text-xs font-medium text-slate-600">Check-in</div>
                            <input
                                type="datetime-local"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                            />
                        </label>
                        <label className="text-sm">
                            <div className="mb-1 text-xs font-medium text-slate-600">Check-out</div>
                            <input
                                type="datetime-local"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                            />
                        </label>
                    </div>

                    <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-slate-600">Reason</div>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Required for audit log"
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-lg bg-[#1E3A8A] px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60"
                        disabled={!canSave}
                        onClick={() => {
                            const fallbackCheckIn = checkIn ? toBackendDateTime(checkIn) : String(row.check_in_time || '').trim();
                            const payload = {
                                check_in_time: fallbackCheckIn ? fallbackCheckIn : undefined,
                                check_out_time: checkOut ? toBackendDateTime(checkOut) : null,
                                reason: reason.trim(),
                            };

                            if (payload.check_out_time && !payload.check_in_time) {
                                payload.check_out_time = null;
                            }

                            onSave(payload);
                        }}
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
}

function ManualEntryModal({ busy, onClose, onSave }) {
    const [employeeQuery, setEmployeeQuery] = useState('');
    const [employeeResults, setEmployeeResults] = useState([]);
    const [employeeOpen, setEmployeeOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [logDate, setLogDate] = useState(isoToday());
    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        let active = true;

        const run = async () => {
            const q = employeeQuery.trim();

            if (q.length < 2) {
                setEmployeeResults([]);
                return;
            }

            const params = new URLSearchParams();
            params.set('search', q);
            params.set('limit', '10');

            const res = await safeGet(`/api/hr-admin/employees/lookup?${params.toString()}`);

            if (!active) {
                return;
            }

            const list = res.ok && Array.isArray(res.data?.data) ? res.data.data : [];
            setEmployeeResults(list);
        };

        const t = window.setTimeout(run, 250);

        return () => {
            active = false;
            window.clearTimeout(t);
        };
    }, [employeeQuery]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
            <div className="w-full max-w-lg overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div className="text-sm font-bold text-slate-900">Manual Entry</div>
                    <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100" onClick={onClose}>
                        <Icon name="x" className="h-4 w-4" />
                    </button>
                </div>

                <div className="space-y-4 px-5 py-4">
                    <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-slate-600">Employee</div>
                        <div className="relative">
                            <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icon name="search" className="h-4 w-4" />
                            </div>
                            <input
                                type="text"
                                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm"
                                value={selectedEmployee ? `${selectedEmployee.name} (${selectedEmployee.employee_code})` : employeeQuery}
                                onChange={(e) => {
                                    setSelectedEmployee(null);
                                    setEmployeeQuery(e.target.value);
                                    setEmployeeOpen(true);
                                }}
                                onFocus={() => setEmployeeOpen(true)}
                                placeholder="Search by name or code…"
                            />

                            {employeeOpen && !selectedEmployee && employeeResults.length > 0 ? (
                                <div className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                                    {employeeResults.map((e) => (
                                        <button
                                            key={e.id}
                                            type="button"
                                            className="flex w-full items-start justify-between gap-3 px-3 py-2 text-left text-sm hover:bg-slate-50"
                                            onClick={() => {
                                                setSelectedEmployee(e);
                                                setEmployeeOpen(false);
                                                setEmployeeQuery('');
                                            }}
                                        >
                                            <span>
                                                <span className="font-medium text-slate-900">{e.name}</span>
                                                <span className="ml-2 font-mono text-xs text-slate-500">{e.employee_code}</span>
                                                <div className="text-xs text-slate-500">
                                                    {e.department ?? '—'}
                                                    {e.branch_name ? ` • ${e.branch_name}` : ''}
                                                </div>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            ) : null}
                        </div>
                    </label>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                            <div className="mb-1 text-xs font-medium text-slate-600">Office</div>
                            <input type="text" className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm" value="Head Office" readOnly />
                        </label>
                        <label className="text-sm">
                            <div className="mb-1 text-xs font-medium text-slate-600">Date</div>
                            <input
                                type="date"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={logDate}
                                onChange={(e) => setLogDate(e.target.value)}
                            />
                        </label>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="text-sm">
                            <div className="mb-1 text-xs font-medium text-slate-600">Check-in</div>
                            <input
                                type="datetime-local"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={checkIn}
                                onChange={(e) => setCheckIn(e.target.value)}
                            />
                        </label>
                        <label className="text-sm">
                            <div className="mb-1 text-xs font-medium text-slate-600">Check-out</div>
                            <input
                                type="datetime-local"
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                                value={checkOut}
                                onChange={(e) => setCheckOut(e.target.value)}
                            />
                        </label>
                    </div>

                    <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-slate-600">Reason</div>
                        <input
                            type="text"
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Required for audit log"
                        />
                    </label>
                </div>

                <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                        onClick={onClose}
                        disabled={busy}
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded-lg bg-[#1E3A8A] px-3 py-2 text-sm font-medium text-white hover:bg-blue-900 disabled:opacity-60"
                        disabled={busy || !selectedEmployee?.id || !logDate || !checkIn || reason.trim().length < 3}
                        onClick={() =>
                            onSave({
                                employee_id: selectedEmployee.id,
                                log_date: logDate,
                                check_in_time: toBackendDateTime(checkIn),
                                check_out_time: checkOut ? toBackendDateTime(checkOut) : null,
                                reason: reason.trim(),
                            })
                        }
                    >
                        Create
                    </button>
                </div>
            </div>
        </div>
    );
}
