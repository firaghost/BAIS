import React, { useEffect, useMemo, useState } from 'react';
import { api, safeDelete, safeGet, safePost } from '../lib/api.js';
import { Icon } from '../shared/Icon.jsx';

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '—';
    }
    return `${Number(value).toFixed(1)}%`;
}

function formatDateTime(value) {
    if (!value) {
        return '—';
    }
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

function sanitizeFilename(name) {
    const cleaned = String(name ?? '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
    return cleaned.replace(/^-+|-+$/g, '') || 'report';
}

function getFilenameFromContentDisposition(contentDisposition) {
    const value = String(contentDisposition ?? '');
    if (!value) return null;

    const encodedMatch = value.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
    if (encodedMatch?.[1]) {
        try {
            return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ''));
        } catch {
            return encodedMatch[1].trim().replace(/^"|"$/g, '');
        }
    }

    const plainMatch = value.match(/filename=([^;]+)/i);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim().replace(/^"|"$/g, '');
    }

    return null;
}

function toLocalDateInputValue(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function payrollMonthRangeOptionA(now) {
    const d = now instanceof Date ? now : new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    const end = day >= 24 ? new Date(year, month, 24) : new Date(year, month - 1, 24);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 25);

    return {
        from: toLocalDateInputValue(start),
        to: toLocalDateInputValue(end),
    };
}

