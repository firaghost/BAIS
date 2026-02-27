import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';

import { safeGet, safePost } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { StepProgressNav } from './components/StepProgressNav.jsx';
import { UserDetailsStep } from './components/UserDetailsStep.jsx';
import { UserReviewStep } from './components/UserReviewStep.jsx';
import { UserRoleStep } from './components/UserRoleStep.jsx';
import { normalizeRoles } from './lib/user-utils.js';

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

export function SystemUsersPage() {
    const [step, setStep] = useState('details');

    const [roles, setRoles] = useState({ status: 'idle', data: [], error: null });
    const [branches, setBranches] = useState({ status: 'idle', data: [], error: null });

    const [form, setForm] = useState({
        name: '',
        email: '',
        role_id: null,
        access_scope_type: 'global',
        access_scope_region: '',
        access_scope_branch_id: '',
        branch_search: '',
    });

    const [createState, setCreateState] = useState({ status: 'idle', error: null, result: null });

    useEffect(() => {
        let active = true;

        (async () => {
            setRoles({ status: 'loading', data: [], error: null });
            setBranches({ status: 'loading', data: [], error: null });

            const [rolesRes, branchesRes] = await Promise.all([
                safeGet('/api/system-users/roles'),
                safeGet('/api/branches')
            ]);

            if (!active) return;

            if (rolesRes.ok) {
                const list = normalizeRoles(rolesRes.data?.data);
                setRoles({ status: 'success', data: list, error: null });
                setForm((prev) => {
                    if (prev.role_id) return prev;
                    return { ...prev, role_id: list[0]?.id ?? null };
                });
            } else {
                setRoles({ status: 'error', data: [], error: rolesRes.error });
            }

            if (branchesRes.ok) {
                setBranches({ status: 'success', data: Array.isArray(branchesRes.data?.data) ? branchesRes.data.data : [], error: null });
            } else {
                setBranches({ status: 'error', data: [], error: branchesRes.error });
            }
        })();

        return () => { active = false; };
    }, []);

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
            return `Identity is restricted strictly to entities and operations within "${form.access_scope_region.trim()}".`;
        }
        if (form.access_scope_type === 'branch' && form.access_scope_branch_id) {
            const b = branches.data.find(x => String(x.id) === String(form.access_scope_branch_id));
            if (b) return `Identity is isolated to view and manage data solely for ${b.name}.`;
        }
        if (form.access_scope_type === 'global') return 'Maximum visibility. Identity can access system-wide data across all regions and branches.';
        return 'Data visibility boundary is currently undefined.';
    }, [form.access_scope_region, form.access_scope_type, form.access_scope_branch_id, branches.data]);

    const createUser = async () => {
        if (createState.status === 'submitting') return;

        setCreateState({ status: 'submitting', error: null, result: null });

        const payload = {
            name: form.name.trim(),
            email: form.email.trim(),
            role_id: Number(form.role_id) || null,
            access_scope_type: form.access_scope_type,
            access_scope_region: form.access_scope_type === 'regional' ? form.access_scope_region.trim() : null,
            access_scope_branch_id: form.access_scope_type === 'branch' ? Number(form.access_scope_branch_id) : null,
        };

        const res = await safePost('/api/system-users', payload);

        if (!res.ok) {
            setCreateState({ status: 'error', error: res.error, result: null });
            return;
        }

        setCreateState({ status: 'success', error: null, result: res.data?.data ?? null });
    };

    const steps = [
        { id: 'details', label: 'Identity Provision', number: 1 },
        { id: 'role', label: 'Access & Boundary', number: 2 },
        { id: 'review', label: 'Final Verification', number: 3 },
    ];

    const activeStep = steps.find((s) => s.id === step) ?? steps[0];

    const renderMain = () => {
        if (step === 'details') {
            return (
                <UserDetailsStep
                    form={form}
                    setForm={setForm}
                    canContinue={canContinueToRole}
                    onContinue={() => setStep('role')}
                />
            );
        }
        if (step === 'role') {
            return (
                <UserRoleStep
                    form={form}
                    setForm={setForm}
                    roles={roles}
                    roleUi={roleUi}
                    scopeHint={scopeHint}
                    onBack={() => setStep('details')}
                    onContinue={() => setStep('review')}
                    selectedRole={selectedRole}
                    branches={branches.data}
                    branchesStatus={branches.status}
                />
            );
        }
        return (
            <UserReviewStep
                form={form}
                selectedRoleUi={selectedRoleUi}
                scopeHint={scopeHint}
                onBack={() => setStep('role')}
                onSubmit={createUser}
                createState={createState}
                branchName={branches.data.find(b => String(b.id) === String(form.access_scope_branch_id))?.name}
            />
        );
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-[#0a1f43]">User Provisioning</h2>
                    <p className="text-sm text-slate-500 font-medium mt-1">Configure and deploy new administrative identities.</p>
                </div>

                <NavLink
                    to="/system-users"
                    className="text-sm font-bold text-slate-500 hover:text-[#0a1f43] transition-colors flex items-center gap-1.5 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm"
                >
                    <Icon name="arrowLeft" className="h-4 w-4" />
                    Back to Directory
                </NavLink>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-start">
                <div className="w-full lg:w-72 flex-shrink-0 sticky top-6">
                    <StepProgressNav
                        steps={steps}
                        currentStepId={step}
                        onStepClick={setStep}
                    />

                    <div className="mt-8 p-5 rounded-2xl border border-blue-200/50 bg-blue-50/50 shadow-inner">
                        <div className="flex items-start gap-4">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-700 shrink-0 shadow-sm mt-0.5">
                                <Icon name="shield" className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-blue-900 tracking-tight">Security Protocol</h4>
                                <p className="text-xs text-blue-800/80 mt-1.5 leading-relaxed font-medium">
                                    Assignments are strictly logged. Authorization for privileged roles requires explicit justification in the next system audit.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 w-full min-w-0">
                    <div className="transition-all duration-300">
                        {renderMain()}
                    </div>
                </div>
            </div>
        </div>
    );
}
