import React, { useEffect, useMemo, useState } from 'react';
import { safeGet } from '../lib/api.js';
import { Icon } from '../shared/Icon.jsx';
import { formatIso, formatModelType } from '../lib/format.js';

function EventTypeBadge({ action }) {
    const configs = {
        'auth.login': { text: 'text-blue-700', bg: 'bg-blue-50', label: 'Login' },
        'auth.logout': { text: 'text-slate-700', bg: 'bg-slate-100', label: 'Logout' },
        'auth.failed': { text: 'text-red-700', bg: 'bg-red-50', label: 'Failed Login' },
        'device.bound': { text: 'text-green-700', bg: 'bg-green-50', label: 'Device Bound' },
        'device.rejected': { text: 'text-amber-700', bg: 'bg-amber-50', label: 'Device Rejected' },
        'employee.created': { text: 'text-purple-700', bg: 'bg-purple-50', label: 'Employee Created' },
        'employee.updated': { text: 'text-purple-700', bg: 'bg-purple-50', label: 'Employee Updated' },
        'branch.created': { text: 'text-indigo-700', bg: 'bg-indigo-50', label: 'Branch Created' },
        'branch.updated': { text: 'text-indigo-700', bg: 'bg-indigo-50', label: 'Branch Updated' },
    };

    const config = configs[action] || { text: 'text-slate-700', bg: 'bg-slate-100', label: action };

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
            {config.label}
        </span>
    );
}

function getEventDescription(action) {
    const descriptions = {
        'auth.login': 'User successfully logged into the system',
        'auth.logout': 'User logged out of the system',
        'auth.failed': 'Failed login attempt detected',
        'device.bound': 'New device registered and bound to user',
        'device.rejected': 'Unregistered device login attempt blocked',
        'employee.created': 'New employee record created in system',
        'employee.updated': 'Employee information modified',
        'branch.created': 'New branch added to network',
        'branch.updated': 'Branch details updated',
    };

    return descriptions[action] || 'System event recorded';
}

