import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { safeDelete, safeGet, safePost, safePut } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { MapPicker } from '../../shared/MapPicker.jsx';

function StatusBadge({ status, percentage }) {
    const configs = {
        compliant: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
        review: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
        critical: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
    };
    const config = configs[status] || configs.compliant;

    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.dot} ${status === 'critical' ? 'animate-pulse' : ''}`} />
            <span className={`${config.text} font-medium capitalize`}>
                {status === 'compliant' ? 'Compliant' : status === 'review' ? 'Review' : 'Critical'} ({percentage}%)
            </span>
        </div>
    );
}

function complianceFromDevices(activeDevices, totalDevices) {
    const active = Number.isFinite(activeDevices) ? activeDevices : 0;
    const total = Number.isFinite(totalDevices) ? totalDevices : 0;

    if (total <= 0) {
        return { status: 'review', percentage: 0 };
    }

    const pct = Math.max(0, Math.min(100, Math.round((active / total) * 100)));
    const status = pct >= 95 ? 'compliant' : pct >= 80 ? 'review' : 'critical';

    return { status, percentage: pct };
}

function DevicesBadge({ active, total }) {
    const ratio = active / total;
    const isWarning = ratio < 0.8;
    const isCritical = ratio < 0.72;

    const bgClass = isCritical
        ? 'bg-red-50 text-red-700 border-red-100'
        : isWarning
          ? 'bg-amber-50 text-amber-700 border-amber-100'
          : 'bg-slate-100 text-slate-800';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bgClass}`}>
            {active} / {total}
        </span>
    );
}

function Avatar({ initials }) {
    return (
        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
            {initials}
        </div>
    );
}

