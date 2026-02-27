import React, { useEffect, useMemo, useState } from 'react';
import { api, safeDelete, safeGet, safePost, safePut } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { EmployeeFilters } from './components/EmployeeFilters.jsx';
import { EmployeeTable } from './components/EmployeeTable.jsx';
import { EmployeeDetail } from './components/EmployeeDetail.jsx';
import { LeaveCreditsModal } from './modals/LeaveCreditsModal.jsx';
import { BulkUploadModal } from './modals/BulkUploadModal.jsx';
import { CreateEmployeeModal, EditEmployeeModal } from './modals/EmployeeFormModal.jsx';
import { DeleteEmployeeModal } from './modals/DeleteEmployeeModal.jsx';

function normalizeDate(value) {
    const s = String(value ?? '').trim();
    if (s === '') return '';
    return s.length >= 10 ? s.slice(0, 10) : s;
}

const DEFAULT_FORM = {
    branch_id: '', first_name: '', middle_name: '', last_name: '',
    phone: '', email: '', job_title: '', department: '', hire_date: '', status: 'active',
};

export function EmployeesPage() {
    // --- Core data state ---
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [search, setSearch] = useState('');
    const [sortBy] = useState('name');
    const [page, setPage] = useState(1);
    const [reloadKey, setReloadKey] = useState(0);

    // --- Filters ---
    const [branchId, setBranchId] = useState('');
    const [department, setDepartment] = useState('');
    const [status, setStatus] = useState('');
    const [branchesState, setBranchesState] = useState({ status: 'loading', data: [], error: null });
    const [departmentsState, setDepartmentsState] = useState({ status: 'idle', data: [], error: null });

    // --- Selection ---
    const [selectedIds, setSelectedIds] = useState(() => new Set());

    // --- Detail panel ---
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);

    // --- Modals ---
    const [leaveCredits, setLeaveCredits] = useState({
        open: false, scope: 'selected', employeeId: null,
        year: new Date().getFullYear(),
        rows: [{ leaveType: 'annual', totalDays: '' }],
        current: { status: 'idle', data: [], error: null },
        status: 'idle', error: null,
    });
    const [bulkOpen, setBulkOpen] = useState(false);
    const [bulkState, setBulkState] = useState({ status: 'idle', error: null, result: null });
    const [bulkFile, setBulkFile] = useState(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [createState, setCreateState] = useState({ status: 'idle', error: null });
    const [createPayload, setCreatePayload] = useState(DEFAULT_FORM);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteState, setDeleteState] = useState({ status: 'idle', error: null });
    const [deleteEmployee, setDeleteEmployee] = useState(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editState, setEditState] = useState({ status: 'idle', error: null });
    const [editPayload, setEditPayload] = useState({ id: null, ...DEFAULT_FORM });

    // --- Data fetching ---
    useEffect(() => {
        let active = true;
        setState({ status: 'loading', data: null, error: null });
        (async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('per_page', '8');
            if (search.trim()) params.set('search', search.trim());
            if (sortBy) params.set('sort', sortBy);
            if (branchId && branchId !== 'all') params.set('branch_id', String(branchId));
            if (department && department !== 'all') params.set('department', String(department));
            if (status && status !== 'all') params.set('status', String(status));
            const res = await safeGet(`/api/employees?${params.toString()}`);
            if (!active) return;
            if (!res.ok) { setState({ status: 'error', data: null, error: res.error }); return; }
            setState({ status: 'success', data: res.data, error: null });
            if (!selectedEmployee && res.data?.data?.length > 0) setSelectedEmployee(res.data.data[0]);
        })();
        return () => { active = false; };
    }, [search, sortBy, page, reloadKey, branchId, department, status]);

    useEffect(() => {
        let active = true;
        setBranchesState({ status: 'loading', data: [], error: null });
        (async () => {
            const res = await safeGet('/api/branches');
            if (!active) return;
            if (!res.ok) { setBranchesState({ status: 'error', data: [], error: res.error }); return; }
            setBranchesState({ status: 'success', data: Array.isArray(res.data?.data) ? res.data.data : [], error: null });
        })();
        return () => { active = false; };
    }, []);

    useEffect(() => {
        let active = true;
        setDepartmentsState((prev) => ({ ...prev, status: 'loading', error: null }));
        (async () => {
            const params = new URLSearchParams();
            if (branchId && branchId !== 'all') params.set('branch_id', String(branchId));
            const res = await safeGet(`/api/employees/departments?${params.toString()}`);
            if (!active) return;
            if (!res.ok) { setDepartmentsState({ status: 'error', data: [], error: res.error }); return; }
            setDepartmentsState({ status: 'success', data: Array.isArray(res.data?.data) ? res.data.data : [], error: null });
        })();
        return () => { active = false; };
    }, [branchId]);

    useEffect(() => {
        if (!detailOpen || !selectedEmployee?.id) return;
        let active = true;
        (async () => {
            const res = await safeGet(`/api/employees/${selectedEmployee.id}`);
            if (!active || !res.ok) return;
            setSelectedEmployee(res.data?.data ?? null);
        })();
        return () => { active = false; };
    }, [detailOpen, selectedEmployee?.id]);

    useEffect(() => {
        if (!leaveCredits.open || leaveCredits.scope !== 'single' || !leaveCredits.employeeId) return;
        let active = true;
        setLeaveCredits((prev) => ({ ...prev, current: { status: 'loading', data: [], error: null } }));
        (async () => {
            const res = await safeGet(`/api/leaves/credits/employee/${leaveCredits.employeeId}?year=${encodeURIComponent(String(leaveCredits.year))}`);
            if (!active) return;
            if (!res.ok) { setLeaveCredits((prev) => ({ ...prev, current: { status: 'error', data: [], error: res.error?.message || 'Failed.' } })); return; }
            setLeaveCredits((prev) => ({ ...prev, current: { status: 'success', data: Array.isArray(res.data?.data) ? res.data.data : [], error: null } }));
        })();
        return () => { active = false; };
    }, [leaveCredits.open, leaveCredits.scope, leaveCredits.employeeId, leaveCredits.year]);

    // --- Derived state ---
    const employees = useMemo(() => state.data?.data ?? [], [state.data]);
    const meta = useMemo(() => state.data?.meta ?? { current_page: 1, last_page: 1, total: 0 }, [state.data]);
    const branches = useMemo(() => branchesState.data ?? [], [branchesState.data]);
    const departments = useMemo(() => departmentsState.status === 'success' ? departmentsState.data : [], [departmentsState]);
    const branchesById = useMemo(() => { const m = new Map(); for (const b of branches) m.set(String(b.id), b); return m; }, [branches]);
    const allChecked = useMemo(() => employees.length > 0 && employees.every((emp) => selectedIds.has(emp.id)), [employees, selectedIds]);

    const activeFilterChips = useMemo(() => {
        const chips = [];
        if (status) chips.push({ key: 'status', label: `Status: ${status}` });
        if (branchId) { const b = branchesById.get(branchId); chips.push({ key: 'branch', label: `Branch: ${b?.name ?? branchId}` }); }
        if (department) chips.push({ key: 'department', label: `Department: ${department}` });
        return chips;
    }, [status, branchId, department, branchesById]);

    // --- Handlers ---
    const reload = () => { setSelectedIds(new Set()); setPage(1); setReloadKey((k) => k + 1); };

    const toggleAll = () => setSelectedIds((prev) => {
        const next = new Set(prev);
        const checkAll = !allChecked;
        for (const emp of employees) checkAll ? next.add(emp.id) : next.delete(emp.id);
        return next;
    });
    const toggleOne = (id) => setSelectedIds((prev) => { const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next; });

    const openLeaveCredits = ({ scope, employeeId }) => setLeaveCredits((prev) => ({ ...prev, open: true, scope, employeeId: employeeId ?? null, rows: [{ leaveType: 'annual', totalDays: '' }], current: { status: 'idle', data: [], error: null }, status: 'idle', error: null }));

    const submitLeaveCredits = async () => {
        if (leaveCredits.status === 'submitting') return;
        const year = Number(leaveCredits.year);
        if (!Number.isFinite(year) || year < 2000 || year > 2100) { setLeaveCredits((prev) => ({ ...prev, error: 'Please enter a valid year.' })); return; }
        const rows = Array.isArray(leaveCredits.rows) ? leaveCredits.rows : [];
        if (rows.length === 0) { setLeaveCredits((prev) => ({ ...prev, error: 'Add at least one leave type.' })); return; }
        let employeeIds = leaveCredits.scope === 'single' ? (leaveCredits.employeeId ? [Number(leaveCredits.employeeId)] : []) : Array.from(selectedIds).map(Number);
        employeeIds = employeeIds.filter((id) => Number.isFinite(id) && id > 0);
        if (employeeIds.length === 0) { setLeaveCredits((prev) => ({ ...prev, error: 'Select at least one employee.' })); return; }
        setLeaveCredits((prev) => ({ ...prev, status: 'submitting', error: null }));
        for (const row of rows) {
            const res = await safePost('/api/leaves/credits/bulk-set', { year, leave_type: row.leaveType, total_days: Number(row.totalDays), apply_to_all: false, employee_ids: employeeIds });
            if (!res.ok) { setLeaveCredits((prev) => ({ ...prev, status: 'error', error: res.error?.message || 'Failed to update leave credits.' })); return; }
        }
        setLeaveCredits((prev) => ({ ...prev, status: 'idle', open: false, error: null }));
    };

    const submitCreate = async () => {
        if (createState.status === 'submitting') return;
        if (!createPayload.first_name.trim() || !createPayload.last_name.trim() || !createPayload.hire_date) { setCreateState({ status: 'error', error: { message: 'First name, last name, and hire date are required.' } }); return; }
        setCreateState({ status: 'submitting', error: null });
        const res = await safePost('/api/employees', { branch_id: createPayload.branch_id ? Number(createPayload.branch_id) : null, first_name: createPayload.first_name.trim(), middle_name: createPayload.middle_name.trim() || null, last_name: createPayload.last_name.trim(), phone: createPayload.phone.trim() || null, email: createPayload.email.trim() || null, job_title: createPayload.job_title.trim() || null, department: createPayload.department.trim() || null, hire_date: normalizeDate(createPayload.hire_date), status: createPayload.status });
        if (!res.ok) { setCreateState({ status: 'error', error: res.error }); return; }
        setCreateState({ status: 'idle', error: null }); setCreateOpen(false); setCreatePayload(DEFAULT_FORM); reload();
    };

    const submitEdit = async () => {
        if (editState.status === 'submitting' || !editPayload.id) return;
        setEditState({ status: 'submitting', error: null });
        const res = await safePut(`/api/employees/${editPayload.id}`, { branch_id: editPayload.branch_id ? Number(editPayload.branch_id) : null, first_name: editPayload.first_name.trim() || undefined, middle_name: editPayload.middle_name.trim() || null, last_name: editPayload.last_name.trim() || undefined, phone: editPayload.phone.trim() || null, email: editPayload.email.trim() || null, job_title: editPayload.job_title.trim() || null, department: editPayload.department.trim() || null, hire_date: normalizeDate(editPayload.hire_date) || undefined, status: editPayload.status || undefined });
        if (!res.ok) { setEditState({ status: 'error', error: res.error }); return; }
        setEditState({ status: 'idle', error: null }); setEditOpen(false); reload();
    };

    const confirmDelete = async () => {
        if (!deleteEmployee || deleteState.status === 'submitting') return;
        setDeleteState({ status: 'submitting', error: null });
        const res = await safeDelete(`/api/employees/${deleteEmployee.id}`);
        if (!res.ok) { setDeleteState({ status: 'error', error: res.error }); return; }
        setDeleteState({ status: 'idle', error: null }); setDeleteOpen(false); setDeleteEmployee(null); reload();
    };

    const downloadBulkTemplate = async (format = 'xls') => {
        setBulkState({ status: 'idle', error: null, result: null });
        try {
            const res = await api.get('/api/employees/bulk-template', { responseType: 'blob', params: { format } });
            const blob = res.data;
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `employees-bulk-upload-template.${format}`; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
        } catch (err) { setBulkState({ status: 'error', error: { message: 'Failed to download template.' }, result: null }); }
    };

    const submitBulkUpload = async () => {
        if (!bulkFile || bulkState.status === 'submitting') return;
        setBulkState({ status: 'submitting', error: null, result: null });
        const form = new FormData(); form.append('file', bulkFile);
        const res = await safePost('/api/employees/bulk-upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (!res.ok) { setBulkState({ status: 'error', error: res.error, result: null }); return; }
        setBulkState({ status: 'success', error: null, result: res.data }); setBulkFile(null); setReloadKey((k) => k + 1);
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify({ exported_at: new Date().toISOString(), employees }, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'employees-export.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
    };

    const openEdit = (emp) => {
        setEditState({ status: 'idle', error: null });
        setEditPayload({ id: emp?.id ?? null, branch_id: emp?.branch_id != null ? String(emp.branch_id) : String(emp.branch?.id ?? ''), first_name: String(emp?.first_name ?? ''), middle_name: String(emp?.middle_name ?? ''), last_name: String(emp?.last_name ?? ''), phone: String(emp?.phone ?? ''), email: String(emp?.email ?? ''), job_title: String(emp?.job_title ?? ''), department: String(emp?.department ?? ''), hire_date: normalizeDate(emp?.hire_date ?? ''), status: String(emp?.status ?? 'active') });
        setEditOpen(true);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {/* Modals */}
            {leaveCredits.open && (
                <LeaveCreditsModal
                    state={leaveCredits}
                    selectedCount={selectedIds.size}
                    onClose={() => setLeaveCredits((prev) => ({ ...prev, open: false, status: 'idle', error: null }))}
                    onSubmit={submitLeaveCredits}
                    onChangeYear={(v) => setLeaveCredits((prev) => ({ ...prev, year: v }))}
                    onAddRow={() => setLeaveCredits((prev) => ({ ...prev, rows: [...(Array.isArray(prev.rows) ? prev.rows : []), { leaveType: 'annual', totalDays: '' }] }))}
                    onRemoveRow={(idx) => setLeaveCredits((prev) => ({ ...prev, rows: prev.rows.filter((_, i) => i !== idx) }))}
                    onChangeRow={(idx, field, val) => setLeaveCredits((prev) => ({ ...prev, rows: prev.rows.map((r, i) => i === idx ? { ...r, [field]: val } : r) }))}
                />
            )}

            {bulkOpen && (
                <BulkUploadModal
                    state={bulkState}
                    file={bulkFile}
                    onClose={() => setBulkOpen(false)}
                    onDownloadExcel={() => downloadBulkTemplate('xls')}
                    onDownloadCsv={() => downloadBulkTemplate('csv')}
                    onFileChange={(f) => setBulkFile(f)}
                    onSubmit={submitBulkUpload}
                />
            )}

            {createOpen && (
                <CreateEmployeeModal
                    state={createState}
                    payload={createPayload}
                    branches={branches}
                    onClose={() => setCreateOpen(false)}
                    onChange={(field, val) => setCreatePayload((p) => ({ ...p, [field]: val }))}
                    onSubmit={submitCreate}
                    onDownloadTemplate={() => downloadBulkTemplate('xls')}
                />
            )}

            {editOpen && (
                <EditEmployeeModal
                    state={editState}
                    payload={editPayload}
                    branches={branches}
                    onClose={() => setEditOpen(false)}
                    onChange={(field, val) => setEditPayload((p) => ({ ...p, [field]: val }))}
                    onSubmit={submitEdit}
                />
            )}

            {deleteOpen && deleteEmployee && (
                <DeleteEmployeeModal
                    employee={deleteEmployee}
                    state={deleteState}
                    onClose={() => setDeleteOpen(false)}
                    onConfirm={confirmDelete}
                />
            )}

            {detailOpen && selectedEmployee && (
                <EmployeeDetail
                    employee={selectedEmployee}
                    onClose={() => setDetailOpen(false)}
                    onEdit={() => { setDetailOpen(false); openEdit(selectedEmployee); }}
                />
            )}

            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Employee Management</h1>
                    <p className="text-slate-500 text-sm mt-1">Manage all registered employees across branches</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {selectedIds.size > 0 && (
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-600 font-medium">{selectedIds.size} selected</span>
                            <button type="button" className="px-3 py-2 text-sm font-medium text-[#0a1f43] border border-[#0a1f43] rounded-lg hover:bg-[#0a1f43]/5" onClick={() => openLeaveCredits({ scope: 'selected' })}>Set Leave Days</button>
                        </div>
                    )}
                    <button type="button" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2" onClick={handleExport}>
                        <Icon name="download" className="h-4 w-4" /> Export
                    </button>
                    <button type="button" className="px-4 py-2 border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium flex items-center gap-2" onClick={() => setBulkOpen(true)}>
                        <Icon name="upload" className="h-4 w-4" /> Bulk Upload
                    </button>
                    <button type="button" className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded-lg text-sm font-semibold shadow-soft flex items-center gap-2" onClick={() => setCreateOpen(true)}>
                        <Icon name="plus" className="h-4 w-4" /> Add Employee
                    </button>
                </div>
            </div>

            {/* Filters */}
            <EmployeeFilters
                search={search}
                branches={branches}
                departments={departments}
                branchId={branchId}
                department={department}
                status={status}
                activeChips={activeFilterChips}
                onSearchChange={(v) => { setSearch(v); setPage(1); }}
                onBranchChange={(v) => { setBranchId(v); setPage(1); }}
                onDepartmentChange={(v) => { setDepartment(v); setPage(1); }}
                onStatusChange={(v) => { setStatus(v); setPage(1); }}
                onClearAll={() => { setBranchId(''); setDepartment(''); setStatus(''); }}
            />

            {/* Table */}
            <EmployeeTable
                state={state}
                employees={employees}
                meta={meta}
                selectedIds={selectedIds}
                allChecked={allChecked}
                onToggleAll={toggleAll}
                onToggleOne={toggleOne}
                onRowClick={(emp) => { setSelectedEmployee(emp); setDetailOpen(true); }}
                onEditClick={openEdit}
                onDeleteClick={(emp) => { setDeleteEmployee(emp); setDeleteState({ status: 'idle', error: null }); setDeleteOpen(true); }}
                onLeaveClick={(emp) => openLeaveCredits({ scope: 'single', employeeId: emp.id })}
                onPrevPage={() => setPage((p) => Math.max(1, p - 1))}
                onNextPage={() => setPage((p) => Math.min(meta.last_page, p + 1))}
            />
        </div>
    );
}
