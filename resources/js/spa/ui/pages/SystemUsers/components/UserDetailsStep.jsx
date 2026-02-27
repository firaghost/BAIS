import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function UserDetailsStep({ form, setForm, canContinue, onContinue }) {
    return (
        <section className="bg-white rounded-2xl shadow-soft border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-1">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#0a1f43]/10 flex items-center justify-center text-[#0a1f43] font-black shadow-inner">
                        1
                    </div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight">System Identity</h2>
                </div>
                <p className="text-sm text-slate-500 ml-11 font-medium">Establish the core identity and contact information for the new administrator.</p>
            </div>

            <div className="p-8 space-y-7">
                <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Full Name</label>
                    <input
                        className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 sm:text-sm py-3 px-4 transition-all"
                        value={form.name}
                        onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g. Sarah Connor"
                    />
                </div>

                <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest pl-1">Corporate Email Address</label>
                    <input
                        type="email"
                        className="block w-full rounded-xl border-slate-200 bg-slate-50 focus:bg-white focus:border-[#0a1f43] focus:ring-2 focus:ring-[#0a1f43]/10 sm:text-sm py-3 px-4 transition-all"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        placeholder="e.g. sarah.connor@company.com"
                    />
                </div>

                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-5 mt-8 shadow-inner">
                    <div className="flex gap-4 items-start">
                        <div className="p-2 bg-amber-100 rounded-lg text-amber-700 shrink-0 shadow-sm">
                            <Icon name="lock" className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-800 tracking-tight">Authentication Protocol</h4>
                            <p className="text-sm text-amber-700/80 mt-1 leading-relaxed font-medium">
                                The system will generate a secure temporary credential. The user will be forced to establish MFA and a permanent password upon initial login.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="px-8 py-5 bg-slate-50/80 border-t border-slate-200 flex justify-end">
                <button
                    type="button"
                    className="px-8 py-3 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded-xl text-sm font-black shadow-lg shadow-[#0a1f43]/20 transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0 flex items-center gap-2"
                    disabled={!canContinue}
                    onClick={onContinue}
                >
                    Proceed to Authorization
                    <Icon name="arrowRight" className="h-4 w-4" />
                </button>
            </div>
        </section>
    );
}
