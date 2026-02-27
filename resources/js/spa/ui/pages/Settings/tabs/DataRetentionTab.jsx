import React, { useEffect, useState } from 'react';
import { safeGet, safePost, safePut } from '../../../lib/api.js';
import { Icon } from '../../../shared/Icon.jsx';

function clamp(n, min, max) {
    return Math.min(Math.max(n, min), max);
}

function toYears(days) {
    return Math.max(1, Math.round(Number(days || 0) / 365));
}

function toMonths(days) {
    return Math.max(6, Math.round(Number(days || 0) / 30));
}

function RangeRow({ title, description, valueLabel, minLabel, maxLabel, warn, input }) {
    return (
        <div className="relative">
            <div className="flex justify-between items-end mb-4">
                <div>
                    <label className="block text-sm font-semibold text-slate-900">{title}</label>
                    <p className="text-xs text-slate-500 mt-1 max-w-md">{description}</p>
                </div>
                <div className="text-right">
                    <span className="block text-2xl font-bold text-[#0a1f43] tabular-nums">{valueLabel}</span>
                    <span className="text-xs text-slate-400">Current Setting</span>
                </div>
            </div>
            {input}
            <div className="flex justify-between text-xs font-medium text-slate-400 mt-2 px-1">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
            {warn ? (
                <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-100">
                    <Icon name="alertCircle" className="h-4 w-4" />
                    <span>{warn}</span>
                </div>
            ) : null}
        </div>
    );
}

