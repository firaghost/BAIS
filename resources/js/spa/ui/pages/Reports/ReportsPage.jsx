import React, { useEffect, useMemo, useState } from 'react';
import { api, safeDelete, safeGet, safePost } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { CustomReportBuilder } from './components/CustomReportBuilder.jsx';
import { ReportHistory } from './components/ReportHistory.jsx';
import { ReportsSummary } from './components/ReportsSummary.jsx';
import { DeleteReportModal, ScheduleReportModal } from './modals/ReportsModals.jsx';
import { getFilenameFromContentDisposition, payrollMonthRangeOptionA, sanitizeFilename, toLocalDateInputValue } from './lib/reports-utils.js';

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
            setHistoryState(prev => ({ ...prev, status: 'loading' }));

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
        return () => { active = false; };
    }, [reloadKey]);

    useEffect(() => {
        if (datePreset === 'custom') return;
        const now = new Date();
        const toStr = toLocalDateInputValue(now);
        const fromDate = new Date(now);

        if (datePreset === 'daily') { setFrom(toStr); setTo(toStr); return; }
        if (datePreset === 'weekly') {
            const day = now.getDay();
            const daysSinceMonday = (day + 6) % 7;
            const monday = new Date(now); monday.setDate(monday.getDate() - daysSinceMonday);
            const saturday = new Date(monday); saturday.setDate(saturday.getDate() + 5);
            setFrom(toLocalDateInputValue(monday)); setTo(toLocalDateInputValue(saturday));
            return;
        }
        if (datePreset === 'payroll_month') {
            const range = payrollMonthRangeOptionA(now);
            setFrom(range.from); setTo(range.to);
            return;
        }
        if (datePreset === 'last30') fromDate.setDate(fromDate.getDate() - 29);
        if (datePreset === 'lastQuarter') fromDate.setMonth(fromDate.getMonth() - 3);
        if (datePreset === 'monthly') fromDate.setDate(1);
        if (datePreset === 'ytd' || datePreset === 'yearly') { fromDate.setMonth(0); fromDate.setDate(1); }
        setFrom(toLocalDateInputValue(fromDate)); setTo(toStr);
    }, [datePreset]);

    const submitRun = async () => {
        if (runState.status === 'submitting') return;
        if (!runName.trim()) { setRunState({ status: 'error', error: { message: 'Report name is required.' } }); return; }
        setRunState({ status: 'submitting', error: null });
        const res = await safePost('/api/reports/run', {
            name: runName.trim(), format: runFormat, trigger: 'manual',
            from: from || null, to: to || null, branch_id: runBranchId ? Number(runBranchId) : null,
            metrics: selectedMetrics,
        });
        if (!res.ok) { setRunState({ status: 'error', error: res.error }); return; }
        setRunState({ status: 'success', error: null });
        setReloadKey(k => k + 1);
    };

    const submitScheduledRun = async () => {
        if (scheduleState.status === 'submitting') return;
        if (!runName.trim()) { setScheduleState({ status: 'error', error: { message: 'Report name is required.' } }); return; }
        setScheduleState({ status: 'submitting', error: null });
        const res = await safePost('/api/reports/run', {
            name: runName.trim(), format: runFormat, trigger: 'scheduled',
            from: from || null, to: to || null, branch_id: runBranchId ? Number(runBranchId) : null,
            metrics: selectedMetrics, schedule_frequency: scheduleFrequency,
        });
        if (!res.ok) { setScheduleState({ status: 'error', error: res.error }); return; }
        setScheduleState({ status: 'success', error: null });
        setScheduleModalOpen(false);
        setReloadKey(k => k + 1);
    };

    const resetBuilder = () => {
        setRunName('New Custom Report'); setRunFormat('json'); setRunBranchId('');
        setDatePreset('weekly'); setSelectedMetrics([]); setRunState({ status: 'idle', error: null });
        setScheduleFrequency('weekly'); setScheduleState({ status: 'idle', error: null });
    };

    const downloadRun = async (runId, format, reportName) => {
        const fmt = format === 'csv' ? 'csv' : format === 'xlsx' ? 'xlsx' : 'json';
        const res = await api.get(`/api/reports/runs/${runId}/download?format=${encodeURIComponent(fmt)}`, { responseType: 'blob' });
        const serverFilename = getFilenameFromContentDisposition(res.headers?.['content-disposition']);
        const blob = res.data;
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = serverFilename || `${sanitizeFilename(reportName || `report-run-${runId}`)}.${fmt}`;
        document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(link.href);
    };

    const confirmDeleteRun = async () => {
        if (!deleteModal.runId || deleteModal.status === 'submitting') return;
        setDeleteModal(prev => ({ ...prev, status: 'submitting', error: null }));
        const res = await safeDelete(`/api/reports/runs/${deleteModal.runId}`);
        if (!res.ok) { setDeleteModal(prev => ({ ...prev, status: 'error', error: res.error })); return; }
        setDeleteModal({ open: false, runId: null, runName: '', status: 'idle', error: null });
        setReloadKey(k => k + 1);
    };

    const toggleMetric = (id) => setSelectedMetrics(prev => prev.includes(String(id)) ? prev.filter(x => x !== String(id)) : [...prev, String(id)]);
    const addMetric = (id) => setSelectedMetrics(prev => prev.includes(String(id)) ? prev : [...prev, String(id)]);
    const moveMetric = (id, toIndex) => setSelectedMetrics(prev => {
        const next = prev.filter(x => x !== String(id));
        next.splice(Math.max(0, Math.min(toIndex, next.length)), 0, String(id));
        return next;
    });

    const handleDragStart = (source, metricId) => (e) => {
        const id = String(metricId); setDragState({ source, metricId: id });
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('application/x-bais-metric-id', id);
        e.dataTransfer.setData('text/plain', id);
    };
    const handleDragEnd = () => setDragState({ source: null, metricId: null });
    const getDraggedMetricId = (e) => e.dataTransfer.getData('application/x-bais-metric-id') || e.dataTransfer.getData('text/plain') || dragState.metricId || null;
    const handleDropOnPreview = (e) => { e.preventDefault(); const id = getDraggedMetricId(e); if (id) addMetric(id); };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <DeleteReportModal
                open={deleteModal.open}
                runName={deleteModal.runName}
                status={deleteModal.status}
                error={deleteModal.error}
                onClose={() => setDeleteModal({ open: false, runId: null, runName: '', status: 'idle', error: null })}
                onConfirm={confirmDeleteRun}
            />
            <ScheduleReportModal
                open={scheduleModalOpen}
                frequency={scheduleFrequency}
                onChangeFrequency={setScheduleFrequency}
                runName={runName} runFormat={runFormat} selectedMetrics={selectedMetrics}
                from={from} to={to}
                status={scheduleState.status} error={scheduleState.error}
                onClose={() => { setScheduleModalOpen(false); setScheduleState({ status: 'idle', error: null }); }}
                onConfirm={submitScheduledRun}
            />

            <div className="flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800">Reports & Analytics</h2>
                    <p className="text-slate-500 text-sm mt-1">Generate comprehensive system-wide insights and compliance reports.</p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => { setScheduleModalOpen(true); setScheduleState({ status: 'idle', error: null }); }}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded shadow-sm hover:bg-slate-50 text-sm font-semibold text-slate-700 transition-colors"
                    >
                        <Icon name="clock" className="h-4 w-4" />
                        Schedule Report
                    </button>
                    <button
                        type="button"
                        onClick={resetBuilder}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a1f43] text-white rounded shadow-sm hover:bg-[#0a1f43]/90 text-sm font-bold transition-colors"
                    >
                        <Icon name="plus" className="h-4 w-4" />
                        New Analysis
                    </button>
                </div>
            </div>

            <ReportsSummary overview={overviewState.data} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-12 flex flex-col gap-6 min-h-0">
                    <CustomReportBuilder
                        metrics={metricsState.data}
                        metricsStatus={metricsState.status}
                        selectedMetrics={selectedMetrics}
                        toggleMetric={toggleMetric}
                        moveMetric={moveMetric}
                        runName={runName} setRunName={setRunName}
                        runFormat={runFormat} setRunFormat={setRunFormat}
                        datePreset={datePreset} setDatePreset={setDatePreset}
                        from={from} setFrom={setFrom} to={to} setTo={setTo}
                        runBranchId={runBranchId} setRunBranchId={setRunBranchId}
                        branches={branchesState.data}
                        onSubmit={submitRun} onReset={resetBuilder}
                        runStatus={runState.status}
                        handleDragStart={handleDragStart}
                        handleDragEnd={handleDragEnd}
                        handleDropOnPreview={handleDropOnPreview}
                        getDraggedMetricId={getDraggedMetricId}
                    />

                    <ReportHistory
                        history={historyState.data}
                        status={historyState.status}
                        onRefresh={() => setReloadKey(k => k + 1)}
                        onDelete={(id, name) => setDeleteModal({ open: true, runId: id, runName: name, status: 'idle', error: null })}
                        onDownload={downloadRun}
                    />
                </div>
            </div>
        </div>
    );
}
