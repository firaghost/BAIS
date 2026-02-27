import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function DeleteReportModal({ open, runName, status, error, onClose, onConfirm }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close delete modal"
            />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Delete Report</h3>
                        <p className="text-xs text-slate-500 mt-1">This action cannot be undone.</p>
                    </div>
                    <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        <div className="font-semibold text-slate-500 uppercase tracking-tight text-[10px] mb-1">Report to delete:</div>
                        <div className="mt-1 font-medium break-words text-slate-800">{runName || '—'}</div>
                    </div>

                    {status === 'error' && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2 items-center">
                            <Icon name="alertCircle" className="h-4 w-4" />
                            {error?.message || 'Failed to delete report.'}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={status === 'submitting'}
                        className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={status === 'submitting'}
                        className="px-4 py-2 text-sm font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 shadow-sm disabled:opacity-50 transition-colors"
                    >
                        {status === 'submitting' ? 'Deleting...' : 'Delete Report'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ScheduleReportModal({ open, frequency, onChangeFrequency, runName, runFormat, selectedMetrics, from, to, status, error, onClose, onConfirm }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close schedule modal"
            />
            <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-base font-bold text-slate-800">Schedule Report</h3>
                        <p className="text-xs text-slate-500 mt-1">Set up recurring report generation patterns.</p>
                    </div>
                    <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-5 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Frequency</label>
                        <select
                            className="w-full text-sm border-slate-300 rounded-lg bg-white focus:ring-[#0a1f43] focus:border-[#0a1f43] py-2.5"
                            value={frequency}
                            onChange={(e) => onChangeFrequency(e.target.value)}
                        >
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs text-slate-600 shadow-inner">
                        <div className="font-bold text-slate-700 uppercase tracking-tight text-[10px] mb-2 border-b border-slate-200 pb-1">Scheduled Configuration</div>
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4">
                            <div>
                                <span className="text-slate-400">Name:</span>
                                <div className="font-medium text-slate-800 truncate">{runName || '—'}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Format:</span>
                                <div className="font-medium text-slate-800">{String(runFormat).toUpperCase()}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Metrics:</span>
                                <div className="font-medium text-slate-800">{selectedMetrics.length > 0 ? `${selectedMetrics.length} selected` : 'All Available'}</div>
                            </div>
                            <div>
                                <span className="text-slate-400">Range:</span>
                                <div className="font-medium text-slate-800">{from || '—'} to {to || '—'}</div>
                            </div>
                        </div>
                    </div>

                    {status === 'error' && (
                        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 flex gap-2 items-center">
                            <Icon name="alertCircle" className="h-4 w-4" />
                            {error?.message || 'Failed to schedule report.'}
                        </div>
                    )}
                </div>

                <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-3 bg-white">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={status === 'submitting'}
                        className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-700 disabled:opacity-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={status === 'submitting'}
                        className="px-4 py-2 text-sm font-bold bg-[#0a1f43] text-white rounded-lg hover:bg-[#0a1f43]/90 shadow-sm disabled:opacity-50 transition-colors"
                    >
                        {status === 'submitting' ? 'Scheduling...' : 'Confirm Schedule'}
                    </button>
                </div>
            </div>
        </div>
    );
}
