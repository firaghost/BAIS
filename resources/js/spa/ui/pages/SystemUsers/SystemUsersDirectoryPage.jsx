import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { safeDelete, safeGet, safePost, safePut } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { UserFilters } from './components/UserFilters.jsx';
import { UserStatsCards } from './components/UserStatsCards.jsx';
import { UserTable } from './components/UserTable.jsx';
import { normalizeRoles } from './lib/user-utils.js';
import { UserConfirmModal, UserEditModal } from './modals/UserModals.jsx';

export function SystemUsersDirectoryPage() {
    const navigate = useNavigate();

    const [roles, setRoles] = useState({ status: 'idle', data: [], error: null });
    const [directory, setDirectory] = useState({ status: 'idle', data: [], meta: null, error: null });
    const [branches, setBranches] = useState({ status: 'idle', data: [], error: null });

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
        access_scope_branch_id: '',
        branch_search: '',
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
            setBranches({ status: 'loading', data: [], error: null });

            const [rolesRes, branchesRes] = await Promise.all([
                safeGet('/api/system-users/roles'),
                safeGet('/api/branches')
            ]);

            if (!active) return;

            if (rolesRes.ok) {
                setRoles({ status: 'success', data: normalizeRoles(rolesRes.data?.data), error: null });
            } else {
                setRoles({ status: 'error', data: [], error: rolesRes.error });
            }

            if (branchesRes.ok) {
                setBranches({ status: 'success', data: Array.isArray(branchesRes.data?.data) ? branchesRes.data.data : [], error: null });
            } else {
                setBranches({ status: 'error', data: [], error: branchesRes.error });
            }
        })();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        refreshDirectory();
    }, [filters.page, filters.per_page, filters.role_id, filters.search]);

    const metaText = useMemo(() => {
        const total = Number(directory.meta?.total) || 0;
        const page = Number(directory.meta?.current_page) || 1;
        const perPage = Number(directory.meta?.per_page) || filters.per_page;

        const start = total === 0 ? 0 : (page - 1) * perPage + 1;
        const end = Math.min(total, page * perPage);

        return `Showing ${start}-${end} of ${total} Users`;
    }, [directory.meta, filters.per_page]);

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

    const openEdit = (user) => {
        const roleId = String(user.primary_role_id ?? '');
        const scopeType = String(user.access_scope_type || 'global');

        setEditModal({
            open: true,
            user,
            name: String(user.name ?? ''),
            role_id: roleId,
            access_scope_type: scopeType,
            access_scope_region: scopeType === 'regional' ? String(user.access_scope_region || '') : '',
            access_scope_branch_id: scopeType === 'branch' ? String(user.access_scope_branch_id || '') : '',
            branch_search: '',
            status: 'idle',
            error: null,
        });
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
            access_scope_branch_id: editModal.access_scope_type === 'branch' ? Number(editModal.access_scope_branch_id) : null,
        };

        setEditModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safePut(`/api/system-users/${editModal.user.id}`, payload);

        if (!res.ok) {
            setEditModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        setEditModal((prev) => ({ ...prev, open: false, user: null, status: 'idle', error: null }));
        await refreshDirectory();
    };

    const confirmAction = async () => {
        if (!confirmModal.user || confirmModal.status === 'submitting') return;

        setConfirmModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const url = confirmModal.mode === 'activate'
            ? `/api/system-users/${confirmModal.user.id}/activate`
            : `/api/system-users/${confirmModal.user.id}/deactivate`;

        const res = await safePost(url, {});
        if (!res.ok) {
            setConfirmModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        setConfirmModal({ open: false, mode: 'deactivate', user: null, status: 'idle', error: null });
        await refreshDirectory();
    };

    const filteredBranchesForEdit = useMemo(() => {
        const query = String(editModal.branch_search || '').toLowerCase().trim();
        if (!query) return branches.data;
        return branches.data.filter(b => String(b.name).toLowerCase().includes(query));
    }, [branches.data, editModal.branch_search]);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <UserEditModal
                open={editModal.open}
                onClose={() => setEditModal(prev => ({ ...prev, open: false }))}
                onSave={saveEdit}
                user={editModal.user}
                name={editModal.name}
                setName={(val) => setEditModal(prev => ({ ...prev, name: val }))}
                roleId={editModal.role_id}
                setRoleId={(val) => setEditModal(prev => ({ ...prev, role_id: val }))}
                roles={roles.data}
                scopeType={editModal.access_scope_type}
                setScopeType={(val) => setEditModal(prev => ({ ...prev, access_scope_type: val }))}
                region={editModal.access_scope_region}
                setRegion={(val) => setEditModal(prev => ({ ...prev, access_scope_region: val }))}
                branchId={editModal.access_scope_branch_id}
                setBranchId={(val) => setEditModal(prev => ({ ...prev, access_scope_branch_id: val }))}
                branchSearch={editModal.branch_search}
                setBranchSearch={(val) => setEditModal(prev => ({ ...prev, branch_search: val }))}
                branches={branches.data}
                branchesStatus={branches.status}
                filteredBranches={filteredBranchesForEdit}
                status={editModal.status}
                error={editModal.error}
            />

            <UserConfirmModal
                open={confirmModal.open}
                mode={confirmModal.mode}
                user={confirmModal.user}
                onClose={() => setConfirmModal({ open: false, mode: 'deactivate', user: null, status: 'idle', error: null })}
                onConfirm={confirmAction}
                status={confirmModal.status}
                error={confirmModal.error}
            />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[#0a1f43]">User Directory</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Manage administrative access and system-level permissions across the infrastructure.</p>
                </div>

                <button
                    type="button"
                    onClick={() => navigate('/system-users/new')}
                    className="inline-flex items-center px-5 py-2.5 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded-xl font-black text-sm shadow-xl shadow-[#0a1f43]/20 transition-all hover:-translate-y-0.5"
                >
                    <Icon name="userPlus" className="h-5 w-5 mr-2" />
                    Provision New Admin
                </button>
            </div>

            <div className="flex flex-col gap-6">
                <div className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden min-h-[500px] flex flex-col">
                    <UserFilters
                        search={filters.search}
                        onSearchChange={(val) => setFilters(prev => ({ ...prev, search: val, page: 1 }))}
                        roleId={filters.role_id}
                        onRoleChange={(val) => setFilters(prev => ({ ...prev, role_id: val, page: 1 }))}
                        roles={roles.data}
                        totalText={directory.status === 'success' ? metaText : 'Loading...'}
                    />

                    <UserTable
                        users={directory.data}
                        status={directory.status}
                        meta={directory.meta}
                        onEdit={openEdit}
                        onActivate={(u) => setConfirmModal({ open: true, mode: 'activate', user: u, status: 'idle', error: null })}
                        onDeactivate={(u) => setConfirmModal({ open: true, mode: 'deactivate', user: u, status: 'idle', error: null })}
                        onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
                        pages={pages}
                    />
                </div>

                <UserStatsCards />
            </div>
        </div>
    );
}
