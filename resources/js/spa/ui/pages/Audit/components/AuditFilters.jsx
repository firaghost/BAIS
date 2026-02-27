import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function AuditFilters({
    search,
    setSearch,
    eventType,
    setEventType,
    dateFrom,
    setDateFrom,
    dateTo,
    setDateTo,
    category,
    setCategory,
    rangeLabel,
    clearFilters,
    setPage
}) {
    return (
        <div className="bg-white p-4 rounded-lg shadow-soft border border-slate-200 flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-md px-3 py-2 w-full md:w-80">
                    <Icon name="calendar" className="h-4 w-4 text-slate-400 mr-2" />
                    <span className="text-sm text-slate-700">{rangeLabel}</span>
                </div>

                <div className="relative w-full md:w-72">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Icon name="search" className="h-4 w-4 text-slate-400" />
                    </span>
                    <input
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-md leading-5 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-[#C9A227] sm:text-sm transition-colors"
                        placeholder="Search by Actor, IP or Event ID..."
                        type="text"
                        value={search}
                        onChange={(e) => {
                            setSearch(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <div className="w-full md:w-64">
                    <select
                        className="block w-full px-3 py-2 border border-slate-200 rounded-md leading-5 bg-white text-sm text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#C9A227]"
                        value={eventType}
                        onChange={(e) => {
                            setEventType(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="">All Action Types</option>
                        <option value="auth.login">auth.login</option>
                        <option value="auth.logout">auth.logout</option>
                        <option value="auth.failed">auth.failed</option>
                        <option value="device.bound">device.bound</option>
                        <option value="device.rejected">device.rejected</option>
                        <option value="employee.created">employee.created</option>
                        <option value="employee.updated">employee.updated</option>
                        <option value="employee.deleted">employee.deleted</option>
                        <option value="branch.created">branch.created</option>
                        <option value="branch.updated">branch.updated</option>
                        <option value="branch.deleted">branch.deleted</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="date"
                        className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-[#C9A227]"
                        value={dateFrom}
                        onChange={(e) => {
                            setDateFrom(e.target.value);
                            setPage(1);
                        }}
                    />
                    <span className="text-slate-400">-</span>
                    <input
                        type="date"
                        className="px-3 py-2 text-sm bg-white border border-slate-200 rounded-md focus:ring-1 focus:ring-[#C9A227]"
                        value={dateTo}
                        onChange={(e) => {
                            setDateTo(e.target.value);
                            setPage(1);
                        }}
                    />
                </div>

                <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                    <Icon name="refreshCw" className="h-4 w-4" />
                    Clear
                </button>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 w-full md:w-auto justify-start md:justify-end">
                {[
                    { id: 'all', label: 'All Events' },
                    { id: 'policy', label: 'Policy Changes' },
                    { id: 'security', label: 'Security' },
                    { id: 'export', label: 'Data Export' }
                ].map(cat => (
                    <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                            setCategory(cat.id);
                            setPage(1);
                        }}
                        className={
                            category === cat.id
                                ? 'px-3 py-1 rounded-full text-xs font-medium bg-[#0a1f43] text-white'
                                : 'px-3 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors'
                        }
                    >
                        {cat.label}
                    </button>
                ))}
            </div>
        </div>
    );
}
