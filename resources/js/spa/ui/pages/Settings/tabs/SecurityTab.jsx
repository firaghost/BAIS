import React, { useEffect, useMemo, useState } from 'react';
import { safeGet, safePut } from '../../../lib/api.js';
import { Icon } from '../../../shared/Icon.jsx';

function Switch({ checked, onChange, label, disabled }) {
    return (
        <div className="flex items-center justify-between">
            <label className="text-sm text-slate-700">{label}</label>
            <button
                type="button"
                role="switch"
                aria-checked={checked ? 'true' : 'false'}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0a1f43] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? 'bg-[#0a1f43]' : 'bg-slate-300'
                    }`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'
                        }`}
                />
            </button>
        </div>
    );
}

export function SecurityTab() {
    const [security, setSecurity] = useState({
        status: 'loading',
        data: {
            enforce_mfa_admin: true,
            enforce_mfa_employee: false,
            admin_session_timeout_minutes: 30,
            employee_session_timeout_minutes: 60,
            password_min_length: 12,
            require_special_chars: true,
            password_expiry_days: 90,
        },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        error: null,
        saveError: null,
    });

    useEffect(() => {
        let active = true;
        (async () => {
            setSecurity((prev) => ({ ...prev, status: 'loading', error: null }));
            const res = await safeGet('/api/settings/security');
            if (!active) return;
            if (!res.ok) {
                const message = res.error?.message || res.error?.error || 'Failed to load security policies.';
                setSecurity((prev) => ({ ...prev, status: 'error', error: { status: res.status, message } }));
                return;
            }
            setSecurity((prev) => ({
                ...prev,
                status: 'success',
                data: res.data?.data ?? prev.data,
                baseline: res.data?.data ?? prev.data,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
                error: null,
            }));
        })();
        return () => { active = false; };
    }, []);

    const canSave = useMemo(
        () => security.status === 'success' && security.dirty && security.saveStatus !== 'submitting',
        [security.dirty, security.saveStatus, security.status],
    );

    const updateField = (field, value) => {
        setSecurity((prev) => ({
            ...prev,
            data: { ...prev.data, [field]: value },
            dirty: true,
            saveStatus: 'idle',
            saveError: null,
        }));
    };

    const handleSave = async () => {
        if (!canSave) return;
        setSecurity((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/security', security.data);
        if (!res.ok) {
            setSecurity((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }
        setSecurity((prev) => ({
            ...prev,
            saveStatus: 'success',
            data: res.data?.data ?? prev.data,
            baseline: res.data?.data ?? prev.data,
            dirty: false,
            saveError: null,
        }));
    };

    const handleCancel = () => {
        setSecurity((prev) => {
            if (prev.status !== 'success' || !prev.baseline) return prev;
            return { ...prev, data: prev.baseline, dirty: false, saveStatus: 'idle', saveError: null };
        });
    };

    if (security.status === 'loading') {
        return <div className="text-sm text-slate-500 p-6">Loading security policies...</div>;
    }

    if (security.status === 'error') {
        const isForbidden = security.error?.status === 403;
        return (
            isForbidden ? (
                <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    You don’t have permission to manage security settings.
                </div>
            ) : (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    Failed to load security policies.
                </div>
            )
        );
    }

    return (
        <div className="space-y-6">
            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Security Policies</h2>
                        <p className="text-sm text-slate-500 mt-1">Manage Multi-Factor Authentication (MFA) and session parameters.</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded uppercase">Active</span>
                </div>

                <div className="p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Authentication Standards</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex items-start gap-3">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-[#0a1f43] bg-slate-100 border-slate-300 rounded focus:ring-[#0a1f43]"
                                        checked={Boolean(security.data.enforce_mfa_admin)}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateField('enforce_mfa_admin', Boolean(e.target.checked))}
                                    />
                                </div>
                                <div className="ml-1 text-sm">
                                    <div className="font-medium text-slate-700">Enforce MFA for Administrators</div>
                                    <p className="text-slate-500 text-xs mt-1">Requires 2FA app or SMS verification for all admin roles.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-[#0a1f43] bg-slate-100 border-slate-300 rounded focus:ring-[#0a1f43]"
                                        checked={Boolean(security.data.enforce_mfa_employee)}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateField('enforce_mfa_employee', Boolean(e.target.checked))}
                                    />
                                </div>
                                <div className="ml-1 text-sm">
                                    <div className="font-medium text-slate-700">Enforce MFA for Employee Portal</div>
                                    <p className="text-slate-500 text-xs mt-1">Optional for standard users. Recommended for remote access.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide border-t border-slate-100 pt-6">
                            Session Management
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Admin Session Timeout (Minutes)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        className="block w-full rounded border-slate-300 focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                        type="number"
                                        value={String(security.data.admin_session_timeout_minutes ?? '')}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateField('admin_session_timeout_minutes', Number(e.target.value) || 0)}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 sm:text-sm">min</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Employee Session Timeout (Minutes)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        className="block w-full rounded border-slate-300 focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                        type="number"
                                        value={String(security.data.employee_session_timeout_minutes ?? '')}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateField('employee_session_timeout_minutes', Number(e.target.value) || 0)}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 sm:text-sm">min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide border-t border-slate-100 pt-6">
                            Password Complexity
                        </h3>
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-700">Minimum Password Length</label>
                                <select
                                    className="rounded border-slate-300 text-sm focus:ring-[#0a1f43] focus:border-[#0a1f43] bg-white"
                                    disabled={security.status !== 'success'}
                                    value={String(security.data.password_min_length ?? 12)}
                                    onChange={(e) => updateField('password_min_length', Number(e.target.value) || 0)}
                                >
                                    <option value="8">8 Characters</option>
                                    <option value="12">12 Characters</option>
                                    <option value="16">16 Characters</option>
                                </select>
                            </div>

                            <Switch
                                checked={Boolean(security.data.require_special_chars)}
                                disabled={security.status !== 'success'}
                                onChange={(v) => updateField('require_special_chars', Boolean(v))}
                                label="Require Special Characters"
                            />

                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-700">Password Expiry</label>
                                <select
                                    className="rounded border-slate-300 text-sm focus:ring-[#0a1f43] focus:border-[#0a1f43] bg-white"
                                    disabled={security.status !== 'success'}
                                    value={String(security.data.password_expiry_days ?? 90)}
                                    onChange={(e) => updateField('password_expiry_days', Number(e.target.value) || 0)}
                                >
                                    <option value="30">30 Days</option>
                                    <option value="60">60 Days</option>
                                    <option value="90">90 Days</option>
                                    <option value="180">180 Days</option>
                                    <option value="0">Never</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={!security.dirty || security.saveStatus === 'submitting'}
                            className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={!canSave}
                            className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {security.saveStatus === 'submitting' ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </section>

            {security.saveStatus === 'error' ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {security.saveError?.message || 'Failed to save security policies.'}
                </div>
            ) : null}
            {security.saveStatus === 'success' ? (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Security policies saved.</div>
            ) : null}
        </div>
    );
}
