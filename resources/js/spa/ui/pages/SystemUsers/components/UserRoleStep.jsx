import React, { useMemo } from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function UserRoleStep({ form, setForm, roles, roleUi, scopeHint, onBack, onContinue, selectedRole, branches, branchesStatus }) {

    const filteredBranches = useMemo(() => {
        const query = String(form.branch_search || '').toLowerCase().trim();
        if (!query) return branches;
        return branches.filter(b => String(b.name).toLowerCase().includes(query));
    }, [branches, form.branch_search]);

    return (
        <section className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f43]/10 flex items-center justify-center text-[#0a1f43] font-black shadow-inner">
                        2
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Access & Authority</h2>
                </div>
                <p className="text-sm text-slate-500 ml-11 font-medium">Define the operational capabilities and data boundaries for this identity.</p>
            </div>

            <div className="p-8 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <Icon name="shield" className="h-4 w-4" />
                    Primary Functional Role
                </h3>

                {roles.status === 'loading' && <div className="text-sm text-slate-500 flex items-center gap-2 py-4"><Icon name="loader2" className="h-4 w-4 animate-spin" /> Loading authority matrix...</div>}
                {roles.status === 'error' && <div className="text-sm text-red-700 py-4 font-bold border rounded-lg bg-red-50 border-red-200 px-4">Failed to load roles. Please refresh.</div>}

                {roles.status === 'success' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {roles.data.map((opt) => {
                            const ui = roleUi(opt.slug, opt.name);
                            const checked = Number(form.role_id) === opt.id;

                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => setForm((prev) => ({ ...prev, role_id: opt.id }))}
                                    className={[
                                        'p-5 border-2 rounded-xl text-left transition-all h-full relative overflow-hidden group',
                                        checked ? 'border-[#C9A227] bg-blue-50/30' : 'border-slate-100 hover:border-slate-300 hover:bg-slate-50',
                                    ].join(' ')}
                                >
                                    {checked && <div className="absolute top-0 right-0 w-16 h-16 bg-[#C9A227]/10 rounded-bl-full -mr-8 -mt-8" />}
                                    <div className="flex justify-between items-start mb-3 relative z-10">
                                        <div className={["w-10 h-10 rounded-lg flex items-center justify-center shadow-sm", checked ? "bg-white text-[#0a1f43]" : "bg-slate-100 text-slate-500 group-hover:bg-white group-hover:text-[#0a1f43]"].join(' ')}>
                                            <Icon name={ui.icon} className="h-5 w-5" />
                                        </div>
                                        {ui.badge && (
                                            <span className={["px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-lg border", ui.badge.className].join(' ')}>
                                                {ui.badge.text}
                                            </span>
                                        )}
                                    </div>
                                    <div className="font-black text-slate-800 mb-1.5">{ui.label}</div>
                                    <div className="text-xs text-slate-500 leading-relaxed font-medium">{ui.description}</div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>

            <div className="p-8 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-5 flex items-center gap-2">
                    <Icon name="globe" className="h-4 w-4" />
                    Data Visibility Boundary
                </h3>

                <div className="max-w-2xl bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6">
                    <div className="space-y-4">
                        <label className="block text-sm font-bold text-slate-800">Select Scope Level</label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {['global', 'regional', 'branch'].map(type => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setForm((prev) => ({
                                        ...prev,
                                        access_scope_type: type,
                                        access_scope_region: type === 'regional' ? prev.access_scope_region : '',
                                        access_scope_branch_id: type === 'branch' ? prev.access_scope_branch_id : '',
                                    }))}
                                    className={[
                                        'py-3 px-4 border rounded-lg text-sm font-bold transition-all text-center',
                                        form.access_scope_type === type
                                            ? 'bg-[#0a1f43] text-white border-[#0a1f43] shadow-md'
                                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:border-slate-300'
                                    ].join(' ')}
                                >
                                    {type === 'global' ? 'Global' : type === 'regional' ? 'Regional Hub' : 'Single Branch'}
                                </button>
                            ))}
                        </div>
                    </div>

                    {form.access_scope_type === 'regional' && (
                        <div className="space-y-2 pt-4 border-t border-slate-100">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Specify Region Identity</label>
                            <input
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 sm:text-sm py-2.5 px-4 transition-all"
                                placeholder="e.g. LATAM, EMEA North..."
                                value={form.access_scope_region}
                                onChange={(e) => setForm((prev) => ({ ...prev, access_scope_region: e.target.value }))}
                            />
                        </div>
                    )}

                    {form.access_scope_type === 'branch' && (
                        <div className="space-y-3 pt-4 border-t border-slate-100">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Assign Target Branch</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                                    <Icon name="search" className="h-4 w-4" />
                                </span>
                                <input
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 pl-10 pr-4 transition-all"
                                    placeholder="Search specific branch..."
                                    value={form.branch_search}
                                    onChange={(e) => setForm((prev) => ({ ...prev, branch_search: e.target.value }))}
                                />
                            </div>

                            <select
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 px-4 transition-all cursor-pointer"
                                value={form.access_scope_branch_id}
                                onChange={(e) => setForm((prev) => ({ ...prev, access_scope_branch_id: e.target.value }))}
                                disabled={branchesStatus !== 'success'}
                            >
                                <option value="">Select branch designation...</option>
                                {branchesStatus === 'success' && filteredBranches.slice(0, 50).map((b) => (
                                    <option key={b.id} value={String(b.id)}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                            {branchesStatus === 'loading' && <div className="text-xs text-slate-500 flex items-center gap-2"><Icon name="loader2" className="h-3 w-3 animate-spin" /> Loading repository...</div>}
                        </div>
                    )}

                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex gap-2">
                        <Icon name="info" className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                        <p className="text-xs text-slate-600 font-medium">{scopeHint}</p>
                    </div>
                </div>

                <div className="mt-8 rounded-xl border border-red-200 bg-red-50 p-5 shadow-inner max-w-2xl">
                    <div className="flex gap-4 items-start">
                        <div className="p-2 bg-red-100 rounded-lg text-red-700 shrink-0 shadow-sm">
                            <Icon name="alertTriangle" className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-red-900 tracking-tight">Compliance Warning</h4>
                            <p className="text-sm text-red-800/80 mt-1 leading-relaxed font-medium">
                                Assigning Super Admin or Global scope grants visibility to sensitive PII and infrastructure controls. Verification of corporate privacy training is required before proceeding.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-5 bg-white border-t border-slate-200 flex justify-between gap-3">
                <button
                    type="button"
                    className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 text-sm font-bold transition-all shadow-sm"
                    onClick={onBack}
                >
                    Previous Step
                </button>
                <button
                    type="button"
                    className="px-8 py-2.5 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded-xl text-sm font-black shadow-lg shadow-[#0a1f43]/20 transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:shadow-none flex items-center gap-2"
                    onClick={onContinue}
                    disabled={!selectedRole || (form.access_scope_type === 'branch' && !form.access_scope_branch_id)}
                >
                    Final Review
                    <Icon name="checkSquare" className="h-4 w-4" />
                </button>
            </div>
        </section>
    );
}
