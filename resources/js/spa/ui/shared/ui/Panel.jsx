import React from 'react';

export function Panel({ children, className = '' }) {
    return (
        <div className={`bg-white rounded-xl shadow-soft border border-slate-200 overflow-hidden ${className}`}>
            {children}
        </div>
    );
}

export function PanelHeader({ title, description, action }) {
    return (
        <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
            </div>
            {action && <div>{action}</div>}
        </div>
    );
}

export function PanelBody({ children, className = '' }) {
    return (
        <div className={`p-6 ${className}`}>
            {children}
        </div>
    );
}

export function PanelFooter({ children, className = '' }) {
    return (
        <div className={`px-6 py-4 bg-slate-50/80 border-t border-slate-200 ${className}`}>
            {children}
        </div>
    );
}
