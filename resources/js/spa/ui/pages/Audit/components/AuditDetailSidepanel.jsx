import React from 'react';
import { formatIso, formatModelType } from '../../../lib/format.js';
import { Icon } from '../../../shared/Icon.jsx';

export function AuditDetailSidepanel({ detailOpen, closeDetail, detailLog, copyText }) {
    if (!detailOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeDetail} />
            <div className="absolute inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-2xl flex flex-col transform transition-transform">
                <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-700 shadow-sm">
                            <Icon name="fileText" className="h-5 w-5" />
                        </div>
                        <div>
                            <div className="font-bold text-slate-800">Audit Event Details</div>
                            <div className="text-xs text-slate-500 font-medium tracking-wide">Record #{detailLog?.id ?? '—'}</div>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={closeDetail}
                        className="rounded-full bg-white p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors shadow-sm border border-slate-200"
                    >
                        <Icon name="x" className="h-4 w-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-auto p-6 space-y-6">
                    <div className="grid grid-cols-1 gap-4">
                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex gap-1.5 items-center">
                                <Icon name="clock" className="h-3 w-3" /> Timestamp
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-md border border-slate-100">
                                <div className="font-mono text-sm font-semibold text-slate-800">{formatIso(detailLog?.created_at)}</div>
                                <button type="button" onClick={() => copyText(detailLog?.created_at)} className="text-slate-400 hover:text-[#0a1f43] transition-colors p-1" title="Copy">
                                    <Icon name="copy" className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex gap-1.5 items-center">
                                <Icon name="user" className="h-3 w-3" /> Actor
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-md border border-slate-100">
                                <div className="text-sm font-bold text-slate-800">{detailLog?.actor_name || detailLog?.actor_email || `User #${detailLog?.user_id ?? '—'}`}</div>
                                <button type="button" onClick={() => copyText(detailLog?.actor_email)} className="text-slate-400 hover:text-[#0a1f43] transition-colors p-1" title="Copy">
                                    <Icon name="copy" className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex gap-1.5 items-center">
                                <Icon name="activity" className="h-3 w-3" /> Action
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-md border border-slate-100">
                                <div className="text-sm font-bold text-slate-800 tracking-wide font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-200">{detailLog?.action || '—'}</div>
                                <button type="button" onClick={() => copyText(detailLog?.action)} className="text-slate-400 hover:text-[#0a1f43] transition-colors p-1" title="Copy">
                                    <Icon name="copy" className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex gap-1.5 items-center">
                                <Icon name="database" className="h-3 w-3" /> Model Reference
                            </div>
                            <div className="bg-white p-2 text-sm font-bold text-slate-800 rounded-md border border-slate-100">
                                {detailLog?.model_type ? formatModelType(detailLog.model_type) : '—'}
                                {detailLog?.model_id ? <span className="text-slate-400 ml-1">#{detailLog.model_id}</span> : ''}
                            </div>
                        </div>

                        <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 shadow-sm">
                            <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1.5 flex gap-1.5 items-center">
                                <Icon name="globe" className="h-3 w-3" /> Source IP
                            </div>
                            <div className="flex items-center justify-between gap-3 bg-white p-2 rounded-md border border-slate-100">
                                <div className="font-mono text-sm font-semibold text-slate-800">{detailLog?.ip_address || '—'}</div>
                                <button type="button" onClick={() => copyText(detailLog?.ip_address)} className="text-slate-400 hover:text-[#0a1f43] transition-colors p-1" title="Copy">
                                    <Icon name="copy" className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-200">
                        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden text-sm">
                            <div className="bg-slate-50 border-b border-slate-200 px-4 py-2 text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                <Icon name="code" className="h-3 w-3" />
                                Details payload
                            </div>
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <div className="text-xs font-bold text-slate-500 mb-2">Old Values</div>
                                    <pre className="text-[10px] sm:text-xs font-mono bg-slate-900 text-slate-300 rounded-lg p-3 overflow-auto max-h-48 border border-slate-800 shadow-inner">
                                        {detailLog?.old_values ? JSON.stringify(detailLog.old_values, null, 2) : '—'}
                                    </pre>
                                </div>
                                <div>
                                    <div className="text-xs font-bold text-slate-500 mb-2">New Values</div>
                                    <pre className="text-[10px] sm:text-xs font-mono bg-slate-900 text-green-400 rounded-lg p-3 overflow-auto max-h-48 border border-slate-800 shadow-inner">
                                        {detailLog?.new_values ? JSON.stringify(detailLog.new_values, null, 2) : '—'}
                                    </pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