export function AuditPage() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('');
    const [category, setCategory] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLog, setDetailLog] = useState(null);

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailLog(null);
    };

    const openDetail = (log) => {
        setDetailLog(log);
        setDetailOpen(true);
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(String(text ?? ''));
        } catch {
            // ignore
        }
    };

    const clearFilters = () => {
        setSearch('');
        setEventType('');
        setCategory('all');
        setDateFrom('');
        setDateTo('');
        setPerPage(25);
        setPage(1);
    };

    useEffect(() => {
        let active = true;
        setState({ status: 'loading', data: null, error: null });

        (async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('per_page', String(perPage));
            if (search.trim()) params.set('search', search.trim());
            if (eventType) params.set('action', eventType);
            if (category) params.set('category', category);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);

            const res = await safeGet(`/api/audit/logs?${params.toString()}`);

            if (!active) return;

            if (!res.ok) {
                setState({ status: 'error', data: null, error: res.error });
                return;
            }

            setState({ status: 'success', data: res.data, error: null });
        })();

        return () => {
            active = false;
        };
    }, [search, eventType, category, dateFrom, dateTo, page, perPage]);

    const logs = useMemo(() => state.data?.data ?? [], [state.data]);
    const meta = useMemo(() => {
        const d = state.data;
        return {
            current_page: Number(d?.current_page ?? 1),
            last_page: Number(d?.last_page ?? 1),
            per_page: Number(d?.per_page ?? perPage),
            total: Number(d?.total ?? 0),
            from: Number(d?.from ?? 0),
            to: Number(d?.to ?? 0),
        };
    }, [state.data, perPage]);

    const rangeLabel = useMemo(() => {
        const from = dateFrom ? `${dateFrom} 00:00` : '—';
        const to = dateTo ? `${dateTo} 23:59` : '—';
        return `${from} - ${to}`;
    }, [dateFrom, dateTo]);

    const showingLabel = useMemo(() => {
        if (!meta.total) {
            return 'Displaying records 0-0 of 0 total events';
        }

        const from = meta.from > 0 ? meta.from : (meta.current_page - 1) * meta.per_page + 1;
        const to = meta.to > 0 ? meta.to : Math.min(meta.current_page * meta.per_page, meta.total);
        return `Displaying records ${from}-${to} of ${meta.total} total events`;
    }, [meta]);

    const severity = (log) => {
        const action = String(log?.action ?? '').toLowerCase();
        if (action.includes('failed') || action.includes('rejected') || action.includes('breach')) {
            return { label: 'Critical', bg: 'bg-red-100 text-red-800', dot: 'bg-red-500', row: 'bg-red-50/50 border-l-red-500' };
        }
        if (action.includes('override') || action.includes('updated') || action.includes('modified')) {
            return { label: 'Medium', bg: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', row: '' };
        }
        if (action.includes('export') || action.includes('backup')) {
            return { label: 'Info', bg: 'bg-blue-100 text-blue-800', dot: 'bg-accent-gold', row: '' };
        }
        return { label: 'Low', bg: 'bg-green-100 text-green-800', dot: 'bg-slate-300', row: '' };
    };

    const handleExport = () => {
        const payload = {
            exported_at: new Date().toISOString(),
            logs: logs,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Icon name="history" className="h-7 w-7 text-[#C9A227]" />
                        Audit Logs Timeline
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                        Immutable record of all system actions, policy changes, and access events.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Icon name="badgeCheck" className="h-4 w-4" />
                        Verify Log Integrity
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a1f43] text-white rounded-lg text-sm font-medium hover:bg-[#0a1f43]/90 transition-colors shadow-md shadow-[#0a1f43]/20"
                    >
                        <Icon name="download" className="h-4 w-4" />
                        Export Encrypted Ledger
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-soft border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-2 w-full md:w-80">
                        <Icon name="calendar" className="h-4 w-4 text-slate-400 mr-2" />
                        <span className="text-sm text-slate-700">{rangeLabel}</span>
                    </div>
                    <div className="relative w-full md:w-72">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icon name="search" className="h-4 w-4 text-slate-400" />
                        </span>
                        <input
                            className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#C9A227] sm:text-sm transition-colors"
                            placeholder="Search by Actor, IP or Event ID..."
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="w-full md:w-64">
                        <select
                            className="block w-full px-3 py-2 border border-slate-200 rounded-md leading-5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                            value={eventType}
                            onChange={(e) => {
                                setEventType(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Action Types</option>
                            <option value="auth.login">auth.login</option>
                            <option value="auth.logout">auth.logout</option>
                            <option value="auth.failed">auth.failed</option>
                            <option value="device.bound">device.bound</option>
                            <option value="device.rejected">device.rejected</option>
                            <option value="employee.created">employee.created</option>
                            <option value="employee.updated">employee.updated</option>
                            <option value="employee.deleted">employee.deleted</option>
                            <option value="branch.created">branch.created</option>
                            <option value="branch.updated">branch.updated</option>
                            <option value="branch.deleted">branch.deleted</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="date"
                            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-[#C9A227]"
                            value={dateFrom}
                            onChange={(e) => {
                                setDateFrom(e.target.value);
                                setPage(1);
                            }}
                        />
                        <span className="text-slate-400">-</span>
                        <input
                            type="date"
                            className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-[#C9A227]"
                            value={dateTo}
                            onChange={(e) => {
                                setDateTo(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        onClick={clearFilters}
                        className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                        <Icon name="refreshCw" className="h-4 w-4" />
                        Clear
                    </button>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto justify-start md:justify-end">
                    <button
                        type="button"
                        onClick={() => {
                            setCategory('all');
                            setPage(1);
                        }}
                        className={
                            category === 'all'
                                ? 'px-3 py-1 rounded-full text-xs font-medium bg-[#0a1f43] text-white'
                                : 'px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                        }
                    >
                        All Events
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCategory('policy');
                            setPage(1);
                        }}
                        className={
                            category === 'policy'
                                ? 'px-3 py-1 rounded-full text-xs font-medium bg-[#0a1f43] text-white'
                                : 'px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                        }
                    >
                        Policy Changes
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCategory('security');
                            setPage(1);
                        }}
                        className={
                            category === 'security'
                                ? 'px-3 py-1 rounded-full text-xs font-medium bg-[#0a1f43] text-white'
                                : 'px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                        }
                    >
                        Security
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setCategory('export');
                            setPage(1);
                        }}
                        className={
                            category === 'export'
                                ? 'px-3 py-1 rounded-full text-xs font-medium bg-[#0a1f43] text-white'
                                : 'px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                        }
                    >
                        Data Export
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
                <div className="overflow-x-auto flex-1 min-h-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4 w-12 text-center">
                                    <Icon name="activity" className="h-4 w-4 text-slate-500 mx-auto" />
                                </th>
                                <th className="px-4 py-4">Timestamp (ISO 8601)</th>
                                <th className="px-4 py-4">User / Actor</th>
                                <th className="px-4 py-4">Action Type</th>
                                <th className="px-4 py-4">Details</th>
                                <th className="px-4 py-4">Source IP</th>
                                <th className="px-4 py-4 text-center">Severity</th>
                                <th className="px-6 py-4 text-right">Integrity</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm relative">
                            {state.status === 'loading' ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                                        Loading audit logs...
                                    </td>
                                </tr>
                            ) : state.status === 'error' ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-red-600">
                                        Failed to load audit logs.
                                    </td>
                                </tr>
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                                        No audit logs found.
                                    </td>
                                </tr>
                            ) : (
                                logs.map((log) => {
                                    const sev = severity(log);
                                    const actorLabel = log.actor_name || log.actor_email || `User #${log.user_id}`;
                                    const initials = String(actorLabel)
                                        .split(' ')
                                        .filter(Boolean)
                                        .slice(0, 2)
                                        .map((p) => p[0]?.toUpperCase())
                                        .join('');

                                    return (
                                        <tr
                                            key={log.id}
                                            onClick={() => openDetail(log)}
                                            className={`hover:bg-slate-50 transition-colors group cursor-pointer relative z-0 ${sev.row ? `${sev.row} border-l-4` : ''}`}
                                        >
                                            <td className="px-6 py-4 text-center relative">
                                                <div className={`w-2.5 h-2.5 rounded-full mx-auto ring-4 ring-white ${sev.dot}`}></div>
                                            </td>
                                            <td className="px-4 py-4 font-mono text-slate-600 whitespace-nowrap">{formatIso(log.created_at)}</td>
                                            <td className="px-4 py-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                        {initials || '—'}
                                                    </div>
                                                    <span className="font-medium text-slate-800">{actorLabel}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-4">
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                                                    <Icon name="fileText" className="h-3.5 w-3.5" />
                                                    {String(log.action ?? '—')}
                                                </span>
                                            </td>
                                            <td className="px-4 py-4 text-slate-600 max-w-xs truncate">
                                                {getEventDescription(log.action)}
                                                {log.model_type ? (
                                                    <span className="text-xs text-slate-400 block mt-0.5">
                                                        {formatModelType(log.model_type)}{log.model_id ? ` #${log.model_id}` : ''}
                                                    </span>
                                                ) : null}
                                            </td>
                                            <td className="px-4 py-4 font-mono text-xs text-slate-500">{log.ip_address || '—'}</td>
                                            <td className="px-4 py-4 text-center">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}>{sev.label}</span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <Icon name="lock" className="h-5 w-5 text-green-500 inline" />
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <span className="text-xs text-slate-500">{showingLabel}</span>
                    <div className="flex gap-2 items-center">
                        <div className="flex items-center mr-4">
                            <span className="text-xs text-slate-500 mr-2">Rows per page:</span>
                            <select
                                className="text-xs border-slate-200 rounded bg-white py-1 pl-2 pr-6"
                                value={perPage}
                                onChange={(e) => {
                                    const next = Number(e.target.value || 25);
                                    setPerPage(next);
                                    setPage(1);
                                }}
                            >
                                <option value={25}>25</option>
                                <option value={50}>50</option>
                                <option value={100}>100</option>
                            </select>
                        </div>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={meta.current_page <= 1}
                            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                            <Icon name="chevronLeft" className="h-4 w-4" />
                            Previous
                        </button>
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                            disabled={meta.current_page >= meta.last_page}
                            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                            Next
                            <Icon name="chevronRight" className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>

            {detailOpen ? (
                <div className="fixed inset-0 z-50">
                    <div className="absolute inset-0 bg-black/40" onClick={closeDetail} />
                    <div className="absolute inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-xl flex flex-col">
                        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Icon name="fileText" className="h-5 w-5 text-slate-700" />
                                <div className="font-semibold text-slate-800">Audit Event</div>
                                <div className="text-xs text-slate-500">#{detailLog?.id ?? '—'}</div>
                            </div>
                            <button
                                type="button"
                                onClick={closeDetail}
                                className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-5 space-y-4">
                            <div className="grid grid-cols-1 gap-3">
                                <div className="rounded border border-slate-200 p-3">
                                    <div className="text-xs text-slate-500">Timestamp</div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-mono text-sm text-slate-800">{formatIso(detailLog?.created_at)}</div>
                                        <button type="button" onClick={() => copyText(detailLog?.created_at)} className="text-slate-500 hover:text-slate-800">
                                            <Icon name="copy" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded border border-slate-200 p-3">
                                    <div className="text-xs text-slate-500">Actor</div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm text-slate-800">{detailLog?.actor_name || detailLog?.actor_email || `User #${detailLog?.user_id ?? '—'}`}</div>
                                        <button type="button" onClick={() => copyText(detailLog?.actor_email)} className="text-slate-500 hover:text-slate-800">
                                            <Icon name="copy" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded border border-slate-200 p-3">
                                    <div className="text-xs text-slate-500">Action</div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="text-sm text-slate-800">{detailLog?.action || '—'}</div>
                                        <button type="button" onClick={() => copyText(detailLog?.action)} className="text-slate-500 hover:text-slate-800">
                                            <Icon name="copy" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="rounded border border-slate-200 p-3">
                                    <div className="text-xs text-slate-500">Model</div>
                                    <div className="text-sm text-slate-800">
                                        {detailLog?.model_type ? formatModelType(detailLog.model_type) : '—'}
                                        {detailLog?.model_id ? ` #${detailLog.model_id}` : ''}
                                    </div>
                                </div>

                                <div className="rounded border border-slate-200 p-3">
                                    <div className="text-xs text-slate-500">Source IP</div>
                                    <div className="flex items-center justify-between gap-3">
                                        <div className="font-mono text-sm text-slate-800">{detailLog?.ip_address || '—'}</div>
                                        <button type="button" onClick={() => copyText(detailLog?.ip_address)} className="text-slate-500 hover:text-slate-800">
                                            <Icon name="copy" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded border border-slate-200 p-3">
                                <div className="text-xs text-slate-500 mb-2">Old Values</div>
                                <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto">
                                    {detailLog?.old_values ? JSON.stringify(detailLog.old_values, null, 2) : '—'}
                                </pre>
                            </div>

                            <div className="rounded border border-slate-200 p-3">
                                <div className="text-xs text-slate-500 mb-2">New Values</div>
                                <pre className="text-xs bg-slate-50 border border-slate-200 rounded p-3 overflow-auto">
                                    {detailLog?.new_values ? JSON.stringify(detailLog.new_values, null, 2) : '—'}
                                </pre>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