export function DataRetentionTab() {
    const [state, setState] = useState({
        status: 'loading',
        data: {
            audit_logs_days: 365,
            attendance_days: 730,
            employee_documents_days: 3650,
            reports_days: 365,
            api_logs_days: 90,
            auto_purge_enabled: true,
        },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        resetStatus: 'idle',
        error: null,
        saveError: null,
        resetError: null,
    });

    useEffect(() => {
        let active = true;
        (async () => {
            setState((prev) => ({ ...prev, status: 'loading', error: null, saveStatus: 'idle', resetStatus: 'idle' }));
            const res = await safeGet('/api/settings/data-retention');
            if (!active) return;
            if (!res.ok) {
                setState((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }
            const payload = res.data?.data ?? {};
            const data = {
                audit_logs_days: Number(payload.audit_logs_days) || 365,
                attendance_days: Number(payload.attendance_days) || 730,
                employee_documents_days: Number(payload.employee_documents_days) || 3650,
                reports_days: Number(payload.reports_days) || 365,
                api_logs_days: Number(payload.api_logs_days) || 90,
                auto_purge_enabled: Boolean(payload.auto_purge_enabled),
            };
            setState((prev) => ({ ...prev, status: 'success', data, baseline: data, dirty: false, error: null }));
        })();
        return () => { active = false; };
    }, []);

    const updateField = (field, value) => {
        setState((prev) => ({ ...prev, data: { ...prev.data, [field]: value }, dirty: true, saveStatus: 'idle', saveError: null }));
    };

    const handleDiscard = () => {
        setState((prev) => {
            if (prev.status !== 'success' || !prev.baseline) return prev;
            return { ...prev, data: prev.baseline, dirty: false, saveStatus: 'idle', saveError: null, resetStatus: 'idle', resetError: null };
        });
    };

    const handleSave = async () => {
        if (state.status !== 'success' || !state.dirty || state.saveStatus === 'submitting') return;
        setState((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/data-retention', state.data);
        if (!res.ok) {
            setState((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }
        const payload = res.data?.data ?? state.data;
        const saved = {
            audit_logs_days: Number(payload.audit_logs_days) || state.data.audit_logs_days,
            attendance_days: Number(payload.attendance_days) || state.data.attendance_days,
            employee_documents_days: Number(payload.employee_documents_days) || state.data.employee_documents_days,
            reports_days: Number(payload.reports_days) || state.data.reports_days,
            api_logs_days: Number(payload.api_logs_days) || state.data.api_logs_days,
            auto_purge_enabled: Boolean(payload.auto_purge_enabled),
        };
        setState((prev) => ({ ...prev, saveStatus: 'success', data: saved, baseline: saved, dirty: false, saveError: null }));
    };

    const handleReset = async () => {
        if (state.resetStatus === 'submitting') return;
        setState((prev) => ({ ...prev, resetStatus: 'submitting', resetError: null }));
        const res = await safePost('/api/settings/data-retention/reset', {});
        if (!res.ok) {
            setState((prev) => ({ ...prev, resetStatus: 'error', resetError: res.error }));
            return;
        }
        const payload = res.data?.data ?? {};
        const data = {
            audit_logs_days: Number(payload.audit_logs_days) || 365,
            attendance_days: Number(payload.attendance_days) || 730,
            employee_documents_days: Number(payload.employee_documents_days) || 3650,
            reports_days: Number(payload.reports_days) || 365,
            api_logs_days: Number(payload.api_logs_days) || 90,
            auto_purge_enabled: Boolean(payload.auto_purge_enabled),
        };
        setState((prev) => ({ ...prev, resetStatus: 'success', data, baseline: data, dirty: false, saveStatus: 'idle', saveError: null, resetError: null }));
    };

    const isReady = state.status === 'success';
    const attendanceYears = clamp(toYears(state.data.attendance_days), 1, 10);
    const auditMonths = clamp(toMonths(state.data.audit_logs_days), 6, 60);
    const docsYears = clamp(toYears(state.data.employee_documents_days), 1, 20);

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            Data Retention Lifecycle
                            <Icon name="badgeCheck" className="h-4 w-4 text-slate-400" />
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Configure automated data purging schedules for compliance.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={!isReady || state.resetStatus === 'submitting'}
                        className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {state.resetStatus === 'submitting' ? 'Resetting...' : 'Reset Defaults'}
                    </button>
                </div>

                <div className="p-8 space-y-10">
                    {state.status === 'loading' ? (
                        <div className="text-sm text-slate-500">Loading retention policy...</div>
                    ) : state.status === 'error' ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to load retention policy.</div>
                    ) : (
                        <>
                            <RangeRow
                                title="Attendance Logs"
                                description="Daily check-in/out records, biometric timestamps, and geofencing data."
                                valueLabel={`${attendanceYears} Years`}
                                minLabel="1 Year"
                                maxLabel="10 Years"
                                warn={attendanceYears < 5 ? 'Banking regulation requires a minimum of 5 years for auditability.' : null}
                                input={
                                    <input
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A227]"
                                        type="range"
                                        min={1}
                                        max={10}
                                        step={1}
                                        disabled={!isReady}
                                        value={attendanceYears}
                                        onChange={(e) => updateField('attendance_days', Number(e.target.value) * 365)}
                                    />
                                }
                            />

                            <RangeRow
                                title="Audit Logs"
                                description="Security events, access logs, and compliance trail."
                                valueLabel={`${auditMonths} Months`}
                                minLabel="6 Months"
                                maxLabel="60 Months"
                                warn={null}
                                input={
                                    <input
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A227]"
                                        type="range"
                                        min={6}
                                        max={60}
                                        step={6}
                                        disabled={!isReady}
                                        value={auditMonths}
                                        onChange={(e) => updateField('audit_logs_days', Number(e.target.value) * 30)}
                                    />
                                }
                            />

                            <RangeRow
                                title="Employee Documents"
                                description="Employee files, contracts, and personal records."
                                valueLabel={`${docsYears} Years`}
                                minLabel="1 Year"
                                maxLabel="20 Years"
                                warn={null}
                                input={
                                    <input
                                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A227]"
                                        type="range"
                                        min={1}
                                        max={20}
                                        step={1}
                                        disabled={!isReady}
                                        value={docsYears}
                                        onChange={(e) => updateField('employee_documents_days', Number(e.target.value) * 365)}
                                    />
                                }
                            />
                        </>
                    )}
                </div>

                {isReady && (
                    <div className="px-8 py-4 border-t border-slate-200 flex justify-end gap-3 bg-slate-50">
                        <button
                            type="button"
                            onClick={handleDiscard}
                            disabled={!state.dirty || state.saveStatus === 'submitting'}
                            className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!state.dirty || state.saveStatus === 'submitting'}
                            className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {state.saveStatus === 'submitting' ? 'Saving...' : 'Save Policy'}
                        </button>
                    </div>
                )}
            </section>

            {state.saveStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.saveError?.message || 'Failed to save retention policy.'}</div>}
            {state.resetStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.resetError?.message || 'Failed to reset.'}</div>}
        </div>
    );
}
