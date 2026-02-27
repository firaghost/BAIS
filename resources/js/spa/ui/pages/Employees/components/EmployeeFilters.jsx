import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function EmployeeFilters({ search, branches, departments, branchId, department, status, activeChips, onSearchChange, onBranchChange, onDepartmentChange, onStatusChange, onClearAll }) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-soft border border-slate-200">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="relative lg:col-span-2">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="search" className="h-4 w-4" />
                    </span>
                    <input
                        className="w-full pl-10 pr-4 py-2 rounded border border-slate-200 bg-slate-50 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent text-sm text-slate-800 placeholder-slate-400"
                        placeholder="Search by name, ID or email..."
                        type="text"
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>
                <div>
                    <select className="w-full py-2 px-3 rounded border border-slate-200 bg-white text-sm text-slate-600 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent" value={branchId} onChange={(e) => onBranchChange(e.target.value)}>
                        <option value="">All Branches</option>
                        {branches.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                    </select>
                </div>
                <div>
                    <select className="w-full py-2 px-3 rounded border border-slate-200 bg-white text-sm text-slate-600 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent" value={department} onChange={(e) => onDepartmentChange(e.target.value)}>
                        <option value="">All Departments</option>
                        {departments.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                </div>
                <div>
                    <select className="w-full py-2 px-3 rounded border border-slate-200 bg-white text-sm text-slate-600 focus:ring-2 focus:ring-[#0a1f43] focus:border-transparent" value={status} onChange={(e) => onStatusChange(e.target.value)}>
                        <option value="">All Statuses</option>
                        <option value="active">Active</option>
                        <option value="on_leave">On Leave</option>
                        <option value="probation">Probation</option>
                        <option value="suspended">Suspended</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>
            </div>

            <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-100">
                <span className="text-xs font-medium text-slate-500 py-1">Active Filters:</span>
                {activeChips.length === 0 ? (
                    <span className="text-xs text-slate-400 py-1">None</span>
                ) : (
                    activeChips.map((chip) => (
                        <span key={chip.key} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">{chip.label}</span>
                    ))
                )}
                <button type="button" className="text-xs text-[#0a1f43] hover:underline ml-auto font-medium" onClick={onClearAll} disabled={activeChips.length === 0}>Clear All</button>
            </div>
        </div>
    );
}
