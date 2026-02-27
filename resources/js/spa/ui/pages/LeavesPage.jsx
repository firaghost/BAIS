import React, { useEffect, useMemo, useRef, useState } from 'react';

import { safeGet, safePost } from '../lib/api.js';
import { useMe } from '../lib/useMe.js';
import { Icon } from '../shared/Icon.jsx';

function toDateOrNull(value) {
    if (!value) {
        return null;
    }

    const d = new Date(String(value));
    return Number.isNaN(d.getTime()) ? null : d;
}

function calculateDays(startDate, endDate) {
    const s = toDateOrNull(startDate);
    const e = toDateOrNull(endDate);

    if (!s || !e) {
        return null;
    }

    const ms = 24 * 60 * 60 * 1000;
    const diff = Math.floor((e.getTime() - s.getTime()) / ms) + 1;
    return diff > 0 ? diff : null;
}

function formatDateRange(startDate, endDate) {
    if (!startDate && !endDate) {
        return '—';
    }

    const sDate = toDateOrNull(startDate);
    const eDate = toDateOrNull(endDate);

    const fmt = (d) =>
        d
            ? d.toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: '2-digit',
              })
            : '';

    const s = sDate ? fmt(sDate) : (startDate ? String(startDate) : '');
    const e = eDate ? fmt(eDate) : (endDate ? String(endDate) : '');

    if (s !== '' && e !== '' && s !== e) {
        return `${s} - ${e}`;
    }

    return s || e || '—';
}

function getEmployeeDisplay(r) {
    const employee = r?.employee ?? r?.user?.employee ?? null;

    const nameParts = [employee?.first_name, employee?.middle_name, employee?.last_name]
        .map((x) => (typeof x === 'string' ? x.trim() : ''))
        .filter(Boolean);

    const name = nameParts.join(' ') || r?.user?.name || '—';
    const jobTitle = employee?.job_title || '—';
    const department = employee?.department || '—';

    return { name, jobTitle, department };
}

function statusBadge(status) {
    switch (status) {
        case 'approved':
            return { label: 'Approved', className: 'bg-emerald-50 text-emerald-700' };
        case 'rejected':
            return { label: 'Rejected', className: 'bg-red-50 text-red-700' };
        case 'pending_hr':
            return { label: 'Pending HR', className: 'bg-blue-50 text-blue-700' };
        case 'pending':
            return { label: 'Pending', className: 'bg-blue-50 text-blue-700' };
        default:
            return { label: String(status || '—'), className: 'bg-slate-100 text-slate-700' };
    }
}

function leaveTypeBadge(type) {
    switch (type) {
        case 'sick':
            return {
                label: 'Sick Leave',
                icon: 'medication',
                className: 'bg-amber-50 text-amber-700 border border-amber-100',
            };
        case 'annual':
            return {
                label: 'Vacation',
                icon: 'flight',
                className: 'bg-slate-100 text-slate-700 border border-slate-200',
            };
        case 'personal':
            return {
                label: 'Personal',
                icon: 'person',
                className: 'bg-slate-100 text-slate-700 border border-slate-200',
            };
        case 'other':
            return {
                label: 'Other',
                icon: 'event',
                className: 'bg-slate-100 text-slate-700 border border-slate-200',
            };
        default:
            return {
                label: String(type || '—'),
                icon: 'event',
                className: 'bg-slate-100 text-slate-700 border border-slate-200',
            };
    }
}

