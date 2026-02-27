import React, { useEffect, useMemo, useState } from 'react';

import { safeGet, safePost } from '../lib/api.js';
import { Icon } from '../shared/Icon.jsx';

function normalizeRoleList(list) {
    if (!Array.isArray(list)) return [];
    return list
        .filter((r) => r && typeof r === 'object')
        .map((r) => ({
            id: Number(r.id) || 0,
            name: String(r.name ?? ''),
            slug: String(r.slug ?? ''),
        }))
        .filter((r) => r.id > 0);
}

function roleUi(slug, name) {
    const key = String(slug || '').toLowerCase();

    const map = {
        'super-admin': {
            label: name || 'Super Admin',
            icon: 'shield',
            badge: { text: 'High Authority', className: 'bg-red-100 text-red-700' },
            description: 'Full system access including configuration, user management, and audit logs.',
        },
        'hr-admin': {
            label: name || 'HR Admin',
            icon: 'user',
            badge: null,
            description: 'Manage employee records, attendance corrections, and shift scheduling.',
        },
        'branch-manager': {
            label: name || 'Branch Manager',
            icon: 'store',
            badge: null,
            description: 'Local access to assigned branch data, rosters, and terminal monitoring.',
        },
        'payroll-officer': {
            label: name || 'Payroll Officer',
            icon: 'payments',
            badge: null,
            description: 'Export attendance data and manage integration with payroll systems.',
        },
        'executive-viewer': {
            label: name || 'Executive Viewer',
            icon: 'pieChart',
            badge: null,
            description: 'Read-only access to global dashboards and analytical reports.',
        },
    };

    return (
        map[key] ?? {
            label: name || 'Role',
            icon: 'badgeCheck',
            badge: null,
            description: 'Permissions for this role are managed by system administrators.',
        }
    );
}

function toSelectOptions(list) {
    return normalizeRoleList(list).map((r) => ({ value: r.id, label: r.name, slug: r.slug }));
}

