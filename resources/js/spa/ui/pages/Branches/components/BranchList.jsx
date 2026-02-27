import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

function StatusBadge({ status, percentage }) {
    const configs = {
        compliant: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50' },
        review: { dot: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50' },
        critical: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50' },
    };
    const config = configs[status] || configs.compliant;

    return (
        <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${config.dot} ${status === 'critical' ? 'animate-pulse' : ''}`} />
            <span className={`${config.text} font-medium capitalize whitespace-nowrap`}>
                {status === 'compliant' ? 'Compliant' : status === 'review' ? 'Review' : 'Critical'} ({percentage}%)
            </span>
        </div>
    );
}

function DevicesBadge({ active, total }) {
    const ratio = total > 0 ? active / total : 1;
    const isWarning = ratio < 0.8;
    const isCritical = ratio < 0.72;

    const bgClass = isCritical
        ? 'bg-red-50 text-red-700 border-red-100'
        : isWarning
            ? 'bg-amber-50 text-amber-700 border-amber-100'
            : 'bg-slate-100 text-slate-800';

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${bgClass}`}>
            {active} / {total}
        </span>
    );
}

function Avatar({ initials }) {
    return (
        <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-medium text-slate-700">
            {initials}
        </div>
    );
}

function BranchAvatar({ code, color }) {
    const colorClasses = {
        blue: 'bg-blue-100 text-blue-600',
        indigo: 'bg-indigo-100 text-indigo-600',
        teal: 'bg-teal-100 text-teal-600',
        purple: 'bg-purple-100 text-purple-600',
        orange: 'bg-orange-100 text-orange-600',
        cyan: 'bg-cyan-100 text-cyan-600',
    };

    const cls = colorClasses[color] || colorClasses.blue;

    return (
        <div className={`w-8 h-8 rounded flex items-center justify-center font-bold text-xs ${cls}`}>
            {code}
        </div>
    );
}

function complianceFromDevices(activeDevices, totalDevices) {
    const active = Number.isFinite(activeDevices) ? activeDevices : 0;
    const total = Number.isFinite(totalDevices) ? totalDevices : 0;

    if (total <= 0) {
        return { status: 'review', percentage: 0 };
    }

    const pct = Math.max(0, Math.min(100, Math.round((active / total) * 100)));
    const status = pct >= 95 ? 'compliant' : pct >= 80 ? 'review' : 'critical';

    return { status, percentage: pct };
}

export function BranchList({ branches, meta, status, sortBy, onSortChange, onSelect, selectedBranchId, onEdit, onDelete, onPageChange, rowMenuOpenFor, setRowMenuOpenFor }) {
    return (
        <div className="flex-1 bg-white rounded-lg border border-slate-200 shadow-soft flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                <div>
                    <h2 className="text-base font-bold text-slate-800">All Branches</h2>
                    <p className="text-xs text-slate-500 mt-0.5">{meta.total} active locations found</p>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">Sort by:</span>
                    <select
                        className="text-xs border-none bg-slate-50 rounded py-1 pl-2 pr-6 text-slate-700 focus:ring-0 cursor-pointer font-medium"
                        value={sortBy}
                        onChange={(e) => onSortChange(e.target.value)}
                    >
                        <option value="name">Name (A-Z)</option>
                        <option value="devices">Devices (High-Low)</option>
                        <option value="radius">Radius (High-Low)</option>
                    </select>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                {status === 'loading' ? (
                    <div className="p-8 text-center text-slate-500">Loading branches...</div>
                ) : status === 'error' ? (
                    <div className="p-8 text-center text-red-600">Failed to load branches.</div>
                ) : branches.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">No branches found.</div>
                ) : (
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-slate-50 sticky top-0 z-10">
                            <tr className="text-xs uppercase tracking-wider text-slate-500 font-semibold border-b border-slate-200">
                                <th className="px-6 py-3 whitespace-nowrap">Branch Name</th>
                                <th className="px-6 py-3 whitespace-nowrap">Location</th>
                                <th className="px-6 py-3 whitespace-nowrap">Manager</th>
                                <th className="px-6 py-3 whitespace-nowrap text-center">Active Devices</th>
                                <th className="px-6 py-3 whitespace-nowrap">Compliance Status</th>
                                <th className="px-6 py-3 whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {branches.map((branch) => {
                                const compliance = complianceFromDevices(
                                    Number(branch.active_devices ?? 0),
                                    Number(branch.total_devices ?? 0),
                                );
                                return (
                                    <tr
                                        key={branch.id}
                                        className={`hover:bg-slate-50 transition-colors group cursor-pointer ${selectedBranchId === branch.id ? 'bg-slate-50' : ''
                                            }`}
                                        onClick={() => onSelect(branch)}
                                    >
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <BranchAvatar code={branch.code || branch.name?.slice(0, 2).toUpperCase()} color={branch.color || 'blue'} />
                                                <div>
                                                    <p className="font-medium text-slate-800">{branch.name}</p>
                                                    <p className="text-xs text-slate-500">ID: {`BR-${String(branch.id).padStart(3, '0')}`}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600">
                                            {[branch.address_line, branch.city, branch.state].filter(Boolean).join(', ') || '—'}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <Avatar initials={branch.manager_name ? branch.manager_name.split(' ').map((n) => n[0]).join('').slice(0, 2) : '—'} />
                                                <span className="text-slate-700 whitespace-nowrap">{branch.manager_name || '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <DevicesBadge active={branch.active_devices || 0} total={branch.total_devices || 0} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <StatusBadge status={compliance.status} percentage={compliance.percentage} />
                                        </td>
                                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                            <div className="relative inline-block text-left">
                                                <button
                                                    type="button"
                                                    className="text-slate-400 hover:text-[#0a1f43] transition-colors"
                                                    onClick={() => setRowMenuOpenFor(rowMenuOpenFor === branch.id ? null : branch.id)}
                                                >
                                                    <Icon name="more" className="h-5 w-5" />
                                                </button>

                                                {rowMenuOpenFor === branch.id && (
                                                    <div
                                                        className="absolute right-0 z-20 mt-2 w-40 overflow-hidden rounded border border-slate-200 bg-white shadow-lg"
                                                        onMouseLeave={() => setRowMenuOpenFor(null)}
                                                    >
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                                            onClick={() => onEdit(branch)}
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            type="button"
                                                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                                            onClick={() => onDelete(branch)}
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-between items-center mt-auto">
                <span className="text-xs text-slate-500">
                    Showing {branches.length} of {meta.total} branches
                </span>
                <div className="flex gap-2">
                    <button
                        onClick={() => onPageChange(meta.current_page - 1)}
                        disabled={meta.current_page <= 1}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 font-medium"
                    >
                        Previous
                    </button>
                    <button
                        onClick={() => onPageChange(meta.current_page + 1)}
                        disabled={meta.current_page >= meta.last_page}
                        className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:bg-slate-50 disabled:opacity-50 font-medium"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
