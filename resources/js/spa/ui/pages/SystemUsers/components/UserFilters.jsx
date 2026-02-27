import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function UserFilters({ search, onSearchChange, roleId, onRoleChange, roles, totalText }) {
    return (
        <div className="p-4 border-b border-slate-200 flex flex-wrap gap-4 items-center justify-between bg-white">
            <div className="flex gap-2 flex-wrap items-center">
                <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <Icon name="search" className="h-4 w-4" />
                    </span>
                    <input
                        className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm w-64 focus:ring-2 focus:ring-[#0a1f43] focus:border-[#0a1f43] bg-slate-50 transition-all"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => onSearchChange(e.target.value)}
                    />
                </div>

                <select
                    className="border border-slate-200 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-[#0a1f43] bg-slate-50 cursor-pointer"
                    value={roleId}
                    onChange={(e) => onRoleChange(e.target.value)}
                >
                    <option value="">All Roles</option>
                    {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.name}
                        </option>
                    ))}
                </select>
            </div>

            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
                {totalText}
            </div>
        </div>
    );
}
