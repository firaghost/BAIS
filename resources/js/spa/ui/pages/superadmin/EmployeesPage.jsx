import React, { useEffect, useMemo, useState } from 'react';
import { api, safeDelete, safeGet, safePost, safePut } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';

function StatusBadge({ status }) {
    const configs = {
        active: { text: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
        on_leave: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
        suspended: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
    };

    const config = configs[status] || configs.active;
    const label = status === 'active' ? 'Active' : status === 'on_leave' ? 'On Leave' : 'Suspended';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-slate-200`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5`}></span>
            {label}
        </span>
    );
}

function DeviceStatus({ bound }) {
    return bound ? (
        <div className="flex items-center gap-1 text-green-600">
            <Icon name="checkCircle" className="h-4 w-4" />
            <span className="text-xs">Bound</span>
        </div>
    ) : (
        <div className="flex items-center gap-1 text-amber-600">
            <Icon name="alertCircle" className="h-4 w-4" />
            <span className="text-xs">Pending</span>
        </div>
    );
}

function Avatar({ src, initials }) {
    if (src) {
        return <img src={src} alt="" className="w-10 h-10 rounded-full object-cover" />;
    }
    return (
        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">
            {initials}
        </div>
    );
}

export function EmployeesPage() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('name');
    const [page, setPage] = useState(1);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('');
    const [departmentsState, setDepartmentsState] = useState({ status: 'idle', data: [], error: null });

    const [selectedIds, setSelectedIds] = useState(() => new Set());

    const [leaveCredits, setLeaveCredits] = useState({
        open: false,
        scope: 'selected',
        employeeId: null,
        year: new Date().getFullYear(),
        rows: [{ leaveType: 'annual', totalDays: '' }],
        current: { status: 'idle', data: [], error: null },
        status: 'idle',
        error: null,
    });

    const openLeaveCredits = ({ scope, employeeId }) => {
        setLeaveCredits((prev) => ({
            ...prev,
            open: true,
            scope,
            employeeId: employeeId ?? null,
            rows: [{ leaveType: 'annual', totalDays: '' }],
            current: { status: 'idle', data: [], error: null },
            status: 'idle',
            error: null,
        }));
    };

    const closeLeaveCredits = () => {
        setLeaveCredits((prev) => ({
            ...prev,
            open: false,
            status: 'idle',
            error: null,
        }));
    };

    const submitLeaveCredits = async () => {
        if (leaveCredits.status === 'submitting') {
            return;
        }

        const year = Number(leaveCredits.year);
        if (!Number.isFinite(year) || year < 2000 || year > 2100) {
            setLeaveCredits((prev) => ({ ...prev, error: 'Please enter a valid year.' }));
            return;
        }

        const rows = Array.isArray(leaveCredits.rows) ? leaveCredits.rows : [];
        if (rows.length === 0) {
            setLeaveCredits((prev) => ({ ...prev, error: 'Add at least one leave type.' }));
            return;
        }

        for (const row of rows) {
            const totalDays = Number(row.totalDays);
            if (!Number.isFinite(totalDays) || totalDays < 0 || totalDays > 365) {
                setLeaveCredits((prev) => ({ ...prev, error: 'Please enter valid leave days (0 - 365).' }));
                return;
            }
        }

        let employeeIds = [];
        if (leaveCredits.scope === 'single') {
            if (!leaveCredits.employeeId) {
                setLeaveCredits((prev) => ({ ...prev, error: 'Employee is required.' }));
                return;
            }
            employeeIds = [Number(leaveCredits.employeeId)];
        } else {
            employeeIds = Array.from(selectedIds).map((id) => Number(id));
        }

        employeeIds = employeeIds.filter((id) => Number.isFinite(id) && id > 0);
        if (employeeIds.length === 0) {
            setLeaveCredits((prev) => ({ ...prev, error: 'Select at least one employee.' }));
            return;
        }

        setLeaveCredits((prev) => ({ ...prev, status: 'submitting', error: null }));

        for (const row of rows) {
            const totalDays = Number(row.totalDays);

            const res = await safePost('/api/leaves/credits/bulk-set', {
                year,
                leave_type: row.leaveType,
                total_days: totalDays,
                apply_to_all: false,
                employee_ids: employeeIds,
            });

            if (!res.ok) {
                const msg = res.error?.message || res.error || 'Failed to update leave credits.';
                setLeaveCredits((prev) => ({ ...prev, status: 'error', error: msg }));
                return;
            }
        }

        setLeaveCredits((prev) => ({ ...prev, status: 'idle', open: false, error: null }));
    };

    useEffect(() => {
        if (!leaveCredits.open || leaveCredits.scope !== 'single' || !leaveCredits.employeeId) {
            return;
        }

        let active = true;
        setLeaveCredits((prev) => ({ ...prev, current: { status: 'loading', data: [], error: null } }));

        (async () => {
            const year = Number(leaveCredits.year);
            const res = await safeGet(`/api/leaves/credits/employee/${leaveCredits.employeeId}?year=${encodeURIComponent(String(year))}`);
            if (!active) return;

            if (!res.ok) {
                const msg = res.error?.message || res.error || 'Failed to load leave credits.';
                setLeaveCredits((prev) => ({ ...prev, current: { status: 'error', data: [], error: msg } }));
                return;
            }

            const rows = Array.isArray(res.data?.data) ? res.data.data : [];
            setLeaveCredits((prev) => ({ ...prev, current: { status: 'success', data: rows, error: null } }));
        })();

        return () => {
            active = false;
        };
    }, [leaveCredits.open, leaveCredits.scope, leaveCredits.employeeId, leaveCredits.year]);

    const [reloadKey, setReloadKey] = useState(0);

    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkState, setBulkState] = useState({ status: 'idle', error: null, result: null });
    const [bulkFile, setBulkFile] = useState(null);

    const [createOpen, setCreateOpen] = useState(false);
    const [createState, setCreateState] = useState({ status: 'idle', error: null });
    const [createPayload, setCreatePayload] = useState({
        first_name: '',
        middle_name: '',
        last_name: '',
        phone: '',
        email: '',
        job_title: '',
        department: '',
        hire_date: '',
        status: 'active',
    });

    const normalizeDate = (value) => {
        const s = String(value ?? '').trim();
        if (s === '') return '';
        return s.length >= 10 ? s.slice(0, 10) : s;
    };

    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteState, setDeleteState] = useState({ status: 'idle', error: null });
    const [deleteEmployee, setDeleteEmployee] = useState(null);

    const [editOpen, setEditOpen] = useState(false);
    const [editState, setEditState] = useState({ status: 'idle', error: null });
    const [editPayload, setEditPayload] = useState({
        id: null,
        first_name: '',
        middle_name: '',
        last_name: '',
        phone: '',
        email: '',
        job_title: '',
        department: '',
        hire_date: '',
        status: 'active',
    });

    useEffect(() => {
        if (!detailOpen || !selectedEmployee?.id) {
            return;
        }

        let active = true;
        const employeeId = selectedEmployee.id;

        (async () => {
            const res = await safeGet(`/api/employees/${employeeId}`);
            if (!active) return;

            if (!res.ok) {
                return;
            }

            setSelectedEmployee(res.data?.data ?? null);
        })();

        return () => {
            active = false;
        };
    }, [detailOpen, selectedEmployee?.id]);

    useEffect(() => {
        let active = true;
        setState({ status: 'loading', data: null, error: null });

        (async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('per_page', '8');
            if (search.trim()) params.set('search', search.trim());
            if (sortBy) params.set('sort', sortBy);
            if (department && department !== 'all') params.set('department', String(department));
            if (status && status !== 'all') params.set('status', String(status));

            const res = await safeGet(`/api/employees?${params.toString()}`);

            if (!active) return;

            if (!res.ok) {
                setState({ status: 'error', data: null, error: res.error });
                return;
            }

            setState({ status: 'success', data: res.data, error: null });

            // Select first employee by default if none selected
            if (!selectedEmployee && res.data?.data?.length > 0) {
                setSelectedEmployee(res.data.data[0]);
            }
        })();

        return () => {
            active = false;
        };
    }, [search, sortBy, page, reloadKey, department, status]);

    useEffect(() => {
        let active = true;
        setDepartmentsState((prev) => ({ ...prev, status: 'loading', error: null }));

        (async () => {
            const res = await safeGet('/api/departments?active_only=1');
            if (!active) return;

            if (!res.ok) {
                setDepartmentsState({ status: 'error', data: [], error: res.error });
                return;
            }

            const list = Array.isArray(res.data?.data)
                ? res.data.data
                      .map((d) => String(d?.name ?? '').trim())
                      .filter((x) => x !== '')
                : [];
            setDepartmentsState({ status: 'success', data: list, error: null });
        })();

        return () => {
            active = false;
        };
    }, []);

    const downloadBulkTemplate = async () => {
        setBulkState({ status: 'idle', error: null, result: null });

        try {
            const res = await api.get('/api/employees/bulk-template', {
                responseType: 'blob',
                params: { format: 'xls' },
            });

            const contentType = String(res.headers?.['content-type'] ?? '');
            const blob = res.data;

            if (contentType.includes('application/json')) {
                const text = await blob.text();
                setBulkState({ status: 'error', error: text, result: null });
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = contentType.includes('text/csv') ? 'employees-bulk-upload-template.csv' : 'employees-bulk-upload-template.xls';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            let message = 'Failed to download template.';

            if (data instanceof Blob) {
                try {
                    message = await data.text();
                } catch {
                    message = String(status ?? message);
                }
            }

            setBulkState({ status: 'error', error: { status, message }, result: null });
        }
    };

    const downloadUploadReadyCsv = async () => {
        setBulkState({ status: 'idle', error: null, result: null });

        try {
            const res = await api.get('/api/employees/bulk-template', {
                responseType: 'blob',
                params: { format: 'csv' },
            });

            const contentType = String(res.headers?.['content-type'] ?? '');
            const blob = res.data;

            if (contentType.includes('application/json')) {
                const text = await blob.text();
                setBulkState({ status: 'error', error: text, result: null });
                return;
            }

            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'employees-bulk-upload-template.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
        } catch (err) {
            const status = err?.response?.status;
            const data = err?.response?.data;
            let message = 'Failed to download CSV template.';

            if (data instanceof Blob) {
                try {
                    message = await data.text();
                } catch {
                    message = String(status ?? message);
                }
            }

            setBulkState({ status: 'error', error: { status, message }, result: null });
        }
    };

    const submitBulkUpload = async () => {
        if (!bulkFile || bulkState.status === 'submitting') {
            return;
        }

        setBulkState({ status: 'submitting', error: null, result: null });

        const form = new FormData();
        form.append('file', bulkFile);

        const res = await safePost('/api/employees/bulk-upload', form, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!res.ok) {
            setBulkState({ status: 'error', error: res.error, result: null });
            return;
        }

        setBulkState({ status: 'success', error: null, result: res.data });
        setBulkFile(null);
        setReloadKey((k) => k + 1);
    };

    const resetCreate = () => {
        setCreatePayload({
            first_name: '',
            middle_name: '',
            last_name: '',
            phone: '',
            email: '',
            job_title: '',
            department: '',
            hire_date: '',
            status: 'active',
        });
        setCreateState({ status: 'idle', error: null });
    };

    const openEdit = (emp) => {
        setEditState({ status: 'idle', error: null });
        setEditPayload({
            id: emp?.id ?? null,
            first_name: String(emp?.first_name ?? ''),
            middle_name: String(emp?.middle_name ?? ''),
            last_name: String(emp?.last_name ?? ''),
            phone: String(emp?.phone ?? ''),
            email: String(emp?.email ?? ''),
            job_title: String(emp?.job_title ?? ''),
            department: String(emp?.department ?? ''),
            hire_date: normalizeDate(emp?.hire_date ?? ''),
            status: String(emp?.status ?? 'active'),
        });
        setEditOpen(true);
    };

    const openDelete = (emp) => {
        setDeleteEmployee(emp);
        setDeleteState({ status: 'idle', error: null });
        setDeleteOpen(true);
    };

    const submitCreate = async () => {
        if (createState.status === 'submitting') {
            return;
        }

        if (!createPayload.first_name.trim() || !createPayload.last_name.trim() || !createPayload.hire_date) {
            setCreateState({ status: 'error', error: { message: 'First name, last name, and hire date are required.' } });
            return;
        }

        setCreateState({ status: 'submitting', error: null });

        const payload = {
            first_name: createPayload.first_name.trim(),
            middle_name: createPayload.middle_name.trim() || null,
            last_name: createPayload.last_name.trim(),
            phone: createPayload.phone.trim() || null,
            email: createPayload.email.trim() || null,
            job_title: createPayload.job_title.trim() || null,
            department: createPayload.department.trim() || null,
            hire_date: normalizeDate(createPayload.hire_date),
            status: createPayload.status,
        };

        const res = await safePost('/api/employees', payload);

        if (!res.ok) {
            setCreateState({ status: 'error', error: res.error });
            return;
        }

        setCreateState({ status: 'idle', error: null });
        setCreateOpen(false);
        resetCreate();
        setSelectedIds(new Set());
        setPage(1);
        setReloadKey((k) => k + 1);
    };

    const submitEdit = async () => {
        if (editState.status === 'submitting' || !editPayload.id) {
            return;
        }

        setEditState({ status: 'submitting', error: null });

        const payload = {
            first_name: editPayload.first_name.trim() || undefined,
            middle_name: editPayload.middle_name.trim() || null,
            last_name: editPayload.last_name.trim() || undefined,
            phone: editPayload.phone.trim() || null,
            email: editPayload.email.trim() || null,
            job_title: editPayload.job_title.trim() || null,
            department: editPayload.department.trim() || null,
            hire_date: normalizeDate(editPayload.hire_date) || undefined,
            status: editPayload.status || undefined,
        };

        const res = await safePut(`/api/employees/${editPayload.id}`, payload);

        if (!res.ok) {
            setEditState({ status: 'error', error: res.error });
            return;
        }

        setEditState({ status: 'idle', error: null });
        setEditOpen(false);
        setSelectedIds(new Set());
        setPage(1);
        setReloadKey((k) => k + 1);
    };

    const confirmDelete = async () => {
        if (!deleteEmployee || deleteState.status === 'submitting') {
            return;
        }

        setDeleteState({ status: 'submitting', error: null });
        const res = await safeDelete(`/api/employees/${deleteEmployee.id}`);

        if (!res.ok) {
            setDeleteState({ status: 'error', error: res.error });
            return;
        }

        setDeleteState({ status: 'idle', error: null });
        setDeleteOpen(false);
        setDeleteEmployee(null);
        setSelectedIds(new Set());
        setPage(1);
        setReloadKey((k) => k + 1);
    };

    const employees = useMemo(() => state.data?.data ?? [], [state.data]);
    const meta = useMemo(() => state.data?.meta ?? { current_page: 1, last_page: 1, total: 0 }, [state.data]);
    const departments = useMemo(() => (departmentsState.status === 'success' ? departmentsState.data : []), [departmentsState.data, departmentsState.status]);

    const filteredEmployees = useMemo(() => {
        return employees;
    }, [employees]);

    const allChecked = useMemo(() => {
        if (filteredEmployees.length === 0) {
            return false;
        }

        for (const emp of filteredEmployees) {
            if (!selectedIds.has(emp.id)) {
                return false;
            }
        }

        return true;
    }, [filteredEmployees, selectedIds]);

    const toggleAll = () => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            const shouldCheckAll = !allChecked;

            for (const emp of filteredEmployees) {
                if (shouldCheckAll) {
                    next.add(emp.id);
                } else {
                    next.delete(emp.id);
                }
            }

            return next;
        });
    };

    const toggleOne = (id) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const activeFilterChips = useMemo(() => {
        const chips = [];

        if (status) {
            const label =
                status === 'active'
                    ? 'Active'
                    : status === 'on_leave'
                      ? 'On Leave'
                      : status === 'probation'
                        ? 'Probation'
                        : status === 'suspended'
                          ? 'Suspended'
                          : status === 'inactive'
                            ? 'Inactive'
                            : status;
            chips.push({ key: 'status', label: `Status: ${label}` });
        }

        if (department) {
            chips.push({ key: 'department', label: `Department: ${department}` });
        }

        return chips;
    }, [status, department]);

    const clearAllFilters = () => {
        setDepartment('');
        setStatus('');
    };

    const handleExport = () => {
        const payload = {
            exported_at: new Date().toISOString(),
            employees: employees,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'employees-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {leaveCredits.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
                    <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
                        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                            <div>
                                <div className="text-sm font-semibold text-slate-900">Set Leave Days</div>
                                <div className="mt-1 text-xs text-slate-500">
                                    {leaveCredits.scope === 'single'
                                        ? 'Apply to this employee.'
                                        : `Apply to ${selectedIds.size} selected employee${selectedIds.size === 1 ? '' : 's'}.`}
                                </div>
                            </div>
                            <button
                                type="button"
                                className="rounded p-2 text-slate-500 hover:bg-slate-100"
                                onClick={closeLeaveCredits}
                                aria-label="Close"
                            >
                                <Icon name="close" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-3">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Year</label>
                                <input
                                    type="number"
                                    className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                                    value={leaveCredits.year}
                                    onChange={(e) => setLeaveCredits((prev) => ({ ...prev, year: e.target.value }))}
                                />
                            </div>

                            <div className="md:col-span-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Leave Types &amp; Days</label>
                                    <button
                                        type="button"
                                        className="text-xs font-semibold text-[#0a1f43] hover:underline"
                                        onClick={() =>
                                            setLeaveCredits((prev) => ({
                                                ...prev,
                                                rows: [...(Array.isArray(prev.rows) ? prev.rows : []), { leaveType: 'annual', totalDays: '' }],
                                            }))
                                        }
                                        disabled={leaveCredits.status === 'submitting'}
                                    >
                                        Add Type
                                    </button>
                                </div>

                                <div className="mt-2 space-y-2">
                                    {(Array.isArray(leaveCredits.rows) ? leaveCredits.rows : []).map((row, idx) => (
                                        <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                            <select
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                                                value={row.leaveType}
                                                onChange={(e) =>
                                                    setLeaveCredits((prev) => ({
                                                        ...prev,
                                                        rows: (Array.isArray(prev.rows) ? prev.rows : []).map((r, i) =>
                                                            i === idx ? { ...r, leaveType: e.target.value } : r,
                                                        ),
                                                    }))
                                                }
                                            >
                                                <option value="annual">Annual</option>
                                                <option value="sick">Sick</option>
                                                <option value="personal">Personal</option>
                                                <option value="other">Other</option>
                                            </select>

                                            <input
                                                type="number"
                                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                                                value={row.totalDays}
                                                onChange={(e) =>
                                                    setLeaveCredits((prev) => ({
                                                        ...prev,
                                                        rows: (Array.isArray(prev.rows) ? prev.rows : []).map((r, i) =>
                                                            i === idx ? { ...r, totalDays: e.target.value } : r,
                                                        ),
                                                    }))
                                                }
                                                placeholder="Total days"
                                            />

                                            <button
                                                type="button"
                                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                                onClick={() =>
                                                    setLeaveCredits((prev) => ({
                                                        ...prev,
                                                        rows: (Array.isArray(prev.rows) ? prev.rows : []).filter((_, i) => i !== idx),
                                                    }))
                                                }
                                                disabled={leaveCredits.status === 'submitting' || (leaveCredits.rows?.length ?? 0) <= 1}
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {leaveCredits.scope === 'single' ? (
                            <div className="px-5 pb-2">
                                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Credits (Year {leaveCredits.year})</div>
                                <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                    {leaveCredits.current.status === 'loading' ? (
                                        <div>Loading leave credits...</div>
                                    ) : leaveCredits.current.status === 'error' ? (
                                        <div className="text-red-700">{String(leaveCredits.current.error || 'Failed to load leave credits.')}</div>
                                    ) : (Array.isArray(leaveCredits.current.data) ? leaveCredits.current.data : []).length === 0 ? (
                                        <div>No leave credits configured for this year.</div>
                                    ) : (
                                        <div className="space-y-1">
                                            {(Array.isArray(leaveCredits.current.data) ? leaveCredits.current.data : []).map((c) => (
                                                <div key={`${c.leave_type}-${c.year}`} className="flex items-center justify-between">
                                                    <div className="font-medium text-slate-800">{String(c.leave_type)}</div>
                                                    <div className="text-slate-600">
                                                        {Number(c.used_days ?? 0)} / {Number(c.total_days ?? 0)} used
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : null}

                        {leaveCredits.error ? (
                            <div className="px-5 pb-2 text-sm font-medium text-red-700">{String(leaveCredits.error)}</div>
                        ) : null}

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                            <button
                                type="button"
                                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={closeLeaveCredits}
                                disabled={leaveCredits.status === 'submitting'}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded-lg bg-[#0a1f43] px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-[#0a1f43]/90 disabled:opacity-60"
                                onClick={submitLeaveCredits}
                                disabled={leaveCredits.status === 'submitting'}
                            >
                                {leaveCredits.status === 'submitting' ? 'Applying...' : 'Apply'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Employee Directory</h2>
                    <p className="text-slate-500 text-sm mt-1">Manage personnel records (Head Office).</p>
                </div>
                <div className="flex gap-3 w-full sm:w-auto">
                    <button
                        type="button"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium disabled:opacity-60"
                        onClick={() => openLeaveCredits({ scope: 'selected' })}
                        disabled={selectedIds.size === 0}
                        title={selectedIds.size === 0 ? 'Select employees first' : 'Set leave days for selected employees'}
                    >
                        <Icon name="event" className="h-4 w-4" />
                        Set Leave Days
                    </button>
                    <button
                        type="button"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded text-slate-600 hover:bg-slate-50 transition-colors shadow-sm text-sm font-medium"
                        onClick={() => setBulkOpen(true)}
                    >
                        <Icon name="upload" className="h-4 w-4" />
                        Bulk Upload
                    </button>
                    <button
                        type="button"
                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded shadow-soft transition-colors text-sm font-medium"
                        onClick={() => {
                            resetCreate();
                            setCreateOpen(true);
                        }}
                    >
                        <Icon name="userPlus" className="h-4 w-4" />
                        Add Employee
                    </button>
                </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-soft border border-slate-200">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <div className="relative lg:col-span-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                            <Icon name="search" className="h-4 w-4" />
                        </span>
                        <input
                            className="w-full pl-10 pr-4 py-2 rounded border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent text-sm text-slate-800 placeholder-slate-400"
                            placeholder="Search by name, ID or email..."
                            type="text"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div>
                        <select
                            className="w-full py-2 px-3 rounded border border-slate-200 bg-white text-sm text-slate-600 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                            value={department}
                            onChange={(e) => {
                                setDepartment(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Departments</option>
                            {departments.map((d) => (
                                <option key={d} value={d}>
                                    {d}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <select
                            className="w-full py-2 px-3 rounded border border-slate-200 bg-white text-sm text-slate-600 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                            value={status}
                            onChange={(e) => {
                                setStatus(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">All Statuses</option>
                            <option value="active">Active</option>
                            <option value="on_leave">On Leave</option>
                            <option value="probation">Probation</option>
                            <option value="suspended">Suspended</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                    <span className="text-xs font-medium text-slate-500 py-1">Active Filters:</span>
                    {activeFilterChips.length === 0 ? (
                        <span className="text-xs text-slate-400 py-1">None</span>
                    ) : (
                        activeFilterChips.map((chip) => (
                            <span
                                key={chip.key}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100"
                            >
                                {chip.label}
                            </span>
                        ))
                    )}
                    <button
                        type="button"
                        className="text-xs text-[#0a1f43] hover:underline ml-auto font-medium"
                        onClick={clearAllFilters}
                        disabled={activeFilterChips.length === 0}
                    >
                        Clear All
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden flex-1 flex flex-col">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                <th className="px-6 py-4 w-12">
                                    <input
                                        className="rounded border-slate-300 text-[#0a1f43] focus:ring-[#0a1f43] h-4 w-4"
                                        type="checkbox"
                                        checked={allChecked}
                                        onChange={toggleAll}
                                    />
                                </th>
                                <th className="px-6 py-4">Employee</th>
                                <th className="px-6 py-4">Role &amp; Dept</th>
                                <th className="px-6 py-4">Office</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-center">Att. Score</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {state.status === 'loading' ? (
                                <tr>
                                    <td className="px-6 py-6 text-slate-500" colSpan={8}>
                                        Loading employees...
                                    </td>
                                </tr>
                            ) : state.status === 'error' ? (
                                <tr>
                                    <td className="px-6 py-6 text-red-600" colSpan={8}>
                                        Failed to load employees.
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td className="px-6 py-6 text-slate-500" colSpan={8}>
                                        No employees found.
                                    </td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => {
                                    const score = Number(emp.compliance_score ?? 0);
                                    const scorePct = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
                                    const deptLabel = emp.department || '—';
                                    const roleLabel = emp.job_title || '—';

                                    return (
                                        <tr
                                            key={emp.id}
                                            className="hover:bg-slate-50 transition-colors group cursor-pointer"
                                            onClick={() => {
                                                setSelectedEmployee(emp);
                                                setDetailOpen(true);
                                            }}
                                        >
                                            <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    className="rounded border-slate-300 text-[#0a1f43] focus:ring-[#0a1f43] h-4 w-4"
                                                    type="checkbox"
                                                    checked={selectedIds.has(emp.id)}
                                                    onChange={() => toggleOne(emp.id)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <Avatar src={emp.photo_path} initials={emp.initials || '—'} />
                                                    <div>
                                                        <div className="font-medium text-slate-900">{emp.full_name || emp.name}</div>
                                                        <div className="text-xs text-slate-500">{emp.email || '—'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-700">{roleLabel}</div>
                                                <div className="text-xs text-slate-500">{deptLabel}</div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">Head Office</td>
                                            <td className="px-6 py-4">
                                                <StatusBadge status={emp.status || 'active'} />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                                        <div
                                                            className={`${scorePct >= 90 ? 'bg-green-500' : scorePct >= 75 ? 'bg-[#C9A227]' : 'bg-red-500'} h-1.5 rounded-full`}
                                                            style={{ width: `${scorePct}%` }}
                                                        />
                                                    </div>
                                                    <span className={`text-xs font-bold ${scorePct >= 90 ? 'text-green-600' : scorePct >= 75 ? 'text-[#C9A227]' : 'text-red-500'}`}>
                                                        {scorePct}%
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#0a1f43] rounded transition-colors"
                                                        title="Set Leave Days"
                                                        onClick={() => openLeaveCredits({ scope: 'single', employeeId: emp.id })}
                                                    >
                                                        <Icon name="event" className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#0a1f43] rounded transition-colors"
                                                        title="View Logs"
                                                        onClick={() => {
                                                            setSelectedEmployee(emp);
                                                            setDetailOpen(true);
                                                        }}
                                                    >
                                                        <Icon name="eye" className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#0a1f43] rounded transition-colors"
                                                        title="Edit Employee"
                                                        onClick={() => openEdit(emp)}
                                                    >
                                                        <Icon name="edit_note" className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-red-600 rounded transition-colors"
                                                        title="More Actions"
                                                        onClick={() => openDelete(emp)}
                                                    >
                                                        <Icon name="more" className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                    <span className="text-xs text-slate-500">Showing {employees.length} of {meta.total} employees</span>
                    <div className="flex gap-2">
                        <button
                            className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={meta.current_page <= 1}
                        >
                            Previous
                        </button>
                        <button
                            className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50"
                            onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                            disabled={meta.current_page >= meta.last_page}
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>

            {/* Employee Detail Overlay */}
            {detailOpen && selectedEmployee ? (
                <div
                    className="fixed inset-0 z-50 bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setDetailOpen(false);
                        }
                    }}
                >
                    <div className="ml-auto h-full w-full max-w-md rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center shrink-0">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Icon name="user" className="h-5 w-5 text-[#0a1f43]" />
                                Employee Profile
                            </h3>
                            <div className="flex items-center gap-3">
                                <button className="text-xs text-[#0a1f43] font-medium hover:underline">Edit Profile</button>
                                <button
                                    type="button"
                                    className="text-slate-500 hover:text-slate-700"
                                    onClick={() => setDetailOpen(false)}
                                    aria-label="Close"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-auto">
                            {/* Profile Header */}
                            <div className="p-6 border-b border-slate-200">
                                <div className="flex items-center gap-4">
                                    <Avatar src={selectedEmployee.photo_path} initials={selectedEmployee.initials || '—'} />
                                    <div>
                                        <h4 className="font-bold text-slate-800">{selectedEmployee.full_name || selectedEmployee.name}</h4>
                                        <p className="text-sm text-slate-500">{selectedEmployee.job_title || '—'}</p>
                                        <StatusBadge status={selectedEmployee.status || 'active'} />
                                    </div>
                                </div>
                            </div>

                            {/* Contact Info */}
                            <div className="p-4 border-b border-slate-200 space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <Icon name="mail" className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-600">{selectedEmployee.email || '—'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Icon name="phone" className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-600">{selectedEmployee.phone || '—'}</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Icon name="mapPin" className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-600">Head Office</span>
                                </div>
                                <div className="flex items-center gap-3 text-sm">
                                    <Icon name="calendar" className="h-4 w-4 text-slate-400" />
                                    <span className="text-slate-600">Hired: {normalizeDate(selectedEmployee.hire_date) || '—'}</span>
                                </div>
                            </div>

                            {/* Attendance Stats */}
                            <div className="p-4 border-b border-slate-200">
                                <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Icon name="activity" className="h-4 w-4 text-[#0a1f43]" />
                                    This Month Attendance
                                </h5>
                                <div className="grid grid-cols-3 gap-3">
                                    <div className="text-center p-2 bg-green-50 rounded">
                                        <p className="text-lg font-bold text-green-600">{selectedEmployee.present_days || 0}</p>
                                        <p className="text-xs text-green-700">Present</p>
                                    </div>
                                    <div className="text-center p-2 bg-amber-50 rounded">
                                        <p className="text-lg font-bold text-amber-600">{selectedEmployee.late_days || 0}</p>
                                        <p className="text-xs text-amber-700">Late</p>
                                    </div>
                                    <div className="text-center p-2 bg-red-50 rounded">
                                        <p className="text-lg font-bold text-red-600">{selectedEmployee.absent_days || 0}</p>
                                        <p className="text-xs text-red-700">Absent</p>
                                    </div>
                                </div>
                                <div className="mt-3 text-xs text-slate-500">
                                    Compliance Score: <span className="font-semibold text-[#0a1f43]">{selectedEmployee.compliance_score || '98'}%</span>
                                </div>
                            </div>

                            {/* Device Info */}
                            <div className="p-4 border-b border-slate-200">
                                <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Icon name="smartphone" className="h-4 w-4 text-[#0a1f43]" />
                                    Registered Device
                                </h5>
                                <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-[#0a1f43]/10 flex items-center justify-center">
                                            <Icon name="smartphone" className="h-4 w-4 text-[#0a1f43]" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">{selectedEmployee.device_name || '—'}</p>
                                            <p className="text-xs text-slate-500">ID: {selectedEmployee.device_id || '—'}</p>
                                        </div>
                                    </div>
                                    <DeviceStatus bound={Boolean(selectedEmployee.device_bound)} />
                                </div>
                            </div>

                            {/* Recent Activity */}
                            <div className="p-4">
                                <h5 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                    <Icon name="clock" className="h-4 w-4 text-[#0a1f43]" />
                                    Recent Activity
                                </h5>
                                <div className="space-y-3">
                                    {Array.isArray(selectedEmployee.recent_activity) && selectedEmployee.recent_activity.length > 0 ? (
                                        selectedEmployee.recent_activity.map((activity, idx) => (
                                            <div key={idx} className="flex items-start gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 ${String(activity.action || '').includes('Late') ? 'bg-amber-500' : String(activity.action || '').includes('Out') ? 'bg-slate-400' : 'bg-green-500'}`} />
                                                <div className="flex-1">
                                                    <p className="text-sm text-slate-700">{activity.action || '—'}</p>
                                                    <p className="text-xs text-slate-500">{activity.time || '—'} • {activity.location || '—'}</p>
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-sm text-slate-500">No activity yet.</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Bulk Upload Modal */}
            {bulkOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setBulkOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                            <div className="font-bold text-slate-800">Bulk Upload</div>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setBulkOpen(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="p-4 overflow-auto flex-1 space-y-4">
                            {bulkState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Bulk upload failed.</div>
                            ) : null}

                            {bulkState.status === 'success' ? (
                                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                                    Bulk upload completed.
                                </div>
                            ) : null}

                            <div className="text-sm text-slate-600">
                                1) Download <b>Excel Template</b> (clean formatting).
                                <br />
                                2) Fill your employees.
                                <br />
                                3) In Excel: <b>Save As → CSV</b>.
                                <br />
                                4) Upload the CSV here.
                            </div>

                            <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded bg-[#0a1f43] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a1f43]/90"
                                onClick={downloadBulkTemplate}
                            >
                                <Icon name="download" className="h-4 w-4" />
                                Download Excel Template
                            </button>

                            <button
                                type="button"
                                className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                                onClick={downloadUploadReadyCsv}
                            >
                                <Icon name="download" className="h-4 w-4" />
                                Download Upload-Ready CSV
                            </button>

                            <div>
                                <label className="block text-sm font-medium text-slate-700">Upload filled CSV</label>
                                <input
                                    className="mt-2 block w-full text-sm"
                                    type="file"
                                    accept=".csv,text/csv"
                                    onChange={(e) => setBulkFile(e.target.files?.[0] ?? null)}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setBulkOpen(false)}>
                                Close
                            </button>
                            <button
                                type="button"
                                className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                disabled={!bulkFile || bulkState.status === 'submitting'}
                                onClick={submitBulkUpload}
                            >
                                {bulkState.status === 'submitting' ? 'Uploading…' : 'Upload'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Create Employee Modal */}
            {createOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setCreateOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                            <div className="font-bold text-slate-800">Add Employee</div>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setCreateOpen(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="p-4 overflow-auto flex-1 space-y-4">
                            {createState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {createState.error?.message || 'Failed to create employee.'}
                                </div>
                            ) : null}

                            <button
                                type="button"
                                className="inline-flex items-center gap-2 text-sm font-medium text-[#0a1f43] hover:underline"
                                onClick={downloadBulkTemplate}
                            >
                                <Icon name="download" className="h-4 w-4" />
                                Download Excel Template
                            </button>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">First Name</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.first_name} onChange={(e) => setCreatePayload((p) => ({ ...p, first_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Last Name</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.last_name} onChange={(e) => setCreatePayload((p) => ({ ...p, last_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Middle Name</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.middle_name} onChange={(e) => setCreatePayload((p) => ({ ...p, middle_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Office</label>
                                    <input className="mt-1 w-full rounded border-slate-200 bg-slate-50" value="Head Office" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.email} onChange={(e) => setCreatePayload((p) => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.phone} onChange={(e) => setCreatePayload((p) => ({ ...p, phone: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Department</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.department} onChange={(e) => setCreatePayload((p) => ({ ...p, department: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Job Title</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={createPayload.job_title} onChange={(e) => setCreatePayload((p) => ({ ...p, job_title: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Hire Date</label>
                                    <input type="date" className="mt-1 w-full rounded border-slate-200" value={createPayload.hire_date} onChange={(e) => setCreatePayload((p) => ({ ...p, hire_date: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Status</label>
                                    <select className="mt-1 w-full rounded border-slate-200" value={createPayload.status} onChange={(e) => setCreatePayload((p) => ({ ...p, status: e.target.value }))}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setCreateOpen(false)}>
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                                disabled={createState.status === 'submitting'}
                                onClick={submitCreate}
                            >
                                {createState.status === 'submitting' ? 'Creating…' : 'Create'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Edit Employee Modal */}
            {editOpen ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setEditOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                            <div className="font-bold text-slate-800">Edit Employee</div>
                            <button type="button" className="text-slate-500 hover:text-slate-700" onClick={() => setEditOpen(false)}>
                                ✕
                            </button>
                        </div>

                        <div className="p-4 overflow-auto flex-1 space-y-4">
                            {editState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to update employee.</div>
                            ) : null}

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">First Name</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.first_name} onChange={(e) => setEditPayload((p) => ({ ...p, first_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Last Name</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.last_name} onChange={(e) => setEditPayload((p) => ({ ...p, last_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Middle Name</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.middle_name} onChange={(e) => setEditPayload((p) => ({ ...p, middle_name: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Office</label>
                                    <input className="mt-1 w-full rounded border-slate-200 bg-slate-50" value="Head Office" readOnly />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Email</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.email} onChange={(e) => setEditPayload((p) => ({ ...p, email: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Phone</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.phone} onChange={(e) => setEditPayload((p) => ({ ...p, phone: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Department</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.department} onChange={(e) => setEditPayload((p) => ({ ...p, department: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Job Title</label>
                                    <input className="mt-1 w-full rounded border-slate-200" value={editPayload.job_title} onChange={(e) => setEditPayload((p) => ({ ...p, job_title: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Hire Date</label>
                                    <input type="date" className="mt-1 w-full rounded border-slate-200" value={editPayload.hire_date} onChange={(e) => setEditPayload((p) => ({ ...p, hire_date: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700">Status</label>
                                    <select className="mt-1 w-full rounded border-slate-200" value={editPayload.status} onChange={(e) => setEditPayload((p) => ({ ...p, status: e.target.value }))}>
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setEditOpen(false)}>
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

            {/* Delete Employee Modal */}
            {deleteOpen && deleteEmployee ? (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                        if (e.target === e.currentTarget) {
                            setDeleteOpen(false);
                        }
                    }}
                >
                    <div className="w-full max-w-md max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                        <div className="border-b border-slate-200 p-4 shrink-0">
                            <div className="text-base font-bold text-slate-800">Delete Employee</div>
                            <p className="mt-1 text-sm text-slate-600">This action cannot be undone.</p>
                        </div>

                        <div className="p-4 space-y-3 overflow-auto flex-1">
                            {deleteState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to delete employee.</div>
                            ) : null}
                            <div className="text-sm text-slate-700">
                                Delete <span className="font-semibold">{deleteEmployee.full_name || deleteEmployee.name || deleteEmployee.employee_code || `#${deleteEmployee.id}`}</span>?
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                            <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={() => setDeleteOpen(false)}>
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
        </div>
    );
}

export const SuperAdminEmployeesPage = EmployeesPage;
