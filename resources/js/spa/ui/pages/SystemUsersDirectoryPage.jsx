import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import { safeGet, safePost, safePut } from '../lib/api.js';
import { Icon } from '../shared/Icon.jsx';

function normalizeRoles(list) {
    if (!Array.isArray(list)) return [];
    return list
        .filter((r) => r && typeof r === 'object')
        .map((r) => ({
            id: Number(r.id) || 0,
            name: String(r.name ?? ''),
            slug: String(r.slug ?? ''),
        }))
        .filter((r) => r.id > 0);
}

function statusUi(status) {
    const s = String(status || '');
    if (s === 'inactive') {
        return { label: 'Inactive', className: 'text-slate-400', dotClassName: 'bg-slate-400' };
    }
    if (s === 'pending') {
        return { label: 'Pending', className: 'text-amber-600', dotClassName: 'bg-amber-600' };
    }
    return { label: 'Active', className: 'text-green-600', dotClassName: 'bg-green-600' };
}

function initials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const first = parts[0]?.[0] ?? 'U';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase();
}

function rolePill(slug) {
    const s = String(slug || '');
    if (s === 'super-admin') return 'bg-[#0a1f43]/10 text-[#0a1f43]';
    if (s === 'hr-admin') return 'bg-blue-100 text-blue-800';
    if (s === 'branch-manager') return 'bg-amber-100 text-amber-800';
    if (s === 'payroll-officer') return 'bg-green-100 text-green-800';
    if (s === 'executive-viewer') return 'bg-slate-100 text-slate-700';
    return 'bg-slate-100 text-slate-700';
}

