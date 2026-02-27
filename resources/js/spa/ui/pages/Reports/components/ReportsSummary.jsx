import React, { useMemo } from 'react';
import { Icon } from '../../../shared/Icon.jsx';

function formatPercent(value) {
    if (value === null || value === undefined || Number.isNaN(Number(value))) {
        return '—';
    }
    return `${Number(value).toFixed(1)}%`;
}

export function ReportsSummary({ overview }) {
    const topBranchLabel = useMemo(() => {
        const name = overview?.top_branch?.name ?? null;
        return name ? String(name) : '—';
    }, [overview]);

    const topBranchEfficiency = useMemo(() => {
        const eff = overview?.top_branch?.efficiency;
        if (eff === null || eff === undefined) {
            return '—';
        }
        return `${Number(eff).toFixed(1)}% Efficiency`;
    }, [overview]);

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Monthly Compliance Avg</p>
                        <h3 className="text-3xl font-bold text-[#0a1f43] mt-1">{formatPercent(overview?.monthly_compliance_avg)}</h3>
                    </div>
                    <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                        <Icon name="gavel" className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                    <span className="text-slate-400 ml-0 text-xs">Month to date</span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-[#0a1f43] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Top Performing Branch</p>
                        <h3 className="text-lg font-bold text-[#0a1f43] mt-1 truncate max-w-[150px]" title={topBranchLabel}>
                            {topBranchLabel}
                        </h3>
                        <p className="text-xs text-green-600 font-medium">{topBranchEfficiency}</p>
                    </div>
                    <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                        <Icon name="trophy" className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-[#C9A227] h-full" style={{ width: '98%' }}></div>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-[#C9A227] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Network Device Health</p>
                        <h3 className="text-3xl font-bold text-[#0a1f43] mt-1">{formatPercent(overview?.device_health?.percent)}</h3>
                    </div>
                    <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                        <Icon name="router" className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                    <span className="text-slate-500 text-xs">{Number(overview?.device_health?.offline ?? 0)} Devices Offline</span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-[#0a1f43] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </div>

            <div className="bg-white p-5 rounded-lg shadow-soft border border-slate-200 relative overflow-hidden group hover:border-[#C9A227] transition-colors">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-sm font-medium text-slate-500">Reports Generated</p>
                        <h3 className="text-3xl font-bold text-[#0a1f43] mt-1">{Number(overview?.reports_generated?.count ?? 0)}</h3>
                    </div>
                    <div className="p-2 bg-[#0a1f43]/5 rounded-lg text-[#0a1f43]">
                        <Icon name="printer" className="h-5 w-5" />
                    </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                    <span className="text-slate-400 ml-0 text-xs">Last 7 days</span>
                </div>
                <div className="absolute bottom-0 left-0 h-1 bg-[#C9A227] w-full transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
            </div>
        </div>
    );
}
