import React from 'react';
import { formatIso, formatModelType } from '../../../lib/format.js';
import { Icon } from '../../../shared/Icon.jsx';
import { auditSeverity, getEventDescription } from '../lib/audit-utils.js';

export function AuditTable({ state, logs, openDetail, showingLabel, perPage, setPerPage, page, setPage, meta }) {

    return (
        <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden flex flex-col flex-1 min-h-0">
            <div className="overflow-x-auto flex-1 min-h-0">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-bold">
                            <th className="px-6 py-4 w-12 text-center">
                                <Icon name="activity" className="h-4 w-4 text-slate-500 mx-auto" />
                            </th>
                            <th className="px-4 py-4">Timestamp (ISO 8601)</th>
                            <th className="px-4 py-4">User / Actor</th>
                            <th className="px-4 py-4">Action Type</th>
                            <th className="px-4 py-4">Details</th>
                            <th className="px-4 py-4">Source IP</th>
                            <th className="px-4 py-4 text-center">Severity</th>
                            <th className="px-6 py-4 text-right">Integrity</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm relative">
                        {state.status === 'loading' ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                                    Loading audit logs...
                                </td>
                            </tr>
                        ) : state.status === 'error' ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-red-600">
                                    Failed to load audit logs.
                                </td>
                            </tr>
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-slate-500">
                                    No audit logs found.
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => {
                                const sev = auditSeverity(log);
                                const actorLabel = log.actor_name || log.actor_email || `User #${log.user_id}`;
                                const initials = String(actorLabel)
                                    .split(' ')
                                    .filter(Boolean)
                                    .slice(0, 2)
                                    .map((p) => p[0]?.toUpperCase())
                                    .join('');

                                return (
                                    <tr
                                        key={log.id}
                                        onClick={() => openDetail(log)}
                                        className={`hover:bg-slate-50 transition-colors group cursor-pointer relative z-0 ${sev.row ? `${sev.row} border-l-4` : ''}`}
                                    >
                                        <td className="px-6 py-4 text-center relative">
                                            <div className={`w-2.5 h-2.5 rounded-full mx-auto ring-4 ring-white ${sev.dot}`}></div>
                                        </td>
                                        <td className="px-4 py-4 font-mono text-slate-600 whitespace-nowrap">{formatIso(log.created_at)}</td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                                                    {initials || '—'}
                                                </div>
                                                <span className="font-medium text-slate-800">{actorLabel}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-medium border border-slate-200">
                                                <Icon name="fileText" className="h-3.5 w-3.5" />
                                                {String(log.action ?? '—')}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-slate-600 max-w-xs truncate">
                                            {getEventDescription(log.action)}
                                            {log.model_type ? (
                                                <span className="text-xs text-slate-400 block mt-0.5">
                                                    {formatModelType(log.model_type)}{log.model_id ? ` #${log.model_id}` : ''}
                                                </span>
                                            ) : null}
                                        </td>
                                        <td className="px-4 py-4 font-mono text-xs text-slate-500">{log.ip_address || '—'}</td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${sev.bg}`}>{sev.label}</span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <Icon name="lock" className="h-5 w-5 text-green-500 inline" />
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                <span className="text-xs text-slate-500">{showingLabel}</span>
                <div className="flex gap-2 items-center">
                    <div className="flex items-center mr-4">
                        <span className="text-xs text-slate-500 mr-2">Rows per page:</span>
                        <select
                            className="text-xs border-slate-200 rounded bg-white py-1 pl-2 pr-6"
                            value={perPage}
                            onChange={(e) => {
                                const next = Number(e.target.value || 25);
                                setPerPage(next);
                                setPage(1);
                            }}
                        >
                            <option value={25}>25</option>
                            <option value={50}>50</option>
                            <option value={100}>100</option>
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={meta.current_page <= 1}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                        <Icon name="chevronLeft" className="h-4 w-4" />
                        Previous
                    </button>
                    <button
                        type="button"
                        onClick={() => setPage((p) => Math.min(meta.last_page, p + 1))}
                        disabled={meta.current_page >= meta.last_page}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                    >
                        Next
                        <Icon name="chevronRight" className="h-4 w-4" />
                    </button>
                </div>
            </div>
        </div>
    );
}
