import React, { useEffect, useMemo, useRef, useState } from 'react';
import { safeDelete, safeGet, safePost } from '../../../lib/api.js';
import { Icon } from '../../../shared/Icon.jsx';

function formatDate(value) {
    const v = String(value || '').slice(0, 10);
    return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : String(value || '—');
}

function downloadCsvTemplate() {
    const header = ['holiday_date', 'name', 'type', 'is_active'];
    const sample = ['2026-09-11', 'Ethiopian New Year (Enkutatash)', 'public', '1'];

    const csv = [header, sample]
        .map((row) => row.map((x) => `"${String(x).replaceAll('"', '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'holidays-import-template.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function HolidaysTab() {
    const [state, setState] = useState({ status: 'loading', items: [], error: null, httpStatus: null });
    const [range, setRange] = useState(() => {
        const y = new Date().getFullYear();
        return { from: `${y}-01-01`, to: `${y}-12-31` };
    });

    const [create, setCreate] = useState({
        open: false,
        holiday_date: '',
        name: '',
        type: 'public',
        is_active: true,
        reason: '',
        submitStatus: 'idle',
        error: null,
    });

    const [importCsv, setImportCsv] = useState({
        status: 'idle',
        reason: '',
        file: null,
        error: null,
        result: null,
    });

    const fileRef = useRef(null);

    const load = async () => {
        setState((prev) => ({ ...prev, status: 'loading', error: null, httpStatus: null }));
        const res = await safeGet('/api/settings/holidays', {
            params: { per_page: 200, from: range.from, to: range.to },
        });

        if (!res.ok) {
            setState({ status: 'error', items: [], error: res.error, httpStatus: res.status ?? null });
            return;
        }

        const data = res.data?.data;
        const items = Array.isArray(data?.data) ? data.data : [];
        setState({ status: 'success', items, error: null, httpStatus: null });
    };

    useEffect(() => {
        let active = true;
        (async () => {
            await load();
        })();
        return () => {
            active = false;
            void active;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [range.from, range.to]);

    const canCreate = useMemo(() => {
        return (
            create.submitStatus !== 'submitting' &&
            /^\d{4}-\d{2}-\d{2}$/.test(create.holiday_date) &&
            String(create.name || '').trim().length >= 2 &&
            String(create.reason || '').trim().length >= 3
        );
    }, [create]);

    const submitCreate = async () => {
        if (!canCreate) return;

        setCreate((p) => ({ ...p, submitStatus: 'submitting', error: null }));
        const res = await safePost('/api/settings/holidays', {
            country_code: 'ET',
            holiday_date: create.holiday_date,
            name: create.name,
            type: create.type,
            is_active: Boolean(create.is_active),
            reason: create.reason,
        });

        if (!res.ok) {
            setCreate((p) => ({ ...p, submitStatus: 'error', error: res.error }));
            return;
        }

        setCreate({
            open: false,
            holiday_date: '',
            name: '',
            type: 'public',
            is_active: true,
            reason: '',
            submitStatus: 'idle',
            error: null,
        });

        await load();
    };

    const deleteHoliday = async (id) => {
        const reason = window.prompt('Reason for deletion (required):');
        if (!reason || String(reason).trim().length < 3) return;

        await safeDelete(`/api/settings/holidays/${id}`, { data: { reason } });
        await load();
    };

    const runImportEthiopiaMajor = async () => {
        const year = window.prompt('Year to import (e.g. 2026):');
        const reason = window.prompt('Reason (required):');
        const y = Number(year);
        if (!Number.isInteger(y) || y < 2000 || y > 2100) return;
        if (!reason || String(reason).trim().length < 3) return;

        await safePost('/api/settings/holidays/import/ethiopia-major', { year: y, reason });
        await load();
    };

    const importCsvSubmit = async () => {
        if (importCsv.status === 'submitting') return;
        const reason = String(importCsv.reason || '').trim();
        if (reason.length < 3) {
            setImportCsv((p) => ({ ...p, status: 'error', error: { message: 'Reason is required.' } }));
            return;
        }
        if (!importCsv.file) {
            setImportCsv((p) => ({ ...p, status: 'error', error: { message: 'Please choose a CSV file.' } }));
            return;
        }

        const fd = new FormData();
        fd.append('file', importCsv.file);
        fd.append('reason', reason);
        fd.append('country_code', 'ET');

        setImportCsv((p) => ({ ...p, status: 'submitting', error: null, result: null }));
        const res = await safePost('/api/settings/holidays/import/csv', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (!res.ok) {
            setImportCsv((p) => ({ ...p, status: 'error', error: res.error }));
            return;
        }

        setImportCsv((p) => ({ ...p, status: 'success', result: res.data?.data ?? null }));
        await load();
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-soft p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <h3 className="font-semibold text-slate-800">Holidays (Ethiopia)</h3>
                        <p className="text-xs text-slate-500">
                            Configure exact holiday dates. Attendance is disabled on active holidays.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            onClick={downloadCsvTemplate}
                        >
                            <Icon name="download" className="h-4 w-4" />
                            Download CSV Template
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200"
                            onClick={runImportEthiopiaMajor}
                        >
                            <Icon name="refresh" className="h-4 w-4" />
                            Import Fixed Dates
                        </button>

                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white hover:opacity-90"
                            onClick={() => setCreate((p) => ({ ...p, open: true }))}
                        >
                            <Icon name="add" className="h-4 w-4" />
                            Add Holiday
                        </button>
                    </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-slate-600">From</div>
                        <input
                            type="date"
                            className="w-full rounded border-slate-200"
                            value={range.from}
                            onChange={(e) => setRange((p) => ({ ...p, from: e.target.value }))}
                        />
                    </label>
                    <label className="text-sm">
                        <div className="mb-1 text-xs font-medium text-slate-600">To</div>
                        <input
                            type="date"
                            className="w-full rounded border-slate-200"
                            value={range.to}
                            onChange={(e) => setRange((p) => ({ ...p, to: e.target.value }))}
                        />
                    </label>
                </div>

                <div className="mt-6 border-t border-slate-200 pt-6">
                    <h4 className="text-sm font-semibold text-slate-800">Import Accurate List (CSV)</h4>
                    <p className="text-xs text-slate-500 mt-1">
                        Upload a yearly list that includes moveable holidays. Columns: holiday_date,name,type,is_active
                    </p>

                    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="sm:col-span-1">
                            <input
                                ref={fileRef}
                                type="file"
                                accept=".csv,text/csv"
                                className="block w-full text-sm"
                                onChange={(e) => {
                                    const f = e.target.files?.[0] ?? null;
                                    setImportCsv((p) => ({ ...p, file: f }));
                                }}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <input
                                type="text"
                                className="w-full rounded border-slate-200"
                                placeholder="Reason for import (required)"
                                value={importCsv.reason}
                                onChange={(e) => setImportCsv((p) => ({ ...p, reason: e.target.value }))}
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex items-center gap-3">
                        <button
                            type="button"
                            className="inline-flex items-center gap-2 rounded bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 disabled:opacity-60"
                            disabled={importCsv.status === 'submitting'}
                            onClick={importCsvSubmit}
                        >
                            <Icon name="upload" className="h-4 w-4" />
                            {importCsv.status === 'submitting' ? 'Importing...' : 'Import CSV'}
                        </button>

                        {importCsv.status === 'success' ? (
                            <div className="text-xs text-emerald-700">
                                Imported: {Number(importCsv.result?.imported ?? 0)}
                                {Array.isArray(importCsv.result?.errors) && importCsv.result.errors.length > 0
                                    ? ` • Errors: ${importCsv.result.errors.length}`
                                    : ''}
                            </div>
                        ) : null}

                        {importCsv.status === 'error' ? (
                            <div className="text-xs text-red-700">
                                {importCsv.error?.message || 'Import failed.'}
                            </div>
                        ) : null}
                    </div>

                    {importCsv.status === 'success' && Array.isArray(importCsv.result?.errors) && importCsv.result.errors.length > 0 ? (
                        <div className="mt-3 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                            <div className="font-semibold">Some rows were skipped:</div>
                            <ul className="mt-2 list-disc pl-5 space-y-1">
                                {importCsv.result.errors.slice(0, 10).map((e, idx) => (
                                    <li key={idx}>Row {e.row}: {e.message}</li>
                                ))}
                            </ul>
                            {importCsv.result.errors.length > 10 ? (
                                <div className="mt-2 text-amber-700">Showing first 10 errors.</div>
                            ) : null}
                        </div>
                    ) : null}
                </div>
            </div>

            <div className="bg-white rounded-lg border border-slate-200 shadow-soft overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="font-semibold text-slate-800">Configured Holidays</h3>
                    <div className="text-xs text-slate-500">{state.items.length} items</div>
                </div>

                {state.status === 'loading' ? (
                    <div className="p-6 text-sm text-slate-500">Loading holidays...</div>
                ) : null}

                {state.status === 'error' ? (
                    state.httpStatus === 403 ? (
                        <div className="p-6 text-sm text-amber-800">
                            You don’t have permission to manage holidays.
                        </div>
                    ) : (
                        <div className="p-6 text-sm text-red-700">
                            Failed to load holidays.
                        </div>
                    )
                ) : null}

                {state.status === 'success' && state.items.length === 0 ? (
                    <div className="p-6 text-sm text-slate-600">
                        No holidays found in the selected date range.
                    </div>
                ) : null}

                {state.status === 'success' ? (
                    <div className="overflow-auto">
                        <table className="min-w-full divide-y divide-slate-200 text-sm">
                            <thead className="bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Type</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">Active</th>
                                    <th className="px-6 py-3" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200">
                                {state.items.map((h) => (
                                    <tr key={h.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 whitespace-nowrap">{formatDate(h.holiday_date)}</td>
                                        <td className="px-6 py-3">{h.name}</td>
                                        <td className="px-6 py-3 whitespace-nowrap">{h.type || 'public'}</td>
                                        <td className="px-6 py-3 whitespace-nowrap">
                                            {h.is_active ? (
                                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">Active</span>
                                            ) : (
                                                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">Inactive</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-3 whitespace-nowrap text-right">
                                            <button
                                                type="button"
                                                className="inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-50"
                                                onClick={() => deleteHoliday(h.id)}
                                            >
                                                <Icon name="trash2" className="h-4 w-4" />
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : null}
            </div>

            {create.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
                    <div className="w-full max-w-lg rounded-lg bg-white shadow-xl border border-slate-200">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div className="font-semibold text-slate-800">Add Holiday</div>
                            <button
                                type="button"
                                className="rounded p-1 hover:bg-slate-100"
                                onClick={() => setCreate((p) => ({ ...p, open: false }))}
                            >
                                <Icon name="close" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <label className="text-sm">
                                    <div className="mb-1 text-xs font-medium text-slate-600">Date</div>
                                    <input
                                        type="date"
                                        className="w-full rounded border-slate-200"
                                        value={create.holiday_date}
                                        onChange={(e) => setCreate((p) => ({ ...p, holiday_date: e.target.value }))}
                                    />
                                </label>
                                <label className="text-sm">
                                    <div className="mb-1 text-xs font-medium text-slate-600">Type</div>
                                    <select
                                        className="w-full rounded border-slate-200"
                                        value={create.type}
                                        onChange={(e) => setCreate((p) => ({ ...p, type: e.target.value }))}
                                    >
                                        <option value="public">Public</option>
                                        <option value="company">Company</option>
                                        <option value="religious">Religious</option>
                                    </select>
                                </label>
                            </div>
                            <label className="text-sm block">
                                <div className="mb-1 text-xs font-medium text-slate-600">Name</div>
                                <input
                                    type="text"
                                    className="w-full rounded border-slate-200"
                                    value={create.name}
                                    onChange={(e) => setCreate((p) => ({ ...p, name: e.target.value }))}
                                />
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={create.is_active}
                                    onChange={(e) => setCreate((p) => ({ ...p, is_active: e.target.checked }))}
                                />
                                Active
                            </label>
                            <label className="text-sm block">
                                <div className="mb-1 text-xs font-medium text-slate-600">Reason</div>
                                <input
                                    type="text"
                                    className="w-full rounded border-slate-200"
                                    placeholder="Required"
                                    value={create.reason}
                                    onChange={(e) => setCreate((p) => ({ ...p, reason: e.target.value }))}
                                />
                            </label>

                            {create.submitStatus === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {create.error?.message || 'Failed to save holiday.'}
                                </div>
                            ) : null}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                className="rounded px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                                onClick={() => setCreate((p) => ({ ...p, open: false }))}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="rounded bg-[#0a1f43] px-4 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-60"
                                disabled={!canCreate}
                                onClick={submitCreate}
                            >
                                {create.submitStatus === 'submitting' ? 'Saving...' : 'Save'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
