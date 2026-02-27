import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function UserReviewStep({ form, selectedRoleUi, scopeHint, onBack, onSubmit, createState, branchName }) {
    return (
        <section className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f43]/10 flex items-center justify-center text-[#0a1f43] font-black shadow-inner">
                        3
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">Final Authorization</h2>
                </div>
                <p className="text-sm text-slate-500 ml-11 font-medium">Review the configuration before permanently writing to the directory.</p>
            </div>

            <div className="p-8 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
                    {/* Decorative connector for desktop */}
                    <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-px bg-slate-100 -translate-x-1/2" />

                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Icon name="user" className="h-4 w-4" /> Identity
                        </h3>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4 shadow-sm">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Full Name</div>
                                <div className="text-base font-black text-slate-800">{form.name || '—'}</div>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Corporate Email</div>
                                <div className="text-sm font-semibold text-slate-700 font-mono">{form.email || '—'}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Icon name="shield" className="h-4 w-4" /> Authority
                        </h3>
                        <div className="bg-slate-50 p-5 rounded-xl border border-slate-100 space-y-4 shadow-sm">
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Primary Role</div>
                                <div className="text-base font-black text-[#0a1f43] flex items-center gap-2">
                                    <Icon name={selectedRoleUi.icon} className="h-5 w-5" />
                                    {selectedRoleUi.label}
                                </div>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div>
                                <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Scope</div>
                                <div className="text-sm font-black text-slate-700 capitalize">
                                    {form.access_scope_type}
                                    {form.access_scope_type === 'regional' && <span className="text-blue-600 ml-1">({form.access_scope_region})</span>}
                                    {form.access_scope_type === 'branch' && <span className="text-green-600 ml-1">({branchName || 'Unknown'})</span>}
                                </div>
                                <div className="mt-1.5 text-xs text-slate-500 font-medium leading-relaxed">{scopeHint}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {createState.status === 'error' && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex gap-3 items-start shadow-inner">
                        <Icon name="xCircle" className="h-5 w-5 shrink-0 mt-0.5" />
                        <div>
                            <span className="font-black block mb-0.5">Provisioning Failed</span>
                            {createState.error?.message || 'The system rejected the configuration.'}
                        </div>
                    </div>
                )}

                {createState.status === 'success' && createState.result?.temporary_password && (
                    <div className="rounded-xl border-2 border-green-500 bg-green-50 p-6 shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/10 rounded-bl-full -mr-10 -mt-10" />
                        <div className="flex items-center gap-3 text-green-700 mb-4 relative z-10">
                            <Icon name="checkCircle" className="h-6 w-6" />
                            <div className="text-lg font-black">Identity Provisioned Successfully</div>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-green-200 shadow-sm relative z-10">
                            <div className="text-xs font-black text-green-800 uppercase tracking-widest mb-2">Initial Authentication Credential</div>
                            <div className="flex items-center gap-2">
                                <code className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-mono text-slate-800 font-bold tracking-wider break-all shadow-inner">
                                    {String(createState.result.temporary_password)}
                                </code>
                                <button
                                    type="button"
                                    className="px-4 py-3 text-sm border border-slate-200 bg-white rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all font-bold text-slate-700 shadow-sm flex items-center gap-2"
                                    onClick={() => navigator.clipboard.writeText(String(createState.result.temporary_password))}
                                >
                                    <Icon name="copy" className="h-4 w-4" />
                                    Copy
                                </button>
                            </div>
                            <p className="text-xs text-slate-500 mt-3 font-medium flex gap-1 items-start">
                                <Icon name="info" className="h-3.5 w-3.5 mt-0.5" />
                                This credential is shown only once and cannot be retrieved later. Document it securely before leaving this page.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-200 flex justify-between gap-3">
                <button
                    type="button"
                    className="px-6 py-2.5 border border-slate-200 rounded-xl text-slate-600 hover:bg-white text-sm font-bold transition-all shadow-sm"
                    onClick={onBack}
                    disabled={createState.status === 'submitting'}
                >
                    Previous Step
                </button>
                <button
                    type="button"
                    className={[
                        "px-8 py-2.5 rounded-xl text-sm font-black shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:shadow-none",
                        createState.status === 'success'
                            ? "bg-green-600 text-white shadow-green-600/20"
                            : "bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white shadow-[#0a1f43]/20 hover:-translate-y-0.5"
                    ].join(' ')}
                    onClick={onSubmit}
                    disabled={createState.status === 'submitting' || createState.status === 'success'}
                >
                    {createState.status === 'submitting' && <Icon name="loader2" className="h-4 w-4 animate-spin" />}
                    {createState.status === 'submitting'
                        ? 'Writing to Directory...'
                        : createState.status === 'success'
                            ? 'Provisioned'
                            : 'Authorize & Provision Identity'}
                </button>
            </div>
        </section>
    );
}