export function LeavesPage() {
    const { roles } = useMe();
    const [activeTab, setActiveTab] = useState('pending');
    const [department, setDepartment] = useState('all');
    const [leaveType, setLeaveType] = useState('all');
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [data, setData] = useState(null);
    const [summary, setSummary] = useState(null);
    const [selected, setSelected] = useState(() => new Set());
    const [actionBusy, setActionBusy] = useState(() => new Set());
    const [viewMode, setViewMode] = useState('list');
    const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: '' });

    const searchDebounceRef = useRef(null);

    const queryStatus = useMemo(() => {
        if (activeTab === 'all') return 'all';
        if (activeTab === 'approved') return 'approved';
        if (activeTab === 'rejected') return 'rejected';
        if (activeTab === 'pending') return 'pending_review';
        return 'all';
    }, [activeTab]);

    const requests = useMemo(() => {
        const items = data?.data?.data;
        return Array.isArray(items) ? items : [];
    }, [data]);

    const pagination = useMemo(() => {
        const p = data?.data;
        if (!p) return null;
        return {
            currentPage: Number(p.current_page ?? 1),
            lastPage: Number(p.last_page ?? 1),
            from: p.from ?? 0,
            to: p.to ?? 0,
            total: p.total ?? 0,
        };
    }, [data]);

    const departmentOptions = useMemo(() => {
        const list = requests
            .map((r) => getEmployeeDisplay(r).department)
            .filter((d) => typeof d === 'string' && d.trim() !== '' && d !== '—');

        return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
    }, [requests]);

    const pendingCountBadge = useMemo(() => {
        const n = Number(summary?.pending_review ?? 0);
        return Number.isFinite(n) ? n : 0;
    }, [summary]);

    const fetchData = async ({ nextPage, nextSearch }) => {
        const p = Number(nextPage ?? page) || 1;
        const s = typeof nextSearch === 'string' ? nextSearch : search;

        const params = new URLSearchParams();
        params.set('status', queryStatus);
        params.set('department', department);
        params.set('leave_type', leaveType);
        params.set('page', String(p));
        params.set('per_page', '20');
        params.set('include_summary', '1');
        if (s.trim() !== '') {
            params.set('search', s.trim());
        }

        setLoading(true);
        setError(null);

        const res = await safeGet(`/api/leaves/requests?${params.toString()}`);

        if (!res.ok) {
            setLoading(false);
            setError(res.error?.message || 'Failed to load leave requests');
            return;
        }

        setData(res.data);
        setSummary(res.data?.summary ?? null);
        setLoading(false);
    };

    useEffect(() => {
        setPage(1);
        setSelected(new Set());
        fetchData({ nextPage: 1 });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, department, leaveType, queryStatus]);

    useEffect(() => {
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => {
            setPage(1);
            fetchData({ nextPage: 1, nextSearch: search });
        }, 350);

        return () => {
            clearTimeout(searchDebounceRef.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [search]);

    const toggleAll = () => {
        const allIds = requests.map((r) => r.id).filter(Boolean);
        const next = new Set(selected);
        const allSelected = allIds.length > 0 && allIds.every((id) => next.has(id));

        if (allSelected) {
            allIds.forEach((id) => next.delete(id));
        } else {
            allIds.forEach((id) => next.add(id));
        }

        setSelected(next);
    };

    const toggleOne = (id) => {
        const next = new Set(selected);
        if (next.has(id)) {
            next.delete(id);
        } else {
            next.add(id);
        }
        setSelected(next);
    };

    const refreshNavMeta = () => {
        try {
            window.dispatchEvent(new Event('bais:navMetaRefresh'));
        } catch {
            // ignore
        }
    };

    const runAction = async ({ id, action, rejectionReason }) => {
        if (!id) return;
        const busy = new Set(actionBusy);
        busy.add(id);
        setActionBusy(busy);

        const url = action === 'approve' ? `/api/leaves/requests/${id}/approve` : `/api/leaves/requests/${id}/reject`;

        const payload = {};
        if (action === 'reject' && typeof rejectionReason === 'string' && rejectionReason.trim() !== '') {
            payload.rejection_reason = rejectionReason.trim();
        }

        const res = await safePost(url, payload);

        const nextBusy = new Set(actionBusy);
        nextBusy.delete(id);
        setActionBusy(nextBusy);

        if (!res.ok) {
            const msg = res.error?.message || res.error || 'Action failed';
            setError(msg);
            return;
        }

        refreshNavMeta();
        fetchData({ nextPage: page });
    };

    return (
        <div className="flex flex-col gap-6">
            {rejectModal.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <div className="text-sm font-semibold text-slate-900">Reject Leave Request</div>
                                <div className="mt-1 text-xs text-slate-500">Optionally provide a reason for the employee.</div>
                            </div>
                            <button
                                type="button"
                                className="rounded p-2 text-slate-500 hover:bg-slate-100"
                                onClick={() => setRejectModal({ open: false, id: null, reason: '' })}
                                aria-label="Close"
                            >
                                <Icon name="close" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="px-5 py-4">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejection reason</label>
                            <textarea
                                className="mt-2 w-full rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-[#0a1f43] focus:ring-1 focus:ring-[#0a1f43]"
                                rows={4}
                                value={rejectModal.reason}
                                onChange={(e) => setRejectModal((v) => ({ ...v, reason: e.target.value }))}
                                placeholder="Optional: write a short reason..."
                            />
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={() => setRejectModal({ open: false, id: null, reason: '' })}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700"
                                onClick={async () => {
                                    const id = rejectModal.id;
                                    const reason = rejectModal.reason;
                                    setRejectModal({ open: false, id: null, reason: '' });
                                    await runAction({ id, action: 'reject', rejectionReason: reason });
                                }}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-900">Leave Requests</h1>
                    <p className="mt-1 text-slate-500">Manage and review employee time-off applications.</p>
                </div>

                <div className="flex items-center rounded-lg border border-slate-200 bg-white p-1 shadow-sm">
                    <button
                        type="button"
                        className={[
                            'flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium shadow-sm',
                            viewMode === 'list' ? 'bg-[#0a1f43] text-white' : 'text-slate-600 hover:bg-slate-50',
                        ].join(' ')}
                        onClick={() => setViewMode('list')}
                    >
                        <Icon name="list" className="h-4 w-4" />
                        List View
                    </button>
                    <button
                        type="button"
                        className={[
                            'flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium',
                            viewMode === 'calendar' ? 'bg-[#0a1f43] text-white' : 'text-slate-600 hover:bg-slate-50',
                        ].join(' ')}
                        onClick={() => setViewMode('calendar')}
                    >
                        <Icon name="calendar" className="h-4 w-4" />
                        Calendar
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Pending Review</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{Number(summary?.pending_review ?? 0)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                        <Icon name="hourglass" className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved (This Month)</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{Number(summary?.approved_this_month ?? 0)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                        <Icon name="checkCircle" className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Rejected</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{Number(summary?.rejected ?? 0)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-50 text-red-600">
                        <Icon name="cancel" className="h-5 w-5" />
                    </div>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">On Leave Today</p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">{Number(summary?.on_leave_today ?? 0)}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                        <Icon name="flight" className="h-5 w-5" />
                    </div>
                </div>
            </div>

            <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-8 border-b border-slate-200 px-6 pt-4">
                    <button
                        type="button"
                        className={[
                            'pb-4 text-sm font-semibold',
                            activeTab === 'pending' ? 'border-b-2 border-[#0a1f43] text-[#0a1f43]' : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}
                        onClick={() => setActiveTab('pending')}
                    >
                        Pending Requests
                        {pendingCountBadge > 0 ? (
                            <span className="ml-1.5 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-bold text-red-700">
                                {pendingCountBadge}
                            </span>
                        ) : null}
                    </button>
                    <button
                        type="button"
                        className={[
                            'pb-4 text-sm font-medium',
                            activeTab === 'approved' ? 'border-b-2 border-[#0a1f43] text-[#0a1f43]' : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}
                        onClick={() => setActiveTab('approved')}
                    >
                        Approved
                    </button>
                    <button
                        type="button"
                        className={[
                            'pb-4 text-sm font-medium',
                            activeTab === 'rejected' ? 'border-b-2 border-[#0a1f43] text-[#0a1f43]' : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}
                        onClick={() => setActiveTab('rejected')}
                    >
                        Rejected
                    </button>
                    <button
                        type="button"
                        className={[
                            'pb-4 text-sm font-medium',
                            activeTab === 'all' ? 'border-b-2 border-[#0a1f43] text-[#0a1f43]' : 'text-slate-500 hover:text-slate-800',
                        ].join(' ')}
                        onClick={() => setActiveTab('all')}
                    >
                        All History
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 p-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="relative">
                            <select
                                className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-[#0a1f43] focus:ring-1 focus:ring-[#0a1f43]"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            >
                                <option value="all">All Departments</option>
                                {departmentOptions.map((d) => (
                                    <option key={d} value={d}>
                                        {d}
                                    </option>
                                ))}
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                                ▾
                            </span>
                        </div>

                        <div className="relative">
                            <select
                                className="cursor-pointer appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm text-slate-700 shadow-sm focus:border-[#0a1f43] focus:ring-1 focus:ring-[#0a1f43]"
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value)}
                            >
                                <option value="all">All Leave Types</option>
                                <option value="annual">Vacation</option>
                                <option value="sick">Sick Leave</option>
                                <option value="personal">Personal</option>
                                <option value="other">Other</option>
                            </select>
                            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-lg text-slate-400">
                                ▾
                            </span>
                        </div>

                        <div className="relative">
                            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                <Icon name="search" className="h-4 w-4" />
                            </span>
                            <input
                                type="text"
                                className="w-64 rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm text-slate-700 shadow-sm placeholder:text-slate-400 focus:border-[#0a1f43] focus:ring-1 focus:ring-[#0a1f43]"
                                placeholder="Search requests..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                            onClick={() => {
                                setDepartment('all');
                                setLeaveType('all');
                                setSearch('');
                            }}
                        >
                            <Icon name="filter" className="h-4 w-4" />
                            Reset
                        </button>

                        <button
                            type="button"
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
                            onClick={() => fetchData({ nextPage: page })}
                            aria-label="Refresh"
                        >
                            <Icon name="refresh" className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {error ? (
                    <div className="border-b border-slate-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                        {String(error)}
                        {String(error).toLowerCase().includes('forbidden') ? (
                            <div className="mt-1 text-xs font-normal text-red-700/90">
                                Your account does not have permission to approve/reject at this stage. Please login with the correct role.
                            </div>
                        ) : null}
                    </div>
                ) : null}

                <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left">
                        <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                                <th className="w-12 px-6 py-4">
                                    <input
                                        type="checkbox"
                                        className="rounded border-slate-300 text-[#0a1f43] focus:ring-[#0a1f43]"
                                        checked={requests.length > 0 && requests.every((r) => selected.has(r.id))}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Leave Type</th>
                                <th className="px-6 py-4">Duration</th>
                                <th className="w-1/4 px-6 py-4">Reason</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="px-6 py-10 text-center text-sm text-slate-500">
                                        No leave requests found.
                                    </td>
                                </tr>
                            ) : (
                                requests.map((r) => {
                                    const employee = getEmployeeDisplay(r);
                                    const status = statusBadge(r.status);
                                    const type = leaveTypeBadge(r.leave_type);
                                    const busy = actionBusy.has(r.id);

                                    const isSuperAdmin = Array.isArray(roles) && roles.includes('super-admin');
                                    const isHrAdmin = Array.isArray(roles) && roles.includes('hr-admin');
                                    const isBranchManager = Array.isArray(roles) && roles.includes('branch-manager');

                                    const canAct =
                                        (isSuperAdmin && (r.status === 'pending' || r.status === 'pending_hr')) ||
                                        (isHrAdmin && (r.status === 'pending' || r.status === 'pending_hr')) ||
                                        (isBranchManager && r.status === 'pending');
                                    const showActions = r.status === 'pending' || r.status === 'pending_hr';
                                    const days =
                                        Number(r.total_days ?? r.days ?? 0) > 0
                                            ? Number(r.total_days ?? r.days)
                                            : calculateDays(r.start_date, r.end_date);

                                    return (
                                        <tr key={r.id} className="group transition-colors hover:bg-slate-50/80">
                                            <td className="px-6 py-4">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-[#0a1f43] focus:ring-[#0a1f43]"
                                                    checked={selected.has(r.id)}
                                                    onChange={() => toggleOne(r.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-9 w-9 rounded-full bg-slate-200 shadow-sm" />
                                                    <div>
                                                        <p className="text-sm font-semibold text-slate-900">{employee.name}</p>
                                                        <p className="text-xs text-slate-500">{employee.jobTitle}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={[
                                                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
                                                        type.className,
                                                    ].join(' ')}
                                                >
                                                    <Icon name={type.icon} className="h-4 w-4" />
                                                    {type.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-slate-900">
                                                    {days ? `${days} Days` : '—'}
                                                </div>
                                                <div className="text-xs text-slate-500">
                                                    {formatDateRange(r.start_date, r.end_date)}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="max-w-xs truncate text-sm text-slate-600" title={r.reason || ''}>
                                                    {r.reason || '—'}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={['inline-flex items-center rounded px-2 py-1 text-xs font-semibold', status.className].join(' ')}>
                                                    {status.label}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {showActions ? (
                                                    <div className="flex items-center justify-end gap-2 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                                                        <button
                                                            type="button"
                                                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-60"
                                                            title={canAct ? 'Reject' : 'Not allowed'}
                                                            disabled={busy || !canAct}
                                                            onClick={() => setRejectModal({ open: true, id: r.id, reason: '' })}
                                                        >
                                                            <Icon name="close" className="h-5 w-5" />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="flex items-center gap-1 rounded bg-[#0a1f43] px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-[#1e3a8a] disabled:opacity-60"
                                                            disabled={busy || !canAct}
                                                            title={canAct ? 'Approve' : 'Not allowed'}
                                                            onClick={() => runAction({ id: r.id, action: 'approve' })}
                                                        >
                                                            <Icon name="check" className="h-4 w-4" />
                                                            Approve
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs italic text-slate-400">—</span>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex items-center justify-between border-t border-slate-200 bg-white p-4">
                    <span className="text-sm text-slate-500">
                        Showing <span className="font-medium text-slate-900">{pagination?.from ?? 0}-{pagination?.to ?? 0}</span> of{' '}
                        <span className="font-medium text-slate-900">{pagination?.total ?? 0}</span>
                    </span>

                    <div className="flex gap-2">
                        <button
                            type="button"
                            className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            disabled={!pagination || pagination.currentPage <= 1 || loading}
                            onClick={() => {
                                const next = Math.max(1, Number(page) - 1);
                                setPage(next);
                                fetchData({ nextPage: next });
                            }}
                        >
                            Previous
                        </button>
                        <button
                            type="button"
                            className="rounded border border-slate-200 px-3 py-1 text-sm text-slate-500 hover:bg-slate-50 disabled:opacity-50"
                            disabled={!pagination || pagination.currentPage >= pagination.lastPage || loading}
                            onClick={() => {
                                const next = Math.min(pagination.lastPage, Number(page) + 1);
                                setPage(next);
                                fetchData({ nextPage: next });
                            }}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
