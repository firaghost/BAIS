import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function BranchFilters({ search, onSearchChange, radiusMin, onRadiusMinChange, radiusMax, onRadiusMaxChange, onReset, showFilters, setShowFilters, onExport }) {
    return (
        <>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 rounded-lg border border-slate-200 shadow-soft shrink-0">
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                            <Icon name="search" className="h-5 w-5" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search branch, city, or manager..."
                            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                            value={search}
                            onChange={(e) => onSearchChange(e.target.value)}
                        />
                    </div>
                    <button
                        type="button"
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                        onClick={() => setShowFilters(!showFilters)}
                    >
                        <Icon name="slidersHorizontal" className="h-4 w-4" />
                        Filters
                    </button>
                    <button
                        onClick={onExport}
                        className="flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        <Icon name="download" className="h-4 w-4" />
                        Export
                    </button>
                </div>
                {/* Add New Branch button remains in the main coordinator for now, or we pass it here */}
            </div>

            {showFilters && (
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-soft mt-4">
                    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Radius min (m)</label>
                            <input
                                className="mt-1 w-40 rounded border-slate-200 bg-white text-sm"
                                value={radiusMin}
                                onChange={(e) => onRadiusMinChange(e.target.value)}
                                inputMode="numeric"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-600">Radius max (m)</label>
                            <input
                                className="mt-1 w-40 rounded border-slate-200 bg-white text-sm"
                                value={radiusMax}
                                onChange={(e) => onRadiusMaxChange(e.target.value)}
                                inputMode="numeric"
                            />
                        </div>
                        <button
                            type="button"
                            className="rounded border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                            onClick={onReset}
                        >
                            Reset
                        </button>
                        <button
                            type="button"
                            className="ml-auto rounded bg-slate-100 px-3 py-2 text-sm text-slate-700 hover:bg-slate-200"
                            onClick={() => setShowFilters(false)}
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
        </>
    );
}
