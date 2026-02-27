import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function UserEditModal({
    open,
    onClose,
    onSave,
    user,
    name,
    setName,
    roleId,
    setRoleId,
    roles,
    scopeType,
    setScopeType,
    region,
    setRegion,
    branchId,
    setBranchId,
    branchSearch,
    setBranchSearch,
    branches,
    branchesStatus,
    filteredBranches,
    status,
    error
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close edit"
            />
            <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Edit User Account</h3>
                        <p className="text-sm text-slate-500 mt-1">Modify role and organizational access bounds.</p>
                    </div>
                    <button
                        type="button"
                        className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-100 rounded-full transition-colors"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <Icon name="x" className="h-5 w-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                            <input
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 px-4 transition-all"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter full name"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Primary Role</label>
                            <select
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 px-4 transition-all cursor-pointer"
                                value={roleId}
                                onChange={(e) => setRoleId(e.target.value)}
                            >
                                <option value="">Select a role...</option>
                                {roles.map((r) => (
                                    <option key={r.id} value={r.id}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Access Boundary</label>
                            <select
                                className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 px-4 transition-all cursor-pointer"
                                value={scopeType}
                                onChange={(e) => setScopeType(e.target.value)}
                            >
                                <option value="global">Global Access (Unrestricted)</option>
                                <option value="regional">Regional Hub</option>
                                <option value="branch">Specific Branch</option>
                            </select>
                        </div>

                        {scopeType === 'regional' && (
                            <div className="space-y-2">
                                <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Region Name</label>
                                <input
                                    className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 px-4 transition-all"
                                    value={region}
                                    onChange={(e) => setRegion(e.target.value)}
                                    placeholder="e.g. West Africa, HQ"
                                />
                            </div>
                        )}

                        {scopeType === 'branch' && (
                            <div className="md:col-span-2 space-y-4 pt-2 bg-slate-50 p-4 rounded-xl border border-slate-200 border-dashed">
                                <div className="space-y-2">
                                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest pl-1">Assign to Branch</label>
                                    <div className="relative">
                                        <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400 pointer-events-none">
                                            <Icon name="search" className="h-4 w-4" />
                                        </span>
                                        <input
                                            className="block w-full rounded-xl border-slate-200 bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 pl-10 pr-4 transition-all"
                                            placeholder="Search branches..."
                                            value={branchSearch}
                                            onChange={(e) => setBranchSearch(e.target.value)}
                                        />
                                    </div>
                                </div>

                                <select
                                    className="block w-full rounded-xl border-slate-200 bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 text-sm py-2.5 px-4 transition-all cursor-pointer"
                                    value={branchId}
                                    onChange={(e) => setBranchId(e.target.value)}
                                    disabled={branchesStatus !== 'success'}
                                >
                                    <option value="">Choose a branch...</option>
                                    {branchesStatus === 'success' && filteredBranches.slice(0, 50).map((b) => (
                                        <option key={b.id} value={String(b.id)}>
                                            {b.name}
                                        </option>
                                    ))}
                                </select>
                                {branchesStatus === 'loading' && <div className="text-xs text-slate-500 flex items-center gap-2"><Icon name="loader2" className="h-3 w-3 animate-spin" /> Loading branches...</div>}
                            </div>
                        )}
                    </div>

                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3">
                            <Icon name="alertCircle" className="h-5 w-5 shrink-0" />
                            <p className="font-medium">{error?.message || 'Verification failed. Please check your inputs.'}</p>
                        </div>
                    )}
                </div>

                <div className="p-6 bg-slate-50/80 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        type="button"
                        className="px-5 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-white text-sm font-bold transition-all disabled:opacity-50"
                        onClick={onClose}
                        disabled={status === 'submitting'}
                    >
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        className="px-5 py-2.5 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded-xl text-sm font-black shadow-lg shadow-[#0a1f43]/20 disabled:opacity-50 flex items-center gap-2 transition-all"
                        onClick={onSave}
                        disabled={status === 'submitting'}
                    >
                        {status === 'submitting' && <Icon name="loader2" className="h-4 w-4 animate-spin" />}
                        {status === 'submitting' ? 'Updating...' : 'Save User Profile'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function UserConfirmModal({ open, mode, user, onClose, onConfirm, status, error }) {
    if (!open) return null;

    const isActivate = mode === 'activate';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <button
                type="button"
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={onClose}
                aria-label="Close confirmation"
            />
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
                <div className="p-6 border-b border-slate-200 flex flex-col items-center text-center">
                    <div className={["w-14 h-14 rounded-full flex items-center justify-center mb-4 border-4", isActivate ? "bg-green-50 border-green-100 text-green-600" : "bg-red-50 border-red-100 text-red-600"].join(' ')}>
                        <Icon name={isActivate ? "checkCircle" : "alertTriangle"} className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-black text-slate-800">
                        {isActivate ? 'Reactivate Account' : 'Suspend Access'}
                    </h3>
                    <p className="text-sm text-slate-500 mt-2 font-medium">
                        User: <span className="text-slate-800 font-bold">{user?.name || user?.email || 'this user'}</span>
                    </p>
                </div>

                <div className="p-6 bg-slate-50/50">
                    {error && (
                        <div className="rounded-xl border border-red-200 bg-red-100/50 p-4 text-sm text-red-700 mb-4 flex gap-2">
                            <Icon name="alertCircle" className="h-5 w-5 shrink-0" />
                            <span className="font-bold">{error?.message || 'Operation failed.'}</span>
                        </div>
                    )}
                    <div className="text-sm text-slate-600 text-center leading-relaxed">
                        {isActivate
                            ? 'This action will restore all system privileges and allow the user to sign in immediately.'
                            : 'This will immediately revoke all access rights. The user will be logged out and blocked from further system interaction.'}
                    </div>
                </div>

                <div className="p-6 border-t border-slate-200 flex flex-col sm:flex-row-reverse gap-3 bg-white">
                    <button
                        type="button"
                        className={[
                            'w-full sm:w-auto px-6 py-2.5 rounded-xl text-sm font-black text-white shadow-lg transition-all flex items-center justify-center gap-2',
                            isActivate ? 'bg-green-600 hover:bg-green-700 shadow-green-600/20' : 'bg-red-600 hover:bg-red-700 shadow-red-600/20',
                        ].join(' ')}
                        onClick={onConfirm}
                        disabled={status === 'submitting'}
                    >
                        {status === 'submitting' && <Icon name="loader2" className="h-4 w-4 animate-spin" />}
                        {status === 'submitting' ? 'Processing...' : isActivate ? 'Yes, Reactivate' : 'Yes, Suspend Account'}
                    </button>
                    <button
                        type="button"
                        className="w-full sm:w-auto px-6 py-2.5 border border-slate-300 rounded-xl text-slate-700 hover:bg-slate-50 text-sm font-bold transition-all disabled:opacity-50"
                        onClick={onClose}
                        disabled={status === 'submitting'}
                    >
                        Nevermind
                    </button>
                </div>
            </div>
        </div>
    );
}
