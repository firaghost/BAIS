import React, { useEffect, useState } from 'react';
import { safeGet, safePost, safePut } from '../../../lib/api.js';
import { Icon } from '../../../shared/Icon.jsx';

function ChannelSwitch({ checked, disabled, onToggle }) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked ? 'true' : 'false'}
            disabled={disabled}
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0a1f43] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-[#0a1f43]' : 'bg-slate-200'
                }`}
        >
            <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
            />
        </button>
    );
}

const SEVERITY_META = {
    critical: { bg: 'bg-red-100', fg: 'text-red-600', icon: 'alertCircle' },
    warning: { bg: 'bg-amber-100', fg: 'text-amber-700', icon: 'alertCircle' },
    info: { bg: 'bg-blue-100', fg: 'text-blue-700', icon: 'info' },
};

export function NotificationsTab() {
    const [state, setState] = useState({
        status: 'loading',
        data: { events: [], rules: {} },
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
            const res = await safeGet('/api/settings/notification-rules');
            if (!active) return;
            if (!res.ok) {
                setState((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }
            const payload = res.data?.data ?? { events: [], rules: {} };
            const data = {
                events: Array.isArray(payload.events) ? payload.events : [],
                rules: payload.rules && typeof payload.rules === 'object' ? payload.rules : {},
            };
            setState((prev) => ({ ...prev, status: 'success', data, baseline: data, dirty: false, error: null }));
        })();
        return () => { active = false; };
    }, []);

    const setRule = (eventId, channel, value) => {
        const id = String(eventId || '');
        if (!id) return;
        setState((prev) => {
            const rules = prev.data?.rules && typeof prev.data.rules === 'object' ? prev.data.rules : {};
            const current = rules[id] && typeof rules[id] === 'object' ? rules[id] : { in_app: true, email: false, sms: false };
            return {
                ...prev,
                data: { ...prev.data, rules: { ...rules, [id]: { ...current, [channel]: Boolean(value) } } },
                dirty: true,
                saveStatus: 'idle',
                saveError: null,
            };
        });
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
        const res = await safePut('/api/settings/notification-rules', { rules: state.data.rules });
        if (!res.ok) {
            setState((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }
        const payload = res.data?.data ?? state.data;
        const data = {
            events: Array.isArray(payload.events) ? payload.events : state.data.events,
            rules: payload.rules && typeof payload.rules === 'object' ? payload.rules : state.data.rules,
        };
        setState((prev) => ({ ...prev, saveStatus: 'success', data, baseline: data, dirty: false, saveError: null }));
    };

    const handleReset = async () => {
        if (state.resetStatus === 'submitting') return;
        setState((prev) => ({ ...prev, resetStatus: 'submitting', resetError: null }));
        const res = await safePost('/api/settings/notification-rules/reset', {});
        if (!res.ok) {
            setState((prev) => ({ ...prev, resetStatus: 'error', resetError: res.error }));
            return;
        }
        const payload = res.data?.data ?? { events: [], rules: {} };
        const data = {
            events: Array.isArray(payload.events) ? payload.events : [],
            rules: payload.rules && typeof payload.rules === 'object' ? payload.rules : {},
        };
        setState((prev) => ({ ...prev, resetStatus: 'success', data, baseline: data, dirty: false, saveStatus: 'idle', saveError: null, resetError: null }));
    };

    const events = Array.isArray(state.data?.events) ? state.data.events : [];
    const rules = state.data?.rules && typeof state.data.rules === 'object' ? state.data.rules : {};

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Event Notification Rules</h2>
                        <p className="text-sm text-slate-500 mt-1">Configure which channels are used for system alerts and critical events.</p>
                    </div>
                    <button
                        type="button"
                        onClick={handleReset}
                        disabled={state.status !== 'success' || state.resetStatus === 'submitting'}
                        className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                        {state.resetStatus === 'submitting' ? 'Resetting...' : 'Reset Defaults'}
                    </button>
                </div>

                <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-5/12">Event Type</th>
                                <th className="px-6 py-4 text-center w-2/12">In-App Alert</th>
                                <th className="px-6 py-4 text-center w-2/12">Email</th>
                                <th className="px-6 py-4 text-center w-2/12">SMS</th>
                                <th className="px-6 py-4 text-right w-1/12" />
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {state.status === 'loading' ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading notification rules...</td></tr>
                            ) : state.status === 'error' ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">Failed to load notification rules.</td></tr>
                            ) : events.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No notification events available.</td></tr>
                            ) : (
                                events.map((evt) => {
                                    const id = String(evt.id || '');
                                    const severity = String(evt.severity || 'info');
                                    const meta = SEVERITY_META[severity] ?? SEVERITY_META.info;
                                    const ch = rules[id] && typeof rules[id] === 'object' ? rules[id] : { in_app: true, email: false, sms: false };
                                    const disabled = state.status !== 'success';

                                    return (
                                        <tr key={id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full ${meta.bg} ${meta.fg} flex items-center justify-center`}>
                                                        <Icon name={meta.icon} className="h-4 w-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-medium text-slate-800">{evt.name}</div>
                                                        <div className="text-xs text-slate-500">{evt.description}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <ChannelSwitch checked={Boolean(ch.in_app)} disabled={disabled} onToggle={() => setRule(id, 'in_app', !ch.in_app)} />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <ChannelSwitch checked={Boolean(ch.email)} disabled={disabled} onToggle={() => setRule(id, 'email', !ch.email)} />
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <ChannelSwitch checked={Boolean(ch.sms)} disabled={disabled} onToggle={() => setRule(id, 'sms', !ch.sms)} />
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button type="button" className="text-slate-300 cursor-default" aria-hidden="true">
                                                    <Icon name="settings" className="h-5 w-5" />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={handleDiscard}
                        disabled={state.status !== 'success' || !state.dirty || state.saveStatus === 'submitting'}
                        className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={state.status !== 'success' || !state.dirty || state.saveStatus === 'submitting'}
                        className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                        {state.saveStatus === 'submitting' ? 'Saving...' : 'Save Rules'}
                    </button>
                </div>
            </section>

            {state.saveStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.saveError?.message || 'Failed to save notification rules.'}</div>}
            {state.resetStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.resetError?.message || 'Failed to reset notification rules.'}</div>}
            {state.saveStatus === 'success' && <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Notification rules saved.</div>}
        </div>
    );
}
