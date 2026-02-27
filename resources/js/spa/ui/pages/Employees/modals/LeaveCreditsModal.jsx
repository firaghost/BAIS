import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

const LEAVE_TYPES = [
    { value: 'annual', label: 'Annual' },
    { value: 'sick', label: 'Sick' },
    { value: 'personal', label: 'Personal' },
    { value: 'other', label: 'Other' },
];

export function LeaveCreditsModal({ state, selectedCount, onClose, onSubmit, onChangeYear, onAddRow, onRemoveRow, onChangeRow }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-xl rounded-xl border border-slate-200 bg-white shadow-xl">
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                    <div>
                        <div className="text-sm font-semibold text-slate-900">Set Leave Days</div>
                        <div className="mt-1 text-xs text-slate-500">
                            {state.scope === 'single'
                                ? 'Apply to this employee.'
                                : `Apply to ${selectedCount} selected employee${selectedCount === 1 ? '' : 's'}.`}
                        </div>
                    </div>
                    <button type="button" className="rounded p-2 text-slate-500 hover:bg-slate-100" onClick={onClose} aria-label="Close">
                        <Icon name="close" className="h-5 w-5" />
                    </button>
                </div>

                <div className="grid grid-cols-1 gap-4 px-5 py-4 md:grid-cols-3">
                    <div>
                        <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Year</label>
                        <input
                            type="number"
                            className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                            value={state.year}
                            onChange={(e) => onChangeYear(e.target.value)}
                        />
                    </div>

                    <div className="md:col-span-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">Leave Types & Days</label>
                            <button
                                type="button"
                                className="text-xs font-semibold text-[#0a1f43] hover:underline"
                                onClick={onAddRow}
                                disabled={state.status === 'submitting'}
                            >
                                Add Type
                            </button>
                        </div>

                        <div className="mt-2 space-y-2">
                            {(Array.isArray(state.rows) ? state.rows : []).map((row, idx) => (
                                <div key={idx} className="grid grid-cols-1 gap-2 md:grid-cols-3">
                                    <select
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                                        value={row.leaveType}
                                        onChange={(e) => onChangeRow(idx, 'leaveType', e.target.value)}
                                    >
                                        {LEAVE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                                    </select>

                                    <input
                                        type="number"
                                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent"
                                        value={row.totalDays}
                                        onChange={(e) => onChangeRow(idx, 'totalDays', e.target.value)}
                                        placeholder="Total days"
                                    />

                                    <button
                                        type="button"
                                        className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                                        onClick={() => onRemoveRow(idx)}
                                        disabled={state.status === 'submitting' || (state.rows?.length ?? 0) <= 1}
                                    >
                                        Remove
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {state.scope === 'single' && (
                    <div className="px-5 pb-2">
                        <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Current Credits (Year {state.year})</div>
                        <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                            {state.current.status === 'loading' ? (
                                <div>Loading leave credits...</div>
                            ) : state.current.status === 'error' ? (
                                <div className="text-red-700">{String(state.current.error || 'Failed to load leave credits.')}</div>
                            ) : (Array.isArray(state.current.data) ? state.current.data : []).length === 0 ? (
                                <div>No leave credits configured for this year.</div>
                            ) : (
                                <div className="space-y-1">
                                    {state.current.data.map((c) => (
                                        <div key={`${c.leave_type}-${c.year}`} className="flex items-center justify-between">
                                            <div className="font-medium text-slate-800">{String(c.leave_type)}</div>
                                            <div className="text-slate-600">{Number(c.used_days ?? 0)} / {Number(c.total_days ?? 0)} used</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {state.error && <div className="px-5 pb-2 text-sm font-medium text-red-700">{String(state.error)}</div>}

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4">
                    <button type="button" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onClose} disabled={state.status === 'submitting'}>Cancel</button>
                    <button type="button" className="rounded-lg bg-[#0a1f43] px-4 py-2 text-sm font-semibold text-white shadow-soft hover:bg-[#0a1f43]/90 disabled:opacity-60" onClick={onSubmit} disabled={state.status === 'submitting'}>
                        {state.status === 'submitting' ? 'Applying...' : 'Apply'}
                    </button>
                </div>
            </div>
        </div>
    );
}