export function SystemUsersDirectoryPage() {
    const navigate = useNavigate();

    const [roles, setRoles] = useState({ status: 'idle', data: [], error: null });
    const [directory, setDirectory] = useState({ status: 'idle', data: [], meta: null, error: null });

    const [filters, setFilters] = useState({
        search: '',
        role_id: '',
        page: 1,
        per_page: 8,
    });

    const [editModal, setEditModal] = useState({
        open: false,
        user: null,
        name: '',
        role_id: '',
        access_scope_type: 'global',
        access_scope_region: '',
        status: 'idle',
        error: null,
    });

    const [confirmModal, setConfirmModal] = useState({ open: false, mode: 'deactivate', user: null, status: 'idle', error: null });

    const refreshDirectory = async () => {
        const params = new URLSearchParams();
        params.set('page', String(filters.page));
        params.set('per_page', String(filters.per_page));
        if (String(filters.search || '').trim()) params.set('search', String(filters.search).trim());
        if (String(filters.role_id || '').trim()) params.set('role_id', String(filters.role_id).trim());

        setDirectory((prev) => ({ ...prev, status: prev.status === 'idle' ? 'loading' : prev.status, error: null }));
        const res = await safeGet(`/api/system-users?${params.toString()}`);
        if (!res.ok) {
            setDirectory({ status: 'error', data: [], meta: null, error: res.error });
            return;
        }

        setDirectory({
            status: 'success',
            data: Array.isArray(res.data?.data) ? res.data.data : [],
            meta: res.data?.meta ?? null,
            error: null,
        });
    };

    useEffect(() => {
        let active = true;

        (async () => {
            setRoles({ status: 'loading', data: [], error: null });
            const res = await safeGet('/api/system-users/roles');

            if (!active) return;
            if (!res.ok) {
                setRoles({ status: 'error', data: [], error: res.error });
                return;
            }

            setRoles({ status: 'success', data: normalizeRoles(res.data?.data), error: null });
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        (async () => {
            setDirectory((prev) => ({ ...prev, status: 'loading', error: null }));

            const params = new URLSearchParams();
            params.set('page', String(filters.page));
            params.set('per_page', String(filters.per_page));
            if (String(filters.search || '').trim()) params.set('search', String(filters.search).trim());
            if (String(filters.role_id || '').trim()) params.set('role_id', String(filters.role_id).trim());

            const res = await safeGet(`/api/system-users?${params.toString()}`);

            if (!active) return;
            if (!res.ok) {
                setDirectory({ status: 'error', data: [], meta: null, error: res.error });
                return;
            }

            setDirectory({
                status: 'success',
                data: Array.isArray(res.data?.data) ? res.data.data : [],
                meta: res.data?.meta ?? null,
                error: null,
            });
        })();

        return () => {
            active = false;
        };
    }, [filters.page, filters.per_page, filters.role_id, filters.search]);

    const metaText = useMemo(() => {
        const total = Number(directory.meta?.total) || 0;
        const page = Number(directory.meta?.current_page) || 1;
        const perPage = Number(directory.meta?.per_page) || filters.per_page;

        const start = total === 0 ? 0 : (page - 1) * perPage + 1;
        const end = Math.min(total, page * perPage);

        return `Showing ${start}-${end} of ${total} Users`;
    }, [directory.meta, filters.per_page]);

    const canPrev = (Number(directory.meta?.current_page) || 1) > 1;
    const canNext = (Number(directory.meta?.current_page) || 1) < (Number(directory.meta?.last_page) || 1);

    const goPrev = () => {
        if (!canPrev) return;
        setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }));
    };

    const goNext = () => {
        if (!canNext) return;
        setFilters((prev) => ({ ...prev, page: prev.page + 1 }));
    };

    const pages = useMemo(() => {
        const last = Number(directory.meta?.last_page) || 1;
        const current = Number(directory.meta?.current_page) || 1;

        const start = Math.max(1, current - 1);
        const end = Math.min(last, start + 2);

        const list = [];
        for (let i = start; i <= end; i += 1) list.push(i);
        if (list.length < 3 && start > 1) {
            while (list.length < 3 && list[0] > 1) list.unshift(list[0] - 1);
        }

        return list;
    }, [directory.meta]);

    const roleOptions = useMemo(() => (roles.status === 'success' ? roles.data : []), [roles.data, roles.status]);

    const openEdit = (user) => {
        const role = roleOptions.find((r) => Number(r.id) === Number(user.primary_role_id)) ?? null;
        const scopeType = String(user.access_scope_type || 'global');

        setEditModal({
            open: true,
            user,
            name: String(user.name ?? ''),
            role_id: String(role?.id ?? ''),
            access_scope_type: scopeType,
            access_scope_region: scopeType === 'regional' ? String(user.access_scope_region || '') : '',
            status: 'idle',
            error: null,
        });
    };

    const closeEdit = () => {
        setEditModal((prev) => ({ ...prev, open: false, user: null, status: 'idle', error: null }));
    };

    const saveEdit = async () => {
        if (!editModal.user || editModal.status === 'submitting') return;

        const roleId = Number(editModal.role_id) || 0;
        if (roleId <= 0) {
            setEditModal((prev) => ({ ...prev, error: { message: 'Please select a role.' } }));
            return;
        }

        const payload = {
            name: String(editModal.name || '').trim(),
            role_id: roleId,
            access_scope_type: editModal.access_scope_type,
            access_scope_region: editModal.access_scope_type === 'regional' ? String(editModal.access_scope_region || '').trim() : null,
            access_scope_branch_id: null,
        };

        setEditModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safePut(`/api/system-users/${editModal.user.id}`, payload);

        if (!res.ok) {
            setEditModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        closeEdit();
        await refreshDirectory();
    };

    const openConfirm = (mode, user) => {
        setConfirmModal({ open: true, mode, user, status: 'idle', error: null });
    };

    const closeConfirm = () => {
        setConfirmModal({ open: false, mode: 'deactivate', user: null, status: 'idle', error: null });
    };

    const confirmAction = async () => {
        if (!confirmModal.user || confirmModal.status === 'submitting') return;

        setConfirmModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const url =
            confirmModal.mode === 'activate'
                ? `/api/system-users/${confirmModal.user.id}/activate`
                : `/api/system-users/${confirmModal.user.id}/deactivate`;

        const res = await safePost(url, {});
        if (!res.ok) {
            setConfirmModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        closeConfirm();
        await refreshDirectory();
    };

    const statusCell = (status) => {
        const ui = statusUi(status);
        return (
            <span className={["flex items-center gap-1.5 font-medium", ui.className].join(' ')}>
                <span className={["w-1.5 h-1.5 rounded-full", ui.dotClassName].join(' ')} />
                {ui.label}
            </span>
        );
    };

    const displayScope = (u) => {
        return String(u.scope_label || '—');
    };

    return (
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">User Directory</h2>
                        <p className="text-sm text-slate-500">Manage administrative access and system-level permissions.</p>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate('/system-users/new')}
                        className="inline-flex items-center px-4 py-2 bg-[#1E3A8A] hover:bg-blue-900 text-white rounded font-semibold text-sm shadow-sm transition-colors"
                    >
                        <Icon name="userPlus" className="h-5 w-5 mr-2" />
                        Create New User
                    </button>
                </div>

                <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between">
                        <div className="flex gap-2 flex-wrap">
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                                    <Icon name="search" className="h-4 w-4" />
                                </span>
                                <input
                                    className="pl-10 pr-4 py-2 border border-slate-300 rounded text-sm w-64 focus:ring-[#1E3A8A] focus:border-[#1E3A8A]"
                                    placeholder="Search by name or email..."
                                    value={filters.search}
                                    onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value, page: 1 }))}
                                />
                            </div>

                            <select
                                className="border border-slate-300 rounded text-sm px-3 py-2 focus:ring-[#1E3A8A]"
                                value={filters.role_id}
                                onChange={(e) => setFilters((prev) => ({ ...prev, role_id: e.target.value, page: 1 }))}
                                disabled={roles.status !== 'success'}
                            >
                                <option value="">All Roles</option>
                                {roles.status === 'success'
                                    ? roles.data.map((r) => (
                                        <option key={r.id} value={r.id}>
                                            {r.name}
                                        </option>
                                    ))
                                    : null}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 text-xs text-slate-500">{directory.status === 'success' ? metaText : null}</div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4">Name</th>
                                    <th className="px-6 py-4">Email Address</th>
                                    <th className="px-6 py-4">Primary Role</th>
                                    <th className="px-6 py-4">Assigned Scope</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-sm">
                                {directory.status === 'loading' ? (
                                    <tr>
                                        <td className="px-6 py-6 text-slate-500" colSpan={6}>
                                            Loading users...
                                        </td>
                                    </tr>
                                ) : null}

                                {directory.status === 'error' ? (
                                    <tr>
                                        <td className="px-6 py-6 text-red-700" colSpan={6}>
                                            Failed to load users.
                                        </td>
                                    </tr>
                                ) : null}

                                {directory.status === 'success' && directory.data.length === 0 ? (
                                    <tr>
                                        <td className="px-6 py-6 text-slate-500" colSpan={6}>
                                            No users found.
                                        </td>
                                    </tr>
                                ) : null}

                                {directory.status === 'success'
                                    ? directory.data.map((u) => (
                                        <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 text-xs">
                                                        {initials(u.name)}
                                                    </div>
                                                    <span className="font-semibold text-slate-800">{u.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-500">{u.email}</td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={[
                                                        'px-2 py-1 text-[10px] font-bold rounded uppercase tracking-wider',
                                                        rolePill(u.primary_role_slug),
                                                    ].join(' ')}
                                                >
                                                    {u.primary_role_name || '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{displayScope(u)}</td>
                                            <td className="px-6 py-4">{statusCell(u.status)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <button
                                                    type="button"
                                                    className="p-1 hover:text-[#1E3A8A] transition-colors"
                                                    onClick={() => openEdit(u)}
                                                    aria-label="Edit user"
                                                >
                                                    <Icon name="edit_note" className="h-4 w-4" />
                                                </button>

                                                {u.status === 'inactive' ? (
                                                    <button
                                                        type="button"
                                                        className="p-1 text-green-600 hover:text-green-700 transition-colors ml-1"
                                                        onClick={() => openConfirm('activate', u)}
                                                        aria-label="Activate user"
                                                    >
                                                        <Icon name="checkCircle" className="h-4 w-4" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        className="p-1 hover:text-red-500 transition-colors ml-1"
                                                        onClick={() => openConfirm('deactivate', u)}
                                                        aria-label="Deactivate user"
                                                    >
                                                        <Icon name="alertCircle" className="h-4 w-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                    : null}
                            </tbody>
                        </table>
                    </div>

                    {editModal.open ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={closeEdit} aria-label="Close edit" />
                            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                                    <div>
                                        <h3 className="text-base font-bold text-slate-800">Edit User</h3>
                                        <p className="text-xs text-slate-500 mt-1">Update role and access scope.</p>
                                    </div>
                                    <button type="button" className="text-slate-400 hover:text-slate-600" onClick={closeEdit} aria-label="Close">
                                        <Icon name="x" className="h-5 w-5" />
                                    </button>
                                </div>

                                <div className="p-5 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Full Name</label>
                                            <input
                                                className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                                value={editModal.name}
                                                onChange={(e) => setEditModal((prev) => ({ ...prev, name: e.target.value }))}
                                            />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Primary Role</label>
                                            <select
                                                className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                                value={editModal.role_id}
                                                onChange={(e) => setEditModal((prev) => ({ ...prev, role_id: e.target.value }))}
                                            >
                                                <option value="">Select role...</option>
                                                {roleOptions.map((r) => (
                                                    <option key={r.id} value={r.id}>
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Access Scope</label>
                                            <select
                                                className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                                value={editModal.access_scope_type}
                                                onChange={(e) => {
                                                    const next = String(e.target.value);
                                                    setEditModal((prev) => ({
                                                        ...prev,
                                                        access_scope_type: next,
                                                        access_scope_region: next === 'regional' ? prev.access_scope_region : '',
                                                        access_scope_branch_id: next === 'branch' ? prev.access_scope_branch_id : '',
                                                    }));
                                                }}
                                            >
                                                <option value="global">Global Access</option>
                                                <option value="regional">Regional Hub</option>
                                                <option value="branch">Specific Branch</option>
                                            </select>
                                        </div>

                                        {editModal.access_scope_type === 'regional' ? (
                                            <div>
                                                <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Region</label>
                                                <input
                                                    className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                                    value={editModal.access_scope_region}
                                                    onChange={(e) => setEditModal((prev) => ({ ...prev, access_scope_region: e.target.value }))}
                                                    placeholder="Enter region name..."
                                                />
                                            </div>
                                        ) : null}

                                        {editModal.access_scope_type === 'branch' ? (
                                            <div className="md:col-span-2 space-y-3">
                                                <div className="relative">
                                                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
                                                        <Icon name="search" className="h-4 w-4" />
                                                    </span>
                                                    <input
                                                        className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 pl-10 pr-3"
                                                        placeholder="Search branch name..."
                                                        value={editModal.branch_search}
                                                        onChange={(e) => setEditModal((prev) => ({ ...prev, branch_search: e.target.value }))}
                                                    />
                                                </div>

                                                <select
                                                    className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                                    value={editModal.access_scope_branch_id}
                                                    onChange={(e) => setEditModal((prev) => ({ ...prev, access_scope_branch_id: e.target.value }))}
                                                    disabled={branches.status !== 'success'}
                                                >
                                                    <option value="">Select branch...</option>
                                                    {branches.status === 'success'
                                                        ? filteredBranchesForEdit.slice(0, 80).map((b) => (
                                                            <option key={b.id} value={String(b.id)}>
                                                                {b.name}
                                                            </option>
                                                        ))
                                                        : null}
                                                </select>
                                                {branches.status === 'loading' ? <div className="text-xs text-slate-500">Loading branches...</div> : null}
                                                {branches.status === 'error' ? <div className="text-xs text-red-700">Failed to load branches.</div> : null}
                                            </div>
                                        ) : null}
                                    </div>

                                    {editModal.error ? (
                                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                            {editModal.error?.message || 'Failed to update user.'}
                                        </div>
                                    ) : null}
                                </div>

                                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                                    <button type="button" className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm" onClick={closeEdit}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium disabled:opacity-50"
                                        onClick={saveEdit}
                                        disabled={editModal.status === 'submitting'}
                                    >
                                        {editModal.status === 'submitting' ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {confirmModal.open ? (
                        <div className="fixed inset-0 z-50 flex items-center justify-center">
                            <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={closeConfirm} aria-label="Close confirmation" />
                            <div className="relative w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                                <div className="p-5 border-b border-slate-200">
                                    <h3 className="text-base font-bold text-slate-800">
                                        {confirmModal.mode === 'activate' ? 'Activate User' : 'Deactivate User'}
                                    </h3>
                                    <p className="text-xs text-slate-500 mt-1">
                                        {confirmModal.user?.email ? `User: ${confirmModal.user.email}` : 'Confirm this action.'}
                                    </p>
                                </div>
                                <div className="p-5">
                                    {confirmModal.error ? (
                                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                            {confirmModal.error?.message || 'Action failed.'}
                                        </div>
                                    ) : null}
                                    <div className="text-sm text-slate-700">
                                        {confirmModal.mode === 'activate'
                                            ? 'This will restore access for this user.'
                                            : 'This will immediately block access for this user.'}
                                    </div>
                                </div>
                                <div className="p-5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                                    <button type="button" className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm" onClick={closeConfirm}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className={[
                                            'px-4 py-2 rounded text-sm font-medium text-white disabled:opacity-50',
                                            confirmModal.mode === 'activate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700',
                                        ].join(' ')}
                                        onClick={confirmAction}
                                        disabled={confirmModal.status === 'submitting'}
                                    >
                                        {confirmModal.status === 'submitting'
                                            ? 'Working...'
                                            : confirmModal.mode === 'activate'
                                                ? 'Activate'
                                                : 'Deactivate'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                        <button
                            type="button"
                            onClick={goPrev}
                            disabled={!canPrev}
                            className="text-sm font-medium text-slate-600 hover:text-[#0a1f43] flex items-center gap-1 disabled:opacity-50"
                        >
                            <Icon name="chevronLeft" className="h-5 w-5" />
                            Previous
                        </button>

                        <div className="flex gap-2">
                            {pages.map((p) => (
                                <button
                                    key={p}
                                    type="button"
                                    onClick={() => setFilters((prev) => ({ ...prev, page: p }))}
                                    className={[
                                        'w-8 h-8 flex items-center justify-center rounded text-sm font-medium',
                                        (Number(directory.meta?.current_page) || 1) === p
                                            ? 'bg-[#0a1f43] text-white font-bold'
                                            : 'hover:bg-slate-200 text-slate-700',
                                    ].join(' ')}
                                >
                                    {p}
                                </button>
                            ))}
                        </div>

                        <button
                            type="button"
                            onClick={goNext}
                            disabled={!canNext}
                            className="text-sm font-medium text-slate-600 hover:text-[#0a1f43] flex items-center gap-1 disabled:opacity-50"
                        >
                            Next
                            <Icon name="chevronRight" className="h-5 w-5" />
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-soft border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                                <Icon name="shield" className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold">Role Templates</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Review or edit standard permission sets for common administrative roles.</p>
                        <NavLink className="text-sm font-semibold text-[#1E3A8A] hover:underline" to="/settings">
                            Manage Role Permissions →
                        </NavLink>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-soft border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded bg-amber-50 flex items-center justify-center text-amber-600">
                                <Icon name="history" className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold">Audit Access</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">View a detailed log of all changes made to system users and their assigned roles.</p>
                        <NavLink className="text-sm font-semibold text-[#1E3A8A] hover:underline" to="/audit">
                            View Access Logs →
                        </NavLink>
                    </div>

                    <div className="bg-white p-6 rounded-lg shadow-soft border border-slate-200">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center text-green-600">
                                <Icon name="key" className="h-5 w-5" />
                            </div>
                            <h3 className="font-bold">Security Controls</h3>
                        </div>
                        <p className="text-sm text-slate-500 mb-4">Manage MFA requirements and session policies specifically for system admins.</p>
                        <NavLink className="text-sm font-semibold text-[#1E3A8A] hover:underline" to="/settings">
                            Security Dashboard →
                        </NavLink>
                    </div>
                </div>
            </div>
        </div>
    );
}