export function SystemUsersPage() {
    const [step, setStep] = useState('details');

    const [roles, setRoles] = useState({ status: 'idle', data: [], error: null });

    const [form, setForm] = useState({
        name: '',
        email: '',
        role_id: null,
        access_scope_type: 'global',
        access_scope_region: '',
    });

    const [createState, setCreateState] = useState({ status: 'idle', error: null, result: null });

    useEffect(() => {
        let active = true;

        (async () => {
            setRoles({ status: 'loading', data: [], error: null });
            const res = await safeGet('/api/system-users/roles');

            if (!active) return;
            if (!res.ok) {
                setRoles({ status: 'error', data: [], error: res.error });
                return;
            }

            const list = normalizeRoleList(res.data?.data);
            setRoles({ status: 'success', data: list, error: null });

            setForm((prev) => {
                if (prev.role_id) return prev;
                const first = list[0]?.id ?? null;
                return { ...prev, role_id: first };
            });
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        return undefined;
    }, []);

    const roleOptions = useMemo(() => toSelectOptions(roles.data), [roles.data]);

    const selectedRole = useMemo(() => {
        const id = Number(form.role_id) || 0;
        return roles.data.find((r) => r.id === id) ?? null;
    }, [form.role_id, roles.data]);

    const selectedRoleUi = useMemo(() => roleUi(selectedRole?.slug, selectedRole?.name), [selectedRole?.slug, selectedRole?.name]);

    const canContinueToRole = useMemo(() => {
        return form.name.trim().length >= 2 && /.+@.+\..+/.test(form.email.trim());
    }, [form.email, form.name]);

    const scopeHint = useMemo(() => {
        if (form.access_scope_type === 'regional' && form.access_scope_region.trim()) {
            return `User will be restricted to data originating from "${form.access_scope_region.trim()}" only.`;
        }
        return 'User will have access to all data.';
    }, [form.access_scope_region, form.access_scope_type]);

    const createUser = async () => {
        if (createState.status === 'submitting') return;

        setCreateState({ status: 'submitting', error: null, result: null });

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role_id: Number(form.role_id) || null,
            access_scope_type: form.access_scope_type,
            access_scope_region: form.access_scope_type === 'regional' ? form.access_scope_region.trim() : null,
            access_scope_branch_id: null,
        };

        const res = await safePost('/api/system-users', payload);

        if (!res.ok) {
            setCreateState({ status: 'error', error: res.error, result: null });
            return;
        }

        setCreateState({ status: 'success', error: null, result: res.data?.data ?? null });
    };

    const steps = [
        { id: 'details', label: 'User Details', number: 1 },
        { id: 'role', label: 'Role Assignment', number: 2 },
        { id: 'review', label: 'Review & Create', number: 3 },
    ];

    const activeStep = steps.find((s) => s.id === step) ?? steps[0];

    const renderStepNav = () => (
        <nav className="space-y-1">
            {steps.map((s) => {
                const isActive = s.id === step;
                const isDone = steps.findIndex((x) => x.id === step) > steps.findIndex((x) => x.id === s.id);
                const isLocked = !isDone && !isActive && steps.findIndex((x) => x.id === s.id) > steps.findIndex((x) => x.id === step);

                return (
                    <button
                        key={s.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                            if (isLocked) return;
                            setStep(s.id);
                        }}
                        className={[
                            'w-full flex items-center px-4 py-3 font-medium rounded-lg transition-all text-left',
                            isActive
                                ? 'bg-white text-[#0a1f43] shadow-sm border-l-4 border-[#C9A227]'
                                : isLocked
                                    ? 'text-slate-400 cursor-not-allowed'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900',
                        ].join(' ')}
                    >
                        <div
                            className={[
                                'w-6 h-6 rounded-full flex items-center justify-center mr-3 text-xs font-bold',
                                isDone ? 'bg-green-500 text-white' : isActive ? 'bg-[#C9A227] text-[#0a1f43]' : 'bg-slate-200 text-slate-600',
                            ].join(' ')}
                        >
                            {isDone ? <Icon name="checkCircle" className="h-4 w-4" /> : s.number}
                        </div>
                        {s.label}
                    </button>
                );
            })}
        </nav>
    );

    const renderDetails = () => (
        <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Create New System User</h2>
                <p className="text-sm text-slate-500 mt-1">Enter the user’s basic information.</p>
            </div>

            <div className="p-6 space-y-5">
                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Full Name</label>
                    <input
                        className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Sarah Connor"
                    />
                </div>

                <div>
                    <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Email Address</label>
                    <input
                        type="email"
                        className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. sarah@example.com"
                    />
                </div>

                <div className="rounded border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                        <Icon name="lock" className="h-5 w-5 text-amber-700" />
                        <div>
                            <h4 className="text-sm font-bold text-amber-800">Security Note</h4>
                            <p className="text-xs text-amber-700 mt-1">New users receive a temporary password and must change it on first login.</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                <button
                    type="button"
                    className="px-6 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                    disabled={!canContinueToRole}
                    onClick={() => setStep('role')}
                >
                    Continue to Role Assignment
                </button>
            </div>
        </section>
    );

    const renderRoleAssignment = () => (
        <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Role Assignment</h2>
                <p className="text-sm text-slate-500 mt-1">Select the primary system role for this user. Roles define base permissions.</p>
            </div>

            <div className="p-6">
                {roles.status === 'loading' ? <div className="text-sm text-slate-500">Loading roles...</div> : null}
                {roles.status === 'error' ? <div className="text-sm text-red-700">Failed to load roles.</div> : null}

                {roles.status === 'success' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roleOptions.map((opt) => {
                            const ui = roleUi(opt.slug, opt.label);
                            const checked = Number(form.role_id) === opt.value;

                            return (
                                <button
                                    key={opt.value}
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, role_id: opt.value }))}
                                    className={[
                                        'p-4 border rounded-xl text-left transition-all h-full',
                                        checked ? 'border-[#C9A227] bg-blue-50/50 ring-1 ring-[#C9A227]' : 'border-slate-200 hover:border-[#C9A227]',
                                    ].join(' ')}
                                >
                                    <div className="flex justify-between items-start mb-2">
                                        <Icon name={ui.icon} className="h-6 w-6 text-[#0a1f43]" />
                                        {ui.badge ? (
                                            <span className={["px-2 py-0.5 text-[10px] font-bold uppercase rounded", ui.badge.className].join(' ')}>
                                                {ui.badge.text}
                                            </span>
                                        ) : null}
                                    </div>
                                    <div className="font-bold text-slate-800 mb-1">{ui.label}</div>
                                    <div className="text-xs text-slate-500 leading-relaxed">{ui.description}</div>
                                </button>
                            );
                        })}
                    </div>
                ) : null}
            </div>

            <div className="p-6 bg-slate-50 border-t border-slate-200">
                <h3 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2 uppercase tracking-wide">
                    <Icon name="globe" className="h-5 w-5 text-slate-500" />
                    Access Scope
                </h3>

                <div className="max-w-xl">
                    <label className="block text-xs font-medium text-slate-500 mb-2 uppercase">Define organizational binding</label>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                        <div className="relative">
                            <select
                                className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3 appearance-none"
                                value={form.access_scope_type}
                                onChange={(e) => {
                                    const next = String(e.target.value);
                                    setForm((prev) => ({
                                        ...prev,
                                        access_scope_type: next,
                                        access_scope_region: next === 'regional' ? prev.access_scope_region : '',
                                    }));
                                }}
                            >
                                <option value="global">Global Access</option>
                                <option value="regional">Regional Hub</option>
                            </select>
                        </div>

                        {form.access_scope_type === 'regional' ? (
                            <input
                                className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                placeholder="Enter region name..."
                                value={form.access_scope_region}
                                onChange={(e) => setForm((prev) => ({ ...prev, access_scope_region: e.target.value }))}
                            />
                        ) : null}

                    </div>

                    <p className="mt-2 text-xs text-slate-500 italic">{scopeHint}</p>
                </div>

                <div className="mt-6 rounded border border-amber-200 bg-amber-50 p-4">
                    <div className="flex gap-3">
                        <Icon name="alertCircle" className="h-5 w-5 text-amber-700" />
                        <div>
                            <h4 className="text-sm font-bold text-amber-800">Security Note on Role Assignment</h4>
                            <p className="text-xs text-amber-700 mt-1">
                                Assigning sensitive roles may grant visibility to PII. Ensure the candidate has completed required privacy training.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                <button
                    type="button"
                    className="px-6 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
                    onClick={() => setStep('details')}
                >
                    Back to Details
                </button>
                <button
                    type="button"
                    className="px-6 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-bold shadow-sm transition-colors"
                    onClick={() => setStep('review')}
                    disabled={!selectedRole}
                >
                    Continue to Review
                </button>
            </div>
        </section>
    );

    const renderReview = () => (
        <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200">
                <h2 className="text-lg font-bold text-slate-800">Review & Create</h2>
                <p className="text-sm text-slate-500 mt-1">Confirm the user profile and create the account.</p>
            </div>

            <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="rounded border border-slate-200 p-4">
                        <div className="text-xs font-medium text-slate-500 uppercase">Name</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{form.name || '—'}</div>
                    </div>
                    <div className="rounded border border-slate-200 p-4">
                        <div className="text-xs font-medium text-slate-500 uppercase">Email</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{form.email || '—'}</div>
                    </div>
                    <div className="rounded border border-slate-200 p-4">
                        <div className="text-xs font-medium text-slate-500 uppercase">Role</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{selectedRoleUi.label}</div>
                    </div>
                    <div className="rounded border border-slate-200 p-4">
                        <div className="text-xs font-medium text-slate-500 uppercase">Scope</div>
                        <div className="mt-1 text-sm font-semibold text-slate-800">{form.access_scope_type}</div>
                        <div className="mt-1 text-xs text-slate-500">{scopeHint}</div>
                    </div>
                </div>

                {createState.status === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {createState.error?.message || 'Failed to create user.'}
                    </div>
                ) : null}

                {createState.status === 'success' && createState.result?.temporary_password ? (
                    <div className="rounded border border-green-200 bg-green-50 p-4">
                        <div className="text-sm font-bold text-green-800">User created</div>
                        <div className="mt-2 text-xs text-green-700">Temporary password (copy now):</div>
                        <div className="mt-2 flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-white border border-green-200 rounded text-xs font-mono text-green-800 break-all">
                                {String(createState.result.temporary_password)}
                            </code>
                            <button
                                type="button"
                                className="px-3 py-2 text-sm border border-green-200 rounded hover:bg-white"
                                onClick={() => navigator.clipboard.writeText(String(createState.result.temporary_password))}
                            >
                                <Icon name="copy" className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ) : null}
            </div>

            <div className="px-6 py-4 bg-white border-t border-slate-200 flex justify-end gap-3">
                <button
                    type="button"
                    className="px-6 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-sm font-medium transition-colors"
                    onClick={() => setStep('role')}
                    disabled={createState.status === 'submitting'}
                >
                    Back
                </button>
                <button
                    type="button"
                    className="px-6 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                    onClick={createUser}
                    disabled={createState.status === 'submitting' || createState.status === 'success'}
                >
                    {createState.status === 'submitting' ? 'Creating...' : createState.status === 'success' ? 'Created' : 'Create User'}
                </button>
            </div>
        </section>
    );

    const renderMain = () => {
        if (step === 'details') return renderDetails();
        if (step === 'role') return renderRoleAssignment();
        return renderReview();
    };

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex items-center text-sm text-slate-500 mb-6">
                <div className="hover:text-[#0a1f43]">System Users</div>
                <span className="mx-2 text-slate-300">/</span>
                <div className="font-semibold text-[#0a1f43]">{activeStep.label}</div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8">
                <div className="w-full lg:w-64 flex-shrink-0">
                    {renderStepNav()}

                    <div className="mt-8 p-4 rounded-lg border border-[#0a1f43]/10 bg-[#0a1f43]/5">
                        <div className="flex items-start gap-3">
                            <Icon name="shield" className="h-5 w-5 text-[#0a1f43]" />
                            <div>
                                <h4 className="text-sm font-semibold text-[#0a1f43]">Security Protocol</h4>
                                <p className="text-xs text-slate-600 mt-1">Assignments are logged and require strict authorization for privileged roles.</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-6">{renderMain()}</div>
            </div>
        </div>
    );
}
