import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function CustomReportBuilder({
    metrics,
    metricsStatus,
    selectedMetrics,
    toggleMetric,
    moveMetric,
    runName,
    setRunName,
    runFormat,
    setRunFormat,
    datePreset,
    setDatePreset,
    from,
    setFrom,
    to,
    setTo,
    runBranchId,
    setRunBranchId,
    branches,
    onSubmit,
    onReset,
    runStatus,
    handleDragStart,
    handleDragEnd,
    handleDropOnPreview,
    getDraggedMetricId
}) {
    return (
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
                        onClick={onReset}
                        className="px-3 py-1.5 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-600 font-medium transition-colors"
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        onClick={onSubmit}
                        disabled={runStatus === 'submitting'}
                        className="px-3 py-1.5 text-sm bg-[#0a1f43] text-white rounded hover:bg-[#0a1f43]/90 shadow-sm disabled:opacity-50 font-medium transition-colors"
                    >
                        {runStatus === 'submitting' ? 'Generating...' : 'Generate Report'}
                    </button>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1 space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Available Metrics</h4>
                    {metricsStatus === 'loading' ? (
                        <div className="text-sm text-slate-500">Loading metrics...</div>
                    ) : metricsStatus === 'error' ? (
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
                                    className={`w-full text-left bg-slate-50 p-2 rounded border cursor-pointer hover:shadow-md transition-shadow flex items-center gap-2 ${checked ? 'border-[#C9A227]' : 'border-slate-200'
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
                            <div className="w-full border-b border-slate-200 pb-2 mb-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                                <input
                                    className="h-8 w-full max-w-[320px] border border-slate-200 rounded px-3 text-sm bg-white focus:ring-[#0a1f43]"
                                    value={runName}
                                    onChange={(e) => setRunName(e.target.value)}
                                    placeholder="Report name"
                                />
                                <select
                                    className="h-8 border border-slate-200 rounded px-2 text-sm bg-white focus:ring-[#0a1f43]"
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
                                                className="text-red-400 hover:text-red-500 transition-colors"
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Date Range</label>
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
                            {datePreset === 'custom' && (
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
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Filter By Branch</label>
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

                    {runStatus === 'error' && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            Failed to generate report.
                        </div>
                    )}
                    {runStatus === 'success' && (
                        <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                            Report generated successfully.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
