import React from 'react';

const STATUS_CONFIGS = {
    active: { text: 'text-green-700', bg: 'bg-green-50', dot: 'bg-green-500', label: 'Active' },
    on_leave: { text: 'text-amber-700', bg: 'bg-amber-50', dot: 'bg-amber-500', label: 'On Leave' },
    suspended: { text: 'text-red-700', bg: 'bg-red-50', dot: 'bg-red-500', label: 'Suspended' },
    inactive: { text: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-400', label: 'Inactive' },
    probation: { text: 'text-blue-700', bg: 'bg-blue-50', dot: 'bg-blue-500', label: 'Probation' },
};

export function StatusBadge({ status, label }) {
    const config = STATUS_CONFIGS[status] ?? { text: 'text-slate-700', bg: 'bg-slate-100', dot: 'bg-slate-400', label: status };
    const displayLabel = label ?? config.label;

    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text} border border-slate-200`}>
            <span className={`w-1.5 h-1.5 rounded-full ${config.dot} mr-1.5`} />
            {displayLabel}
        </span>
    );
}
