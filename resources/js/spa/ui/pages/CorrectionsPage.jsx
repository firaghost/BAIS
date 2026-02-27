import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Panel } from '../shared/ui/Panel.jsx';
import { safeGet, safePost } from '../lib/api.js';

function normalizeError(err) {
    if (!err) {
        return 'Something went wrong. Please try again.';
    }

    if (typeof err === 'string') {
        return err;
    }

    if (typeof err?.message === 'string') {
        return err.message;
    }

    if (typeof err?.error?.message === 'string') {
        return err.error.message;
    }

    if (typeof err?.error === 'string') {
        return err.error;
    }

    return 'Something went wrong. Please try again.';
}

function formatDateTime(value) {
    if (!value) {
        return '—';
    }

    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) {
        return String(value);
    }

    return dt.toLocaleString();
}

export function CorrectionsPage() {
    const [table, setTable] = useState({ status: 'loading', data: [], meta: null, error: null });
    const [busyId, setBusyId] = useState(null);

    const fetchTable = useCallback(async (page = 1) => {
        const params = new URLSearchParams();
        params.set('per_page', '20');
        params.set('page', String(page));

        setTable((t) => ({ ...t, status: 'loading', error: null }));
        const res = await safeGet(`/api/attendance/corrections?${params.toString()}`);

        if (!res.ok) {
            setTable({ status: 'error', data: [], meta: null, error: res.error });
            return;
        }

        const payload = res.data?.data;
        const rows = Array.isArray(payload?.data) ? payload.data : [];
        const meta = payload?.meta ?? null;
        setTable({ status: 'success', data: rows, meta, error: null });
    }, []);

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

        return { start, end, total, page, perPage };
    }, [table.meta]);

    const onRefresh = async () => {
        await fetchTable(table.meta?.page ?? 1);
    };

    const review = async (row, action) => {
        if (!row?.id) {
            return;
        }

        const label = action === 'approve' ? 'Approve' : 'Reject';
        const comment = window.prompt(`${label} correction request (optional comment):`, '');

        const excuseLate =
            action === 'approve'
                ? window.confirm('Excuse lateness for this record? (This hides the Late flag)')
                : false;

        setBusyId(row.id);
        const res = await safePost(`/api/attendance/corrections/${row.id}/${action}`, {
            comment: comment && comment.trim() ? comment.trim() : null,
            ...(action === 'approve' ? { excuse_late: excuseLate } : {}),
        });
        setBusyId(null);

        if (!res.ok) {
            setTable((t) => ({ ...t, status: 'error', error: res.error }));
            return;
        }

        await fetchTable(table.meta?.page ?? 1);
    };

    return (
        <div className="space-y-4">
            <Panel
                title="Attendance Corrections"
                right={summary ? `Showing ${summary.start}-${summary.end} of ${summary.total}` : 'GET /api/attendance/corrections'}
            >
                <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-slate-500">Review and manage attendance correction requests submitted by employees.</p>
                    <button
                        type="button"
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
                        onClick={onRefresh}
                    >
                        Refresh
                    </button>
                </div>

                {table.status === 'loading' ? (
                    <div className="mt-4 text-sm text-slate-500">Loading corrections…</div>
                ) : null}

                {table.status === 'error' ? (
                    <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                        {normalizeError(table.error)}
                    </div>
                ) : null}

                {table.status === 'success' && table.data.length === 0 ? (
                    <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                        No correction requests found.
                    </div>
                ) : null}

                {table.status === 'success' && table.data.length > 0 ? (
                    <div className="mt-4 overflow-auto rounded-lg border border-slate-200">
                        <table className="min-w-[980px] w-full border-collapse bg-white text-sm">
                            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="border-b px-4 py-3">Status</th>
                                    <th className="border-b px-4 py-3">Employee</th>
                                    <th className="border-b px-4 py-3">Log Date</th>
                                    <th className="border-b px-4 py-3">Proposed</th>
                                    <th className="border-b px-4 py-3">Reason</th>
                                    <th className="border-b px-4 py-3">Submitted</th>
                                    <th className="border-b px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {table.data.map((row) => {
                                    const status = String(row.status ?? '—');
                                    const employee = row.employee
                                        ? `${row.employee.first_name ?? ''} ${row.employee.last_name ?? ''}`.trim() || '—'
                                        : row.user?.name ?? '—';
                                    const canReview = status === 'pending';
                                    const isBusy = busyId === row.id;

                                    return (
                                        <tr key={row.id} className="hover:bg-slate-50">
                                            <td className="border-b px-4 py-3">
                                                <span
                                                    className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                                                        status === 'approved'
                                                            ? 'bg-emerald-50 text-emerald-700'
                                                            : status === 'rejected'
                                                              ? 'bg-rose-50 text-rose-700'
                                                              : 'bg-amber-50 text-amber-700'
                                                    }`}
                                                >
                                                    {status.toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="border-b px-4 py-3 text-slate-800">{employee}</td>
                                            <td className="border-b px-4 py-3 text-slate-700">{row.attendance_log?.log_date ?? '—'}</td>
                                            <td className="border-b px-4 py-3 text-slate-700">
                                                <div className="space-y-1">
                                                    <div>
                                                        <span className="text-xs font-semibold text-slate-500">IN:</span>{' '}
                                                        {formatDateTime(row.proposed_check_in_time)}
                                                    </div>
                                                    <div>
                                                        <span className="text-xs font-semibold text-slate-500">OUT:</span>{' '}
                                                        {formatDateTime(row.proposed_check_out_time)}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="border-b px-4 py-3 text-slate-700">{row.reason ?? '—'}</td>
                                            <td className="border-b px-4 py-3 text-slate-700">{formatDateTime(row.created_at)}</td>
                                            <td className="border-b px-4 py-3">
                                                {canReview ? (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => review(row, 'approve')}
                                                            className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={isBusy}
                                                            onClick={() => review(row, 'reject')}
                                                            className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 shadow-sm hover:bg-rose-100 disabled:opacity-60"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-slate-500">No actions</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </Panel>
        </div>
    );
}
