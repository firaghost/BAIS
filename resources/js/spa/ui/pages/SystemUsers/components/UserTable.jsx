import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';
import { initials, rolePill, statusUi } from '../lib/user-utils.js';

function StatusCell({ status }) {
    const ui = statusUi(status);
    return (
        <span className={["flex items-center gap-1.5 font-semibold", ui.className].join(' ')}>
            <span className={["w-1.5 h-1.5 rounded-full", ui.dotClassName].join(' ')} />
            {ui.label}
        </span>
    );
}

export function UserTable({ users, status, onEdit, onActivate, onDeactivate, meta, onPageChange, pages }) {
    const canPrev = (Number(meta?.current_page) || 1) > 1;
    const canNext = (Number(meta?.current_page) || 1) < (Number(meta?.last_page) || 1);

    return (
        <div className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden flex flex-col">
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-bold border-b border-slate-200">
                        <tr>
                            <th className="px-6 py-4">Name</th>
                            <th className="px-6 py-4">Email Address</th>
                            <th className="px-6 py-4">Primary Role</th>
                            <th className="px-6 py-4">Assigned Scope</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-sm">
                        {status === 'loading' && (
                            <tr><td className="px-6 py-12 text-center text-slate-500" colSpan={6}>Loading users...</td></tr>
                        )}
                        {status === 'error' && (
                            <tr><td className="px-6 py-12 text-center text-red-700 font-medium" colSpan={6}>Failed to load users.</td></tr>
                        )}
                        {status === 'success' && users.length === 0 && (
                            <tr><td className="px-6 py-12 text-center text-slate-500" colSpan={6}>No users found.</td></tr>
                        )}
                        {status === 'success' && users.map((u) => (
                            <tr key={u.id} className="hover:bg-slate-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs border border-slate-200">
                                            {initials(u.name)}
                                        </div>
                                        <span className="font-bold text-slate-800">{u.name}</span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-slate-600 font-medium">{u.email}</td>
                                <td className="px-6 py-4">
                                    <span className={['px-2.5 py-1 text-[10px] font-black rounded-lg uppercase tracking-wider border shadow-sm', rolePill(u.primary_role_slug)].join(' ')}>
                                        {u.primary_role_name || '—'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-slate-600 text-xs italic">{u.scope_label || '—'}</td>
                                <td className="px-6 py-4 flex justify-center"><StatusCell status={u.status} /></td>
                                <td className="px-6 py-4 text-right whitespace-nowrap">
                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            type="button"
                                            className="p-1.5 text-slate-400 hover:text-[#0a1f43] hover:bg-slate-100 rounded-lg transition-all"
                                            onClick={() => onEdit(u)}
                                            title="Edit user"
                                        >
                                            <Icon name="edit" className="h-4 w-4" />
                                        </button>

                                        {u.status === 'inactive' ? (
                                            <button
                                                type="button"
                                                className="p-1.5 text-green-500 hover:text-green-700 hover:bg-green-50 rounded-lg transition-all"
                                                onClick={() => onActivate(u)}
                                                title="Activate user"
                                            >
                                                <Icon name="checkCircle" className="h-4 w-4" />
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                onClick={() => onDeactivate(u)}
                                                title="Deactivate user"
                                            >
                                                <Icon name="slash" className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center mt-auto">
                <button
                    type="button"
                    onClick={() => onPageChange(meta?.current_page - 1)}
                    disabled={!canPrev}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                    <Icon name="chevronLeft" className="h-4 w-4" />
                    Previous
                </button>

                <div className="flex gap-1.5">
                    {pages.map((p) => (
                        <button
                            key={p}
                            type="button"
                            onClick={() => onPageChange(p)}
                            className={[
                                'w-8 h-8 flex items-center justify-center rounded-lg text-sm font-bold border transition-all',
                                (Number(meta?.current_page) || 1) === p
                                    ? 'bg-[#0a1f43] text-white border-[#0a1f43] shadow-md'
                                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300',
                            ].join(' ')}
                        >
                            {p}
                        </button>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={() => onPageChange(meta?.current_page + 1)}
                    disabled={!canNext}
                    className="px-3 py-1.5 text-sm font-bold text-slate-600 border border-slate-200 rounded-lg bg-white hover:bg-slate-50 flex items-center gap-1 disabled:opacity-50 transition-colors"
                >
                    Next
                    <Icon name="chevronRight" className="h-4 w-4" />
                </button>
            </div>
        </div>
    );
}
