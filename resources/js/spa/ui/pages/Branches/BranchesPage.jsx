import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { safeDelete, safeGet, safePost, safePut } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { BranchFilters } from './components/BranchFilters.jsx';
import { BranchList } from './components/BranchList.jsx';
import { BranchStats } from './components/BranchStats.jsx';
import { CreateBranchModal, EditBranchModal } from './modals/BranchFormModal.jsx';
import { DeleteBranchModal } from './modals/DeleteBranchModal.jsx';

const DEFAULT_CREATE_PAYLOAD = {
    name: '',
    address_line: '',
    city: '',
    state: '',
    manager_employee_id: '',
    latitude: '',
    longitude: '',
    radius_meters: '100',
};

export function BranchesPage() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [radiusMin, setRadiusMin] = useState('');
    const [radiusMax, setRadiusMax] = useState('');

    const [showCreate, setShowCreate] = useState(false);
    const [createState, setCreateState] = useState({ status: 'idle', error: null });
    const [createPayload, setCreatePayload] = useState(DEFAULT_CREATE_PAYLOAD);

    const [mapBranches, setMapBranches] = useState([]);
    const [mapExpanded, setMapExpanded] = useState(false);
    const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });

    const [rowMenuOpenFor, setRowMenuOpenFor] = useState(null);
    const [editBranch, setEditBranch] = useState(null);
    const [editState, setEditState] = useState({ status: 'idle', error: null });
    const [editPayload, setEditPayload] = useState(DEFAULT_CREATE_PAYLOAD);
    const [deleteBranch, setDeleteBranch] = useState(null);
    const [deleteState, setDeleteState] = useState({ status: 'idle', error: null });

    const [selectedBranchId, setSelectedBranchId] = useState(null);

    const [managerSearch, setManagerSearch] = useState('');
    const [managerResults, setManagerResults] = useState([]);
    const [managerSearchState, setManagerSearchState] = useState({ status: 'idle', error: null });

    const fetchAllBranches = useCallback(async () => {
        const res = await safeGet('/api/branches');
        setMapBranches(res.ok && Array.isArray(res.data?.data) ? res.data.data : []);
    }, []);

    const fetchPage = useCallback(async () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', '6');
        if (search.trim()) params.set('search', search.trim());
        if (sortBy) params.set('sort', sortBy);
        if (radiusMin.trim()) params.set('radius_min', radiusMin.trim());
        if (radiusMax.trim()) params.set('radius_max', radiusMax.trim());

        const res = await safeGet(`/api/branches?${params.toString()}`);
        if (!res.ok) {
            setState({ status: 'error', data: null, error: res.error });
            return;
        }
        setState({ status: 'success', data: res.data, error: null });
    }, [page, radiusMax, radiusMin, search, sortBy]);

    useEffect(() => {
        fetchPage();
    }, [fetchPage]);

    useEffect(() => {
        fetchAllBranches();
    }, [fetchAllBranches]);

    const branches = useMemo(() => state.data?.data ?? [], [state.data]);
    const meta = useMemo(() => state.data?.meta ?? { current_page: 1, last_page: 1, total: 0 }, [state.data]);

    const searchEmployees = async (q) => {
        const query = String(q ?? '').trim();
        if (query.length < 2) {
            setManagerResults([]);
            return;
        }
        setManagerSearchState({ status: 'loading', error: null });
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('per_page', '10');
        params.set('sort', 'name');
        params.set('search', query);

        const res = await safeGet(`/api/employees?${params.toString()}`);
        if (!res.ok) {
            setManagerSearchState({ status: 'error', error: res.error });
            setManagerResults([]);
            return;
        }
        setManagerResults(Array.isArray(res.data?.data) ? res.data.data : []);
        setManagerSearchState({ status: 'success', error: null });
    };

    const handleSelectBranch = (branch) => {
        setSelectedBranchId(branch.id);
        const lat = Number(branch.latitude);
        const lng = Number(branch.longitude);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            setMapCenter({ lat, lng });
        }
    };

    const openEdit = (branch) => {
        setRowMenuOpenFor(null);
        setEditBranch(branch);
        setEditState({ status: 'idle', error: null });
        setEditPayload({
            name: String(branch?.name ?? ''),
            address_line: String(branch?.address_line ?? ''),
            city: String(branch?.city ?? ''),
            state: String(branch?.state ?? ''),
            manager_employee_id: branch?.manager_employee_id ? String(branch.manager_employee_id) : '',
            latitude: String(branch?.latitude ?? ''),
            longitude: String(branch?.longitude ?? ''),
            radius_meters: String(branch?.radius_meters ?? ''),
        });
        setManagerSearch(branch?.manager_name || '');
        setManagerResults([]);
    };

    const submitCreate = async () => {
        if (createState.status === 'submitting') return;
        setCreateState({ status: 'submitting', error: null });
        const res = await safePost('/api/branches', {
            ...createPayload,
            manager_employee_id: createPayload.manager_employee_id ? Number(createPayload.manager_employee_id) : null,
            latitude: Number(createPayload.latitude),
            longitude: Number(createPayload.longitude),
            radius_meters: Number(createPayload.radius_meters),
        });
        if (!res.ok) {
            setCreateState({ status: 'error', error: res.error });
            return;
        }
        setCreateState({ status: 'idle', error: null });
        setShowCreate(false);
        setCreatePayload(DEFAULT_CREATE_PAYLOAD);
        setPage(1);
        fetchPage();
        fetchAllBranches();
    };

    const submitEdit = async () => {
        if (!editBranch || editState.status === 'submitting') return;
        setEditState({ status: 'submitting', error: null });
        const res = await safePut(`/api/branches/${editBranch.id}`, {
            ...editPayload,
            manager_employee_id: editPayload.manager_employee_id ? Number(editPayload.manager_employee_id) : null,
            latitude: Number(editPayload.latitude),
            longitude: Number(editPayload.longitude),
            radius_meters: Number(editPayload.radius_meters),
        });
        if (!res.ok) {
            setEditState({ status: 'error', error: res.error });
            return;
        }
        setEditState({ status: 'idle', error: null });
        setEditBranch(null);
        fetchPage();
        fetchAllBranches();
    };

    const confirmDelete = async () => {
        if (!deleteBranch || deleteState.status === 'submitting') return;
        setDeleteState({ status: 'submitting', error: null });
        const res = await safeDelete(`/api/branches/${deleteBranch.id}`);
        if (!res.ok) {
            setDeleteState({ status: 'error', error: res.error });
            return;
        }
        setDeleteState({ status: 'idle', error: null });
        setDeleteBranch(null);
        setPage(1);
        fetchPage();
        fetchAllBranches();
    };

    const handleExport = () => {
        const payload = { exported_at: new Date().toISOString(), branches: branches };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'branches-export.json';
        document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4 h-full flex flex-col">
            <BranchFilters
                search={search}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                radiusMin={radiusMin}
                onRadiusMinChange={(v) => { setRadiusMin(v); setPage(1); }}
                radiusMax={radiusMax}
                onRadiusMaxChange={(v) => { setRadiusMax(v); setPage(1); }}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
                onReset={() => { setRadiusMin(''); setRadiusMax(''); setPage(1); }}
                onExport={handleExport}
            />

            <div className="flex justify-end -mt-2">
                <button
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0a1f43] hover:bg-[#0a1f43]/90 rounded-lg shadow-sm transition-colors"
                    onClick={() => {
                        setShowCreate(true);
                        setCreatePayload(DEFAULT_CREATE_PAYLOAD);
                        setManagerSearch('');
                        setManagerResults([]);
                    }}
                >
                    <Icon name="plus" className="h-4 w-4" />
                    Add New Branch
                </button>
            </div>

            {showCreate && (
                <CreateBranchModal
                    isOpen={showCreate}
                    onClose={() => setShowCreate(false)}
                    state={createState}
                    payload={createPayload}
                    onChange={(f, v) => setCreatePayload(p => ({ ...p, [f]: v }))}
                    onSubmit={submitCreate}
                    managerSearch={managerSearch}
                    onManagerSearchChange={(v) => { setManagerSearch(v); searchEmployees(v); }}
                    managerResults={managerResults}
                    onSelectManager={(emp) => {
                        setCreatePayload(p => ({ ...p, manager_employee_id: String(emp.id) }));
                        setManagerSearch([emp.employee_code, emp.full_name || emp.name].filter(Boolean).join(' - '));
                        setManagerResults([]);
                    }}
                    mapBranches={mapBranches}
                />
            )}

            {editBranch && (
                <EditBranchModal
                    isOpen={!!editBranch}
                    onClose={() => setEditBranch(null)}
                    state={editState}
                    payload={editPayload}
                    onChange={(f, v) => setEditPayload(p => ({ ...p, [f]: v }))}
                    onSubmit={submitEdit}
                    managerSearch={managerSearch}
                    onManagerSearchChange={(v) => { setManagerSearch(v); searchEmployees(v); }}
                    managerResults={managerResults}
                    onSelectManager={(emp) => {
                        setEditPayload(p => ({ ...p, manager_employee_id: String(emp.id) }));
                        setManagerSearch([emp.employee_code, emp.full_name || emp.name].filter(Boolean).join(' - '));
                        setManagerResults([]);
                    }}
                    mapBranches={mapBranches}
                />
            )}

            {deleteBranch && (
                <DeleteBranchModal
                    branch={deleteBranch}
                    state={deleteState}
                    onClose={() => setDeleteBranch(null)}
                    onConfirm={confirmDelete}
                />
            )}

            {mapExpanded && (
                <div className="fixed inset-0 z-50 bg-black/40 p-4">
                    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4">
                            <div className="text-base font-bold text-slate-800">Global Distribution</div>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setMapExpanded(false)}>✕</button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">
                            <BranchStats
                                mapBranches={mapBranches}
                                mapCenter={mapCenter}
                                onMapCenterChange={setMapCenter}
                                onExpandMap={() => { }}
                            />
                        </div>
                    </div>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
                <BranchList
                    branches={branches}
                    meta={meta}
                    status={state.status}
                    sortBy={sortBy}
                    onSortChange={setSortBy}
                    onSelect={handleSelectBranch}
                    selectedBranchId={selectedBranchId}
                    onEdit={openEdit}
                    onDelete={(b) => { setDeleteBranch(b); setDeleteState({ status: 'idle', error: null }); }}
                    onPageChange={setPage}
                    rowMenuOpenFor={rowMenuOpenFor}
                    setRowMenuOpenFor={setRowMenuOpenFor}
                />

                <BranchStats
                    mapBranches={mapBranches}
                    mapCenter={mapCenter}
                    onMapCenterChange={setMapCenter}
                    onExpandMap={() => setMapExpanded(true)}
                />
            </div>
        </div>
    );
}

export const SuperAdminBranchesPage = BranchesPage;
