import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

function StatusBadge({ status }) {
    const configs = {
        active: { text: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500' },
        on_leave: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500' },
        suspended: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500' },
    };
    const config = configs[status] || configs.active;
    const label = status === 'active' ? 'Active' : status === 'on_leave' ? 'On Leave' : 'Suspended';
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-slate-200`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5`} />
            {label}
        </span>
    );
}

export function EmployeeTable({ state, employees, meta, selectedIds, allChecked, onToggleAll, onToggleOne, onRowClick, onEditClick, onDeleteClick, onLeaveClick, onPrevPage, onNextPage }) {
    return (
        <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden flex-1 flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500 font-semibold">
                            <th className="px-6 py-4 w-12">
                                <input className="rounded border-slate-300 text-[#0a1f43] focus:ring-[#0a1f43] h-4 w-4" type="checkbox" checked={allChecked} onChange={onToggleAll} />
                            </th>
                            <th className="px-6 py-4">Employee</th>
                            <th className="px-6 py-4">Role &amp; Dept</th>
                            <th className="px-6 py-4">Branch</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4 text-center">Att. Score</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        {state.status === 'loading' ? (
                            <tr><td className="px-6 py-6 text-slate-500" colSpan={8}>Loading employees...</td></tr>
                        ) : state.status === 'error' ? (
                            <tr><td className="px-6 py-6 text-red-600" colSpan={8}>Failed to load employees.</td></tr>
                        ) : employees.length === 0 ? (
                            <tr><td className="px-6 py-6 text-slate-500" colSpan={8}>No employees found.</td></tr>
                        ) : (
                            employees.map((emp) => {
                                const score = Number(emp.compliance_score ?? 0);
                                const scorePct = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 0;
                                const branchName = emp.branch_name || emp.branch?.name || '—';
                                return (
                                    <tr key={emp.id} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => onRowClick(emp)}>
                                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                                            <input className="rounded border-slate-300 text-[#0a1f43] focus:ring-[#0a1f43] h-4 w-4" type="checkbox" checked={selectedIds.has(emp.id)} onChange={() => onToggleOne(emp.id)} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                {emp.photo_path
                                                    ? <img src={emp.photo_path} alt="" className="w-10 h-10 rounded-full object-cover" />
                                                    : <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-sm font-medium text-slate-700">{emp.initials || '—'}</div>
                                                }
                                                <div>
                                                    <div className="font-medium text-slate-900">{emp.full_name || emp.name}</div>
                                                    <div className="text-xs text-slate-500">{emp.email || '—'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-slate-700">{emp.job_title || '—'}</div>
                                            <div className="text-xs text-slate-500">{emp.department || '—'}</div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">{branchName}</td>
                                        <td className="px-6 py-4"><StatusBadge status={emp.status || 'active'} /></td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex items-center gap-2">
                                                <div className="w-16 bg-slate-200 rounded-full h-1.5">
                                                    <div
                                                        className={`${scorePct >= 90 ? 'bg-green-500' : scorePct >= 75 ? 'bg-[#C9A227]' : 'bg-red-500'} h-1.5 rounded-full`}
                                                        style={{ width: `${scorePct}%` }}
                                                    />
                                                </div>
                                                <span className={`text-xs font-bold ${scorePct >= 90 ? 'text-green-600' : scorePct >= 75 ? 'text-[#C9A227]' : 'text-red-500'}`}>{scorePct}%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                                <button type="button" className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#0a1f43] rounded transition-colors" title="Set Leave Days" onClick={() => onLeaveClick(emp)}>
                                                    <Icon name="calendar" className="h-4 w-4" />
                                                </button>
                                                <button type="button" className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-[#0a1f43] rounded transition-colors" title="Edit" onClick={() => onEditClick(emp)}>
                                                    <Icon name="pencil" className="h-4 w-4" />
                                                </button>
                                                <button type="button" className="p-1.5 hover:bg-red-100 text-slate-500 hover:text-red-600 rounded transition-colors" title="Delete" onClick={() => onDeleteClick(emp)}>
                                                    <Icon name="trash2" className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                <span className="text-xs text-slate-500">Showing {employees.length} of {meta.total} employees</span>
                <div className="flex gap-2">
                    <button className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50" onClick={onPrevPage} disabled={meta.current_page <= 1}>Previous</button>
                    <button className="px-3 py-1 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50" onClick={onNextPage} disabled={meta.current_page >= meta.last_page}>Next</button>
                </div>
            </div>
        </div>
    );
}