function BranchAvatar({ code, color }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        teal: 'bg-teal-100 text-teal-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
        cyan: 'bg-cyan-100 text-cyan-600',
    };

    const cls = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${cls}`}>
            {code}
        </div>
    );
}

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
    const [createPayload, setCreatePayload] = useState({
        name: '',
        address_line: '',
        city: '',
        state: '',
        manager_employee_id: '',
        latitude: '',
        longitude: '',
        radius_meters: '100',
    });

    const [mapBranches, setMapBranches] = useState([]);
    const [mapExpanded, setMapExpanded] = useState(false);

    const [rowMenuOpenFor, setRowMenuOpenFor] = useState(null);
    const [editBranch, setEditBranch] = useState(null);
    const [editState, setEditState] = useState({ status: 'idle', error: null });
    const [editPayload, setEditPayload] = useState({
        name: '',
        address_line: '',
        city: '',
        state: '',
        manager_employee_id: '',
        latitude: '',
        longitude: '',
        radius_meters: '',
    });
    const [deleteBranch, setDeleteBranch] = useState(null);
    const [deleteState, setDeleteState] = useState({ status: 'idle', error: null });

    const [selectedBranchId, setSelectedBranchId] = useState(null);
    const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 });

    const [managerSearchCreate, setManagerSearchCreate] = useState('');
    const [managerResultsCreate, setManagerResultsCreate] = useState([]);
    const [managerSearchStateCreate, setManagerSearchStateCreate] = useState({ status: 'idle', error: null });

    const [managerSearchEdit, setManagerSearchEdit] = useState('');
    const [managerResultsEdit, setManagerResultsEdit] = useState([]);
    const [managerSearchStateEdit, setManagerSearchStateEdit] = useState({ status: 'idle', error: null });

    const fetchAllBranches = useCallback(async () => {
        const res = await safeGet('/api/branches');
        setMapBranches(res.ok && Array.isArray(res.data?.data) ? res.data.data : []);
    }, []);

    const searchEmployees = useCallback(async (q, mode) => {
        const query = String(q ?? '').trim();

        if (query.length < 2) {
            if (mode === 'edit') {
                setManagerResultsEdit([]);
            } else {
                setManagerResultsCreate([]);
            }
            return;
        }

        if (mode === 'edit') {
            setManagerSearchStateEdit({ status: 'loading', error: null });
        } else {
            setManagerSearchStateCreate({ status: 'loading', error: null });
        }

        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('per_page', '10');
        params.set('sort', 'name');
        params.set('search', query);

        const res = await safeGet(`/api/employees?${params.toString()}`);

        if (!res.ok) {
            if (mode === 'edit') {
                setManagerSearchStateEdit({ status: 'error', error: res.error });
                setManagerResultsEdit([]);
            } else {
                setManagerSearchStateCreate({ status: 'error', error: res.error });
                setManagerResultsCreate([]);
            }
            return;
        }

        const list = Array.isArray(res.data?.data) ? res.data.data : [];
        if (mode === 'edit') {
            setManagerResultsEdit(list);
            setManagerSearchStateEdit({ status: 'success', error: null });
        } else {
            setManagerResultsCreate(list);
            setManagerSearchStateCreate({ status: 'success', error: null });
        }
    }, []);

    const selectManager = (employee, mode) => {
        const id = employee?.id;
        const code = employee?.employee_code ?? '';
        const name = employee?.full_name ?? employee?.name ?? '';
        const label = [code, name].filter(Boolean).join(' - ');

        if (!id) {
            return;
        }

        if (mode === 'edit') {
            setEditPayload((p) => ({ ...p, manager_employee_id: String(id) }));
            setManagerSearchEdit(label);
            setManagerResultsEdit([]);
        } else {
            setCreatePayload((p) => ({ ...p, manager_employee_id: String(id) }));
            setManagerSearchCreate(label);
            setManagerResultsCreate([]);
        }
    };

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
        let active = true;

        setState({ status: 'loading', data: null, error: null });

        (async () => {
            await fetchPage();

            if (!active) {
                return;
            }
        })();

        return () => {
            active = false;
        };
    }, [fetchPage]);

    useEffect(() => {
        let active = true;

        (async () => {
            await fetchAllBranches();

            if (!active) {
                return;
            }
        })();

        return () => {
            active = false;
        };
    }, [fetchAllBranches]);

    const branches = useMemo(() => state.data?.data ?? [], [state.data]);
    const meta = useMemo(() => state.data?.meta ?? { current_page: 1, last_page: 1, total: 0 }, [state.data]);

    const mapPins = useMemo(() => {
        const pins = [];

        for (const b of mapBranches) {
            const lat = Number(b.latitude);
            const lng = Number(b.longitude);

            if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
                continue;
            }

            const leftPct = ((lng + 180) / 360) * 100;
            const topPct = ((90 - lat) / 180) * 100;

            if (leftPct < 0 || leftPct > 100 || topPct < 0 || topPct > 100) {
                continue;
            }

            const activeDevices = Number(b.active_devices ?? 0);
            const totalDevices = Number(b.total_devices ?? 0);
            const compliance = complianceFromDevices(activeDevices, totalDevices);

            pins.push({
                id: b.id,
                name: b.name,
                leftPct,
                topPct,
                activeDevices,
                totalDevices,
                compliance,
            });
        }

        return pins;
    }, [mapBranches]);

    const handleExport = () => {
        const payload = {
            exported_at: new Date().toISOString(),
            branches: branches,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'branches-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    const canSubmitCreate =
        createPayload.name.trim() !== '' &&
        createPayload.latitude.trim() !== '' &&
        createPayload.longitude.trim() !== '' &&
        createPayload.radius_meters.trim() !== '';

    const submitCreate = async () => {
        if (!canSubmitCreate || createState.status === 'submitting') {
            return;
        }

        setCreateState({ status: 'submitting', error: null });

        const payload = {
            name: createPayload.name.trim(),
            address_line: createPayload.address_line.trim() || null,
            city: createPayload.city.trim() || null,
            state: createPayload.state.trim() || null,
            manager_employee_id: createPayload.manager_employee_id ? Number(createPayload.manager_employee_id) : null,
            latitude: Number(createPayload.latitude),
            longitude: Number(createPayload.longitude),
            radius_meters: Number(createPayload.radius_meters),
        };

        const res = await safePost('/api/branches', payload);

        if (!res.ok) {
            setCreateState({ status: 'error', error: res.error });
            return;
        }

        setCreateState({ status: 'idle', error: null });
        setShowCreate(false);
        setCreatePayload({ name: '', address_line: '', city: '', state: '', manager_employee_id: '', latitude: '', longitude: '', radius_meters: '100' });
        setPage(1);

        await fetchPage();
        await fetchAllBranches();
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

        setManagerSearchEdit(branch?.manager_name || '');
        setManagerResultsEdit([]);
    };

    const submitEdit = async () => {
        if (!editBranch || editState.status === 'submitting') {
            return;
        }

        setEditState({ status: 'submitting', error: null });

        const payload = {
            name: editPayload.name.trim(),
            address_line: editPayload.address_line.trim() || null,
            city: editPayload.city.trim() || null,
            state: editPayload.state.trim() || null,
            manager_employee_id: editPayload.manager_employee_id ? Number(editPayload.manager_employee_id) : null,
            latitude: Number(editPayload.latitude),
            longitude: Number(editPayload.longitude),
            radius_meters: Number(editPayload.radius_meters),
        };

        const res = await safePut(`/api/branches/${editBranch.id}`, payload);

        if (!res.ok) {
            setEditState({ status: 'error', error: res.error });
            return;
        }

        setEditState({ status: 'idle', error: null });
        setEditBranch(null);
        await fetchPage();
        await fetchAllBranches();
    };

    const openDelete = (branch) => {
        setRowMenuOpenFor(null);
        setDeleteBranch(branch);
        setDeleteState({ status: 'idle', error: null });
    };

    const confirmDelete = async () => {
        if (!deleteBranch || deleteState.status === 'submitting') {
            return;
        }

        setDeleteState({ status: 'submitting', error: null });

        const res = await safeDelete(`/api/branches/${deleteBranch.id}`);

        if (!res.ok) {
            setDeleteState({ status: 'error', error: res.error });
            return;
        }

        setDeleteState({ status: 'idle', error: null });
        setDeleteBranch(null);
        setPage(1);
        await fetchPage();
        await fetchAllBranches();
    };

    const MapPanel = (
        <div className="lg:w-1/3 bg-white rounded-lg border border-slate-200 shadow-soft flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="globe" className="h-5 w-5 text-[#0a1f43]" />
                    Global Distribution
                </h3>
                <button
                    type="button"
                    className="text-xs text-[#0a1f43] font-medium hover:underline"
                    onClick={() => setMapExpanded(true)}
                >
                    Expand Map
                </button>
            </div>

            <div className="p-4">
                <MapPicker
                    latitude={mapCenter.lat}
                    longitude={mapCenter.lng}
                    radiusMeters={100}
                    onChange={(lat, lng) => setMapCenter({ lat, lng })}
                    markers={mapBranches.map((b) => ({
                        id: b.id,
                        latitude: b.latitude,
                        longitude: b.longitude,
                        name: b.name,
                        address: [b.address_line, b.city].filter(Boolean).join(', '),
                    }))}
                    height="360px"
                    enableSearch={true}
                />
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200">
                <div className="p-4 text-center hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-500">Avg Compliance</p>
                    <p className="text-lg font-bold text-slate-800">
                        {mapBranches.length === 0
                            ? '—'
                            : (() => {
                                const pins = mapBranches.map((b) => complianceFromDevices(b.active_devices || 0, b.total_devices || 0));
                                return `${Math.round(pins.reduce((s, p) => s + p.percentage, 0) / pins.length)}%`;
                            })()}
                    </p>
                </div>
                <div className="p-4 text-center hover:bg-slate-50 transition-colors">
                    <p className="text-xs text-slate-500">Total Devices</p>
                    <p className="text-lg font-bold text-slate-800">
                        {mapBranches.reduce((s, b) => s + (Number(b.total_devices) || 0), 0)}
                    </p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="space-y-4 h-full flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-soft shrink-0">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Icon name="search" className="h-5 w-5" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search branch, city, or manager..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        onClick={() => setShowFilters((v) => !v)}
                    >
                        <Icon name="slidersHorizontal" className="h-4 w-4" />
                        Filters
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Icon name="download" className="h-4 w-4" />
                        Export
                    </button>
                </div>
                <button
                    type="button"
                    className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#0a1f43] hover:bg-[#0a1f43]/90 rounded-lg shadow-sm transition-colors w-full sm:w-auto"
                    onClick={() => setShowCreate(true)}
                >
                    <Icon name="plus" className="h-4 w-4" />
                    Add New Branch
                </button>
            </div>

            {showFilters ? (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-soft">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Radius min (m)</label>
                            <input
                                className="mt-1 w-40 rounded border-slate-200 bg-white text-sm"
                                value={radiusMin}
                                onChange={(e) => {
                                    setRadiusMin(e.target.value);
                                    setPage(1);
                                }}
                                inputMode="numeric"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Radius max (m)</label>
                            <input
                                className="mt-1 w-40 rounded border-slate-200 bg-white text-sm"
                                value={radiusMax}
                                onChange={(e) => {
                                    setRadiusMax(e.target.value);
                                    setPage(1);
                                }}
                                inputMode="numeric"
                            />
                        </div>
                        <button
                            type="button"
                            className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            onClick={() => {
                                setRadiusMin('');
                                setRadiusMax('');
                                setPage(1);
                            }}
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            className="ml-auto rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                            onClick={() => setShowFilters(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            ) : null}

            {editBranch ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                            <h3 className="text-base font-bold text-slate-800">Edit Branch</h3>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setEditBranch(null)}>
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 p-4 overflow-auto flex-1">
                            {editState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to update branch.</div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Name</label>
                                <input
                                    className="mt-1 w-full rounded border-slate-200"
                                    value={editPayload.name}
                                    onChange={(e) => setEditPayload((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Address</label>
                                <input
                                    className="mt-1 w-full rounded border-slate-200"
                                    value={editPayload.address_line}
                                    onChange={(e) => setEditPayload((p) => ({ ...p, address_line: e.target.value }))}
                                    placeholder="Street address"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">City</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={editPayload.city}
                                        onChange={(e) => setEditPayload((p) => ({ ...p, city: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">State</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={editPayload.state}
                                        onChange={(e) => setEditPayload((p) => ({ ...p, state: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Branch Manager</label>
                                <div className="relative mt-1">
                                    <input
                                        className="w-full rounded border-slate-200"
                                        value={managerSearchEdit}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setManagerSearchEdit(v);
                                            searchEmployees(v, 'edit');
                                        }}
                                        placeholder="Search by employee code or name..."
                                    />
                                    {managerResultsEdit.length > 0 ? (
                                        <div className="absolute z-30 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto">
                                            {managerResultsEdit.map((emp) => (
                                                <button
                                                    type="button"
                                                    key={emp.id}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                                    onClick={() => selectManager(emp, 'edit')}
                                                >
                                                    <div className="font-medium text-slate-800">
                                                        {emp.employee_code ? `${emp.employee_code} - ` : ''}{emp.full_name || '—'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">DB ID: {emp.id}</div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    Selected manager DB ID: {editPayload.manager_employee_id || '—'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Latitude</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={editPayload.latitude}
                                        onChange={(e) => setEditPayload((p) => ({ ...p, latitude: e.target.value }))}
                                        inputMode="decimal"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Longitude</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={editPayload.longitude}
                                        onChange={(e) => setEditPayload((p) => ({ ...p, longitude: e.target.value }))}
                                        inputMode="decimal"
                                    />
                                </div>
                            </div>
                            <MapPicker
                                latitude={editPayload.latitude}
                                longitude={editPayload.longitude}
                                radiusMeters={Number(editPayload.radius_meters) || 100}
                                onChange={(lat, lng) => setEditPayload((p) => ({ ...p, latitude: String(lat), longitude: String(lng) }))}
                                markers={mapBranches.map((b) => ({ id: b.id, latitude: b.latitude, longitude: b.longitude, name: b.name, address: [b.address_line, b.city].filter(Boolean).join(', ') }))}
                                height="240px"
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Radius (meters)</label>
                                <input
                                    className="mt-1 w-full rounded border-slate-200"
                                    value={editPayload.radius_meters}
                                    onChange={(e) => setEditPayload((p) => ({ ...p, radius_meters: e.target.value }))}
                                    inputMode="numeric"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setEditBranch(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                disabled={editState.status === 'submitting'}
                                onClick={submitEdit}
                            >
                                {editState.status === 'submitting' ? 'Saving…' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {deleteBranch ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                        <div className="border-b border-slate-200 p-4">
                            <h3 className="text-base font-bold text-slate-800">Delete Branch</h3>
                            <p className="mt-1 text-sm text-slate-600">This action cannot be undone.</p>
                        </div>

                        <div className="space-y-3 p-4">
                            {deleteState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to delete branch.</div>
                            ) : null}
                            <div className="text-sm text-slate-700">
                                Delete <span className="font-semibold">{deleteBranch.name}</span>?
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setDeleteBranch(null)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                disabled={deleteState.status === 'submitting'}
                                onClick={confirmDelete}
                            >
                                {deleteState.status === 'submitting' ? 'Deleting…' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {showCreate ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                            <h3 className="text-base font-bold text-slate-800">Add New Branch</h3>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setShowCreate(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4 p-4 overflow-auto flex-1">
                            {createState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to create branch.</div>
                            ) : null}

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Name</label>
                                <input
                                    className="mt-1 w-full rounded border-slate-200"
                                    value={createPayload.name}
                                    onChange={(e) => setCreatePayload((p) => ({ ...p, name: e.target.value }))}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Address</label>
                                <input
                                    className="mt-1 w-full rounded border-slate-200"
                                    value={createPayload.address_line}
                                    onChange={(e) => setCreatePayload((p) => ({ ...p, address_line: e.target.value }))}
                                    placeholder="Street address"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">City</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={createPayload.city}
                                        onChange={(e) => setCreatePayload((p) => ({ ...p, city: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">State</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={createPayload.state}
                                        onChange={(e) => setCreatePayload((p) => ({ ...p, state: e.target.value }))}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Branch Manager</label>
                                <div className="relative mt-1">
                                    <input
                                        className="w-full rounded border-slate-200"
                                        value={managerSearchCreate}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            setManagerSearchCreate(v);
                                            searchEmployees(v, 'create');
                                        }}
                                        placeholder="Search by employee code or name..."
                                    />
                                    {managerResultsCreate.length > 0 ? (
                                        <div className="absolute z-30 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto">
                                            {managerResultsCreate.map((emp) => (
                                                <button
                                                    type="button"
                                                    key={emp.id}
                                                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                                    onClick={() => selectManager(emp, 'create')}
                                                >
                                                    <div className="font-medium text-slate-800">
                                                        {emp.employee_code ? `${emp.employee_code} - ` : ''}{emp.full_name || '—'}
                                                    </div>
                                                    <div className="text-xs text-slate-500">DB ID: {emp.id}</div>
                                                </button>
                                            ))}
                                        </div>
                                    ) : null}
                                </div>
                                <div className="mt-1 text-xs text-slate-500">
                                    Selected manager DB ID: {createPayload.manager_employee_id || '—'}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Latitude</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={createPayload.latitude}
                                        onChange={(e) => setCreatePayload((p) => ({ ...p, latitude: e.target.value }))}
                                        inputMode="decimal"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Longitude</label>
                                    <input
                                        className="mt-1 w-full rounded border-slate-200"
                                        value={createPayload.longitude}
                                        onChange={(e) => setCreatePayload((p) => ({ ...p, longitude: e.target.value }))}
                                        inputMode="decimal"
                                    />
                                </div>
                            </div>
                            <MapPicker
                                latitude={createPayload.latitude}
                                longitude={createPayload.longitude}
                                radiusMeters={Number(createPayload.radius_meters) || 100}
                                onChange={(lat, lng) => setCreatePayload((p) => ({ ...p, latitude: String(lat), longitude: String(lng) }))}
                                markers={mapBranches.map((b) => ({ id: b.id, latitude: b.latitude, longitude: b.longitude, name: b.name, address: [b.address_line, b.city].filter(Boolean).join(', ') }))}
                                height="240px"
                            />
                            <div>
                                <label className="block text-sm font-medium text-slate-700">Radius (meters)</label>
                                <input
                                    className="mt-1 w-full rounded border-slate-200"
                                    value={createPayload.radius_meters}
                                    onChange={(e) => setCreatePayload((p) => ({ ...p, radius_meters: e.target.value }))}
                                    inputMode="numeric"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setShowCreate(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                disabled={!canSubmitCreate || createState.status === 'submitting'}
                                onClick={submitCreate}
                            >
                                {createState.status === 'submitting' ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {mapExpanded ? (
                <div className="fixed inset-0 z-50 bg-black/40 p-4">
                    <div className="mx-auto flex h-full max-w-6xl flex-col overflow-hidden rounded-lg bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4">
                            <div className="text-base font-bold text-slate-800">Global Distribution</div>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setMapExpanded(false)}>
                                ✕
                            </button>
                        </div>
                        <div className="flex-1 overflow-auto p-4">{MapPanel}</div>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-[500px]">
                <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-soft flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                        <div>
                            <h2 className="text-base font-bold text-slate-800">All Branches</h2>
                            <p className="text-xs text-slate-500 mt-0.5">{meta.total} active locations found</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-xs text-slate-500">Sort by:</span>
                            <select
                                className="text-xs border-none bg-slate-50 rounded py-1 pl-2 pr-6 text-slate-700 focus:ring-0 cursor-pointer font-medium"
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                            >
                                <option value="name">Name (A-Z)</option>
                                <option value="devices">Devices (High-Low)</option>
                                <option value="radius">Radius (High-Low)</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        {state.status === 'loading' ? (
                            <div className="p-8 text-center text-slate-500">Loading branches...</div>
                        ) : state.status === 'error' ? (
                            <div className="p-8 text-center text-red-600">Failed to load branches.</div>
                        ) : branches.length === 0 ? (
                            <div className="p-8 text-center text-slate-500">No branches found.</div>
                        ) : (
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 sticky top-0 z-10">
                                    <tr className="text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                                        <th className="px-6 py-3 whitespace-nowrap">Branch Name</th>
                                        <th className="px-6 py-3 whitespace-nowrap">Location</th>
                                        <th className="px-6 py-3 whitespace-nowrap">Manager</th>
                                        <th className="px-6 py-3 whitespace-nowrap text-center">Active Devices</th>
                                        <th className="px-6 py-3 whitespace-nowrap">Compliance Status</th>
                                        <th className="px-6 py-3 whitespace-nowrap text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-sm">
                                    {branches.map((branch) => (
                                        <tr
                                            key={branch.id}
                                            className={`hover:bg-slate-50 transition-colors group cursor-pointer ${
                                                selectedBranchId === branch.id ? 'bg-slate-50' : ''
                                            }`}
                                            onClick={() => {
                                                setSelectedBranchId(branch.id);
                                                const lat = Number(branch.latitude);
                                                const lng = Number(branch.longitude);
                                                if (Number.isFinite(lat) && Number.isFinite(lng)) {
                                                    setMapCenter({ lat, lng });
                                                }
                                            }}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <BranchAvatar code={branch.code || branch.name?.slice(0, 2).toUpperCase()} color={branch.color || 'blue'} />
                                                    <div>
                                                        <p className="font-medium text-slate-800">{branch.name}</p>
                                                        <p className="text-xs text-slate-500">ID: {`BR-${String(branch.id).padStart(3, '0')}`}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {[branch.address_line, branch.city, branch.state].filter(Boolean).join(', ') || '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <Avatar initials={branch.manager_name ? branch.manager_name.split(' ').map((n) => n[0]).join('').slice(0, 2) : '—'} />
                                                    <span className="text-slate-700">{branch.manager_name || '—'}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <DevicesBadge active={branch.active_devices || 0} total={branch.total_devices || 0} />
                                            </td>
                                            <td className="px-6 py-4">
                                                {(() => {
                                                    const compliance = complianceFromDevices(
                                                        Number(branch.active_devices ?? 0),
                                                        Number(branch.total_devices ?? 0),
                                                    );
                                                    return <StatusBadge status={compliance.status} percentage={compliance.percentage} />;
                                                })()}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="relative inline-block text-left">
                                                    <button
                                                        type="button"
                                                        className="text-slate-400 hover:text-[#0a1f43] transition-colors"
                                                        onClick={() => setRowMenuOpenFor((v) => (v === branch.id ? null : branch.id))}
                                                    >
                                                        <Icon name="more" className="h-5 w-5" />
                                                    </button>

                                                    {rowMenuOpenFor === branch.id ? (
                                                        <div
                                                            className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded border border-slate-200 bg-white shadow-lg"
                                                            onMouseLeave={() => setRowMenuOpenFor(null)}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                                onClick={() => openEdit(branch)}
                                                            >
                                                                Edit
                                                            </button>
                                                            <button
                                                                type="button"
                                                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                                                onClick={() => openDelete(branch)}
                                                            >
                                                                Delete
                                                            </button>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center mt-auto">
                        <span className="text-xs text-slate-500">
                            Showing {branches.length} of {meta.total} branches
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setPage((p) => Math.max(1, p - 1))}
                                disabled={meta.current_page <= 1}
                                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 font-medium"
                            >
                                Previous
                            </button>
                            <button
                                onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                                disabled={meta.current_page >= meta.last_page}
                                className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 font-medium"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                </div>

                {MapPanel}
            </div>
        </div>
    );
}

export const SuperAdminBranchesPage = BranchesPage;