export function ReportsPage() {
    const [overviewState, setOverviewState] = useState({ status: 'loading', data: null, error: null });
    const [metricsState, setMetricsState] = useState({ status: 'loading', data: [], error: null });
    const [historyState, setHistoryState] = useState({ status: 'loading', data: [], meta: null, error: null });
    const [branchesState, setBranchesState] = useState({ status: 'loading', data: [], error: null });
    const [reloadKey, setReloadKey] = useState(0);

    const [runName, setRunName] = useState('New Custom Report');
    const [runFormat, setRunFormat] = useState('json');
    const [runBranchId, setRunBranchId] = useState('');
    const [datePreset, setDatePreset] = useState('last30');
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');
    const [selectedMetrics, setSelectedMetrics] = useState([]);
    const [runState, setRunState] = useState({ status: 'idle', error: null });
    const [dragState, setDragState] = useState({ source: null, metricId: null });

    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [scheduleFrequency, setScheduleFrequency] = useState('weekly');
    const [scheduleState, setScheduleState] = useState({ status: 'idle', error: null });

    const [deleteModal, setDeleteModal] = useState({ open: false, runId: null, runName: '', status: 'idle', error: null });

    useEffect(() => {
        const today = new Date();
        const toStr = toLocalDateInputValue(today);
        const fromDate = new Date(today);
        fromDate.setDate(fromDate.getDate() - 29);
        const fromStr = toLocalDateInputValue(fromDate);

        setFrom(fromStr);
        setTo(toStr);
    }, []);

    useEffect(() => {
        let active = true;
        (async () => {
            setOverviewState({ status: 'loading', data: null, error: null });
            setMetricsState({ status: 'loading', data: [], error: null });
            setHistoryState({ status: 'loading', data: [], meta: null, error: null });

            const [overviewRes, metricsRes, historyRes, branchesRes] = await Promise.all([
                safeGet('/api/reports/overview'),
                safeGet('/api/reports/metrics'),
                safeGet('/api/reports/history?page=1&per_page=10'),
                safeGet('/api/branches'),
            ]);

            if (!active) return;

            setOverviewState(overviewRes.ok ? { status: 'success', data: overviewRes.data?.data ?? null, error: null } : { status: 'error', data: null, error: overviewRes.error });
            setMetricsState(metricsRes.ok ? { status: 'success', data: metricsRes.data?.data ?? [], error: null } : { status: 'error', data: [], error: metricsRes.error });
            setHistoryState(
                historyRes.ok
                    ? { status: 'success', data: historyRes.data?.data ?? [], meta: historyRes.data?.meta ?? null, error: null }
                    : { status: 'error', data: [], meta: null, error: historyRes.error },
            );
            setBranchesState(branchesRes.ok ? { status: 'success', data: branchesRes.data?.data ?? [], error: null } : { status: 'error', data: [], error: branchesRes.error });
        })();

        return () => {
            active = false;
        };
    }, [reloadKey]);

    useEffect(() => {
        if (datePreset === 'custom') {
            return;
        }

        const now = new Date();
        const toStr = toLocalDateInputValue(now);
        const fromDate = new Date(now);

        if (datePreset === 'daily') {
            setFrom(toStr);
            setTo(toStr);
            return;
        }

        if (datePreset === 'weekly') {
            const day = now.getDay();
            const daysSinceMonday = (day + 6) % 7;
            const monday = new Date(now);
            monday.setDate(monday.getDate() - daysSinceMonday);
            const saturday = new Date(monday);
            saturday.setDate(saturday.getDate() + 5);

            setFrom(toLocalDateInputValue(monday));
            setTo(toLocalDateInputValue(saturday));
            return;
        }

        if (datePreset === 'payroll_month') {
            const range = payrollMonthRangeOptionA(now);
            setFrom(range.from);
            setTo(range.to);
            return;
        }

        if (datePreset === 'last30') {
            fromDate.setDate(fromDate.getDate() - 29);
        }

        if (datePreset === 'lastQuarter') {
            fromDate.setMonth(fromDate.getMonth() - 3);
        }

        if (datePreset === 'monthly') {
            fromDate.setDate(1);
        }

        if (datePreset === 'ytd') {
            fromDate.setMonth(0);
            fromDate.setDate(1);
        }

        if (datePreset === 'yearly') {
            fromDate.setMonth(0);
            fromDate.setDate(1);
        }

        setFrom(toLocalDateInputValue(fromDate));
        setTo(toStr);
    }, [datePreset]);

    const overview = overviewState.data;
    const metrics = metricsState.data;
    const history = historyState.data;
    const branches = branchesState.data;

    const topBranchLabel = useMemo(() => {
        const name = overview?.top_branch?.name ?? null;
        return name ? String(name) : '—';
    }, [overview]);

    const topBranchEfficiency = useMemo(() => {
        const eff = overview?.top_branch?.efficiency;
        if (eff === null || eff === undefined) {
            return '—';
        }
        return `${Number(eff).toFixed(1)}% Efficiency`;
    }, [overview]);

    const submitRun = async () => {
        if (runState.status === 'submitting') {
            return;
        }

        if (!runName.trim()) {
            setRunState({ status: 'error', error: { message: 'Report name is required.' } });
            return;
        }

        setRunState({ status: 'submitting', error: null });

        const payload = {
            name: runName.trim(),
            format: runFormat,
            trigger: 'manual',
            from: from || null,
            to: to || null,
            branch_id: runBranchId ? Number(runBranchId) : null,
            metrics: selectedMetrics,
        };

        const res = await safePost('/api/reports/run', payload);

        if (!res.ok) {
            setRunState({ status: 'error', error: res.error });
            return;
        }

        setRunState({ status: 'success', error: null });
        setReloadKey((k) => k + 1);
    };

    const submitScheduledRun = async () => {
        if (scheduleState.status === 'submitting') {
            return;
        }

        if (!runName.trim()) {
            setScheduleState({ status: 'error', error: { message: 'Report name is required.' } });
            return;
        }

        setScheduleState({ status: 'submitting', error: null });

        const payload = {
            name: runName.trim(),
            format: runFormat,
            trigger: 'scheduled',
            from: from || null,
            to: to || null,
            branch_id: runBranchId ? Number(runBranchId) : null,
            metrics: selectedMetrics,
            schedule_frequency: scheduleFrequency,
        };

        const res = await safePost('/api/reports/run', payload);

        if (!res.ok) {
            setScheduleState({ status: 'error', error: res.error });
            return;
        }

        setScheduleState({ status: 'success', error: null });
        setScheduleModalOpen(false);
        setReloadKey((k) => k + 1);
    };

    const resetBuilder = () => {
        setRunName('New Custom Report');
        setRunFormat('json');
        setRunBranchId('');
        setDatePreset('weekly');
        setSelectedMetrics([]);
        setRunState({ status: 'idle', error: null });
        setScheduleFrequency('weekly');
        setScheduleState({ status: 'idle', error: null });
    };

    const downloadRun = async (runId, format, reportName) => {
        const fmt = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'json';
        const url = `/api/reports/runs/${runId}/download?format=${encodeURIComponent(fmt)}`;

        const res = await api.get(url, { responseType: 'blob' });
        const contentType = String(res.headers?.['content-type'] ?? '');
        const serverFilename = getFilenameFromContentDisposition(res.headers?.['content-disposition']);
        const blob = res.data;

        if (contentType.includes('application/json') && fmt !== 'json') {
            return;
        }

        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        const fallback = `${sanitizeFilename(reportName || `report-run-${runId}`)}.${fmt}`;
        link.download = serverFilename || fallback;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    };

    const requestDeleteRun = (runId, runName) => {
        setDeleteModal({ open: true, runId, runName: String(runName ?? ''), status: 'idle', error: null });
    };

    const confirmDeleteRun = async () => {
        if (!deleteModal.runId || deleteModal.status === 'submitting') {
            return;
        }

        setDeleteModal((prev) => ({ ...prev, status: 'submitting', error: null }));

        const res = await safeDelete(`/api/reports/runs/${deleteModal.runId}`);
        if (!res.ok) {
            setDeleteModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        setDeleteModal({ open: false, runId: null, runName: '', status: 'idle', error: null });
        setReloadKey((k) => k + 1);
    };

    const toggleMetric = (metricId) => {
        setSelectedMetrics((prev) => {
            const id = String(metricId);
            return prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
        });
    };

    const addMetric = (metricId) => {
        setSelectedMetrics((prev) => {
            const id = String(metricId);
            return prev.includes(id) ? prev : [...prev, id];
        });
    };

    const moveMetric = (metricId, toIndex) => {
        setSelectedMetrics((prev) => {
            const id = String(metricId);
            const fromIndex = prev.findIndex((x) => String(x) === id);
            if (fromIndex === -1) return prev;

            const next = [...prev];
            next.splice(fromIndex, 1);

            const clamped = Math.max(0, Math.min(Number(toIndex) || 0, next.length));
            next.splice(clamped, 0, id);
            return next;
        });
    };

    const handleDragStart = (source, metricId) => (e) => {
        const id = String(metricId);
        setDragState({ source, metricId: id });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-bais-metric-id', id);
        e.dataTransfer.setData('application/x-bais-metric-source', String(source));
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragEnd = () => {
        setDragState({ source: null, metricId: null });
    };

    const getDraggedMetricId = (e) => {
        return (
            e.dataTransfer.getData('application/x-bais-metric-id') ||
            e.dataTransfer.getData('text/plain') ||
            dragState.metricId ||
            null
        );
    };

    const handleDropOnPreview = (e) => {
        e.preventDefault();
        const id = getDraggedMetricId(e);
        if (!id) return;
        addMetric(id);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            {deleteModal.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => {
                            if (deleteModal.status === 'submitting') return;
                            setDeleteModal({ open: false, runId: null, runName: '', status: 'idle', error: null });
                        }}
                        aria-label="Close delete modal"
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Delete Report</h3>
                                <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => {
                                    if (deleteModal.status === 'submitting') return;
                                    setDeleteModal({ open: false, runId: null, runName: '', status: 'idle', error: null });
                                }}
                                aria-label="Close"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <div className="font-semibold">Report:</div>
                                <div className="mt-1 break-words">{deleteModal.runName || '—'}</div>
                            </div>

                            {deleteModal.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {deleteModal.error?.message || 'Failed to delete report.'}
                                </div>
                            ) : null}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button
                                type="button"
                                onClick={() => setDeleteModal({ open: false, runId: null, runName: '', status: 'idle', error: null })}
                                disabled={deleteModal.status === 'submitting'}
                                className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmDeleteRun}
                                disabled={deleteModal.status === 'submitting'}
                                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 shadow-sm disabled:opacity-50"
                            >
                                {deleteModal.status === 'submitting' ? 'Deleting...' : 'Delete'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            {scheduleModalOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => {
                            setScheduleModalOpen(false);
                            setScheduleState({ status: 'idle', error: null });
                        }}
                        aria-label="Close schedule modal"
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Schedule Report</h3>
                                <p className="text-xs text-slate-500 mt-1">Save a scheduled run configuration (automation can be added later).</p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => {
                                    setScheduleModalOpen(false);
                                    setScheduleState({ status: 'idle', error: null });
                                }}
                                aria-label="Close"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Frequency</label>
                                <select
                                    className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                    value={scheduleFrequency}
                                    onChange={(e) => setScheduleFrequency(e.target.value)}
                                >
                                    <option value="daily">Daily</option>
                                    <option value="weekly">Weekly</option>
                                    <option value="monthly">Monthly</option>
                                    <option value="yearly">Yearly</option>
                                </select>
                            </div>

                            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                                <div className="font-semibold text-slate-700">This will schedule:</div>
                                <div className="mt-1">Name: {runName || '—'}</div>
                                <div>Format: {String(runFormat).toUpperCase()}</div>
                                <div>Metrics: {selectedMetrics.length > 0 ? selectedMetrics.length : 'All'}</div>
                                <div>
                                    Date Range: {from || '—'} → {to || '—'}
                                </div>
                            </div>

                            {scheduleState.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {scheduleState.error?.message || 'Failed to schedule report.'}
                                </div>
                            ) : null}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button
                                type="button"
                                onClick={() => {
                                    setScheduleModalOpen(false);
                                    setScheduleState({ status: 'idle', error: null });
                                }}
                                className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitScheduledRun}
                                disabled={scheduleState.status === 'submitting'}
                                className="px-3 py-2 text-sm bg-[#0a1f43] text-white rounded hover:bg-[#0a1f43]/90 shadow-sm disabled:opacity-50"
                            >
                                {scheduleState.status === 'submitting' ? 'Scheduling...' : 'Schedule'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}
            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reports &amp; Analytics</h2>
                    <p className="text-slate-500 text-sm mt-1">Generate comprehensive system-wide insights and compliance reports.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            setScheduleModalOpen(true);
                            setScheduleState({ status: 'idle', error: null });
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 text-sm font-medium transition-colors text-slate-700"
                    >
                        <Icon name="schedule" className="h-4 w-4" />
                        Schedule Report
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            resetBuilder();
                        }}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a1f43] text-white rounded shadow-sm hover:bg-[#0a1f43]/90 text-sm font-medium transition-colors"
                    >
                        <Icon name="add" className="h-4 w-4" />
                        New Analysis
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Monthly Compliance Avg</p>
                            <h3 className="text-3xl font-bold text-[#0a1f43] mt-1">{formatPercent(overview?.monthly_compliance_avg)}</h3>
                        </div>
                        <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                            <Icon name="gavel" className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-slate-400 ml-0 text-xs">Month to date</span>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-[#0a1f43] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Top Performing Branch</p>
                            <h3 className="text-lg font-bold text-[#0a1f43] mt-1 truncate max-w-[150px]" title={topBranchLabel}>
                                {topBranchLabel}
                            </h3>
                            <p className="text-xs text-green-600 font-medium">{topBranchEfficiency}</p>
                        </div>
                        <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                            <Icon name="trophy" className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-[#C9A227] h-full" style={{ width: '98%' }}></div>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-[#C9A227] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Network Device Health</p>
                            <h3 className="text-3xl font-bold text-[#0a1f43] mt-1">{formatPercent(overview?.device_health?.percent)}</h3>
                        </div>
                        <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                            <Icon name="router" className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-slate-500 text-xs">{Number(overview?.device_health?.offline ?? 0)} Devices Offline</span>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-[#0a1f43] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </div>

                <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Reports Generated</p>
                            <h3 className="text-3xl font-bold text-[#0a1f43] mt-1">{Number(overview?.reports_generated?.count ?? 0)}</h3>
                        </div>
                        <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                            <Icon name="printer" className="h-5 w-5" />
                        </div>
                    </div>
                    <div className="mt-4 flex items-center text-sm">
                        <span className="text-slate-400 ml-0 text-xs">Last 7 days</span>
                    </div>
                    <div className="absolute bottom-0 left-0 h-1 bg-[#C9A227] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-12 flex flex-col gap-6 min-h-0">
                    <div className="bg-white rounded-lg shadow-soft border border-slate-200">
                        <div className="p-6 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                            <div>
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                    <Icon name="wrench" className="h-5 w-5 text-[#C9A227]" />
                                    Custom Report Builder
                                </h3>
                                <p className="text-sm text-slate-500">Select metrics to build a new report view.</p>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setSelectedMetrics([]);
                                        setRunState({ status: 'idle', error: null });
                                    }}
                                    className="px-3 py-1.5 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                                >
                                    Reset
                                </button>
                                <button
                                    type="button"
                                    onClick={submitRun}
                                    disabled={runState.status === 'submitting'}
                                    className="px-3 py-1.5 text-sm bg-[#0a1f43] text-white rounded hover:bg-[#0a1f43]/90 shadow-sm disabled:opacity-50"
                                >
                                    {runState.status === 'submitting' ? 'Generating...' : 'Generate Report'}
                                </button>
                            </div>
                        </div>

                        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 space-y-3">
                                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Metrics</h4>
                                {metricsState.status === 'loading' ? (
                                    <div className="text-sm text-slate-500">Loading metrics...</div>
                                ) : metricsState.status === 'error' ? (
                                    <div className="text-sm text-red-600">Failed to load metrics.</div>
                                ) : (
                                    metrics.map((m) => {
                                        const checked = selectedMetrics.includes(String(m.id));
                                        return (
                                            <button
                                                key={m.id}
                                                type="button"
                                                onClick={() => toggleMetric(m.id)}
                                                draggable
                                                onDragStart={handleDragStart('available', m.id)}
                                                onDragEnd={handleDragEnd}
                                                className={`w-full text-left bg-slate-50 p-2 rounded border cursor-pointer hover:shadow-md transition-shadow flex items-center gap-2 ${
                                                    checked ? 'border-[#C9A227]' : 'border-slate-200'
                                                }`}
                                            >
                                                <Icon name="gripVertical" className="h-4 w-4 text-slate-400" />
                                                <span className="text-sm font-medium text-slate-700">{m.label}</span>
                                                <span className="ml-auto text-xs text-slate-500">{checked ? 'Selected' : ''}</span>
                                            </button>
                                        );
                                    })
                                )}
                            </div>

                            <div className="md:col-span-2 space-y-4">
                                <div>
                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Report Layout Preview</h4>
                                    <div
                                        className="bg-slate-50 rounded-lg p-4 border-2 border-dashed border-slate-300 min-h-[240px] flex flex-col gap-3"
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.dataTransfer.dropEffect = 'move';
                                        }}
                                        onDrop={handleDropOnPreview}
                                    >
                                        <div className="w-full border-b border-slate-200 pb-2 mb-2 flex justify-between items-center">
                                            <input
                                                className="h-8 w-full max-w-[320px] border border-slate-200 rounded px-3 text-sm bg-white"
                                                value={runName}
                                                onChange={(e) => setRunName(e.target.value)}
                                                placeholder="Report name"
                                            />
                                            <select
                                                className="h-8 border border-slate-200 rounded px-2 text-sm bg-white"
                                                value={runFormat}
                                                onChange={(e) => setRunFormat(e.target.value)}
                                            >
                                                <option value="json">JSON</option>
                                                <option value="csv">CSV</option>
                                                <option value="xlsx">XLSX</option>
                                            </select>
                                        </div>

                                        {selectedMetrics.length === 0 ? (
                                            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 py-8 border-2 border-transparent rounded">
                                                <Icon name="plus" className="h-8 w-8 mb-2" />
                                                <span className="text-sm">Select metrics to build report</span>
                                            </div>
                                        ) : (
                                            selectedMetrics.map((id) => {
                                                const label = metrics.find((m) => String(m.id) === String(id))?.label || id;
                                                const index = selectedMetrics.findIndex((x) => String(x) === String(id));
                                                return (
                                                    <div
                                                        key={id}
                                                        className="bg-white p-3 rounded shadow-sm border border-slate-200 flex justify-between items-center group"
                                                        draggable
                                                        onDragStart={handleDragStart('selected', id)}
                                                        onDragEnd={handleDragEnd}
                                                        onDragOver={(e) => {
                                                            e.preventDefault();
                                                            e.dataTransfer.dropEffect = 'move';
                                                        }}
                                                        onDrop={(e) => {
                                                            e.preventDefault();
                                                            const draggedId = getDraggedMetricId(e);
                                                            if (!draggedId) return;
                                                            if (String(draggedId) === String(id)) return;
                                                            moveMetric(draggedId, index);
                                                        }}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Icon name="barChart3" className="h-4 w-4 text-slate-400" />
                                                            <span className="text-sm font-medium text-slate-800">{label}</span>
                                                        </div>
                                                        <button
                                                            type="button"
                                                            onClick={() => toggleMetric(id)}
                                                            className="text-red-400 hover:text-red-500"
                                                            title="Remove"
                                                        >
                                                            <Icon name="trash2" className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Date Range</label>
                                        <select
                                            className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                            value={datePreset}
                                            onChange={(e) => setDatePreset(e.target.value)}
                                        >
                                            <option value="daily">Daily (Today)</option>
                                            <option value="weekly">Weekly (This Week)</option>
                                            <option value="payroll_month">Payroll Month (25 → 24)</option>
                                            <option value="monthly">Monthly (This Month)</option>
                                            <option value="yearly">Yearly (This Year)</option>
                                            <option value="last30">Last 30 Days</option>
                                            <option value="lastQuarter">Last Quarter</option>
                                            <option value="ytd">Year to Date</option>
                                            <option value="custom">Custom Range</option>
                                        </select>
                                        {datePreset === 'custom' ? (
                                            <div className="mt-2 grid grid-cols-2 gap-2">
                                                <input
                                                    type="date"
                                                    className="w-full text-sm border-slate-300 rounded bg-white"
                                                    value={from}
                                                    onChange={(e) => setFrom(e.target.value)}
                                                />
                                                <input
                                                    type="date"
                                                    className="w-full text-sm border-slate-300 rounded bg-white"
                                                    value={to}
                                                    onChange={(e) => setTo(e.target.value)}
                                                />
                                            </div>
                                        ) : null}
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium text-slate-700 mb-1">Filter By Branch</label>
                                        <select
                                            className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                            value={runBranchId}
                                            onChange={(e) => setRunBranchId(e.target.value)}
                                        >
                                            <option value="">All Branches</option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={String(b.id)}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {runState.status === 'error' ? (
                                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                        Failed to generate report.
                                    </div>
                                ) : null}
                                {runState.status === 'success' ? (
                                    <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Report generated.</div>
                                ) : null}
                            </div>
                        </div>
                    </div>

                    <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-slate-200">
                            <h3 className="text-lg font-bold text-slate-800">Generated Report History</h3>
                            <button
                                type="button"
                                onClick={() => setReloadKey((k) => k + 1)}
                                className="text-sm text-[#0a1f43] font-medium hover:underline"
                            >
                                Refresh
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                                        <th className="px-6 py-4">Report Name</th>
                                        <th className="px-6 py-4">Date Generated</th>
                                        <th className="px-6 py-4">Generated By</th>
                                        <th className="px-6 py-4">Format</th>
                                        <th className="px-6 py-4 text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-200 text-sm">
                                    {historyState.status === 'loading' ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                Loading history...
                                            </td>
                                        </tr>
                                    ) : historyState.status === 'error' ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-red-600">
                                                Failed to load history.
                                            </td>
                                        </tr>
                                    ) : history.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                                No reports generated yet.
                                            </td>
                                        </tr>
                                    ) : (
                                        history.map((r) => (
                                            <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-slate-800">{r.name}</td>
                                                <td className="px-6 py-4 text-slate-600">{formatDateTime(r.created_at)}</td>
                                                <td className="px-6 py-4 text-slate-600">{r.created_by_name || '—'}</td>
                                                <td className="px-6 py-4">
                                                    <span
                                                        className={`px-2 py-0.5 text-xs rounded font-medium ${
                                                            String(r.format).toLowerCase() === 'csv'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : String(r.format).toLowerCase() === 'xlsx'
                                                                  ? 'bg-amber-100 text-amber-800'
                                                                  : 'bg-green-100 text-green-800'
                                                        }`}
                                                    >
                                                        {String(r.format ?? 'json').toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button
                                                        type="button"
                                                        onClick={() => requestDeleteRun(r.id, r.name)}
                                                        className="text-slate-400 hover:text-red-600 transition-colors mr-3"
                                                        title="Delete"
                                                    >
                                                        <Icon name="trash2" className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => downloadRun(r.id, r.format, r.name)}
                                                        className="text-slate-400 hover:text-[#0a1f43] transition-colors"
                                                        title="Download"
                                                    >
                                                        <Icon name="download" className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

