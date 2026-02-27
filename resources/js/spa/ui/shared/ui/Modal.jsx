import React from 'react';
import { Icon } from '../Icon.jsx';

export function Modal({ open, onClose, title, subtitle, children, footer, maxWidth = 'max-w-lg' }) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className={`w-full ${maxWidth} max-h-[calc(100vh-2rem)] rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col overflow-hidden`}>
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 shrink-0">
                    <div>
                        {title && <div className="text-sm font-semibold text-slate-900">{title}</div>}
                        {subtitle && <div className="mt-1 text-xs text-slate-500">{subtitle}</div>}
                    </div>
                    {onClose && (
                        <button
                            type="button"
                            className="rounded p-2 text-slate-500 hover:bg-slate-100"
                            onClick={onClose}
                            aria-label="Close"
                        >
                            <Icon name="close" className="h-5 w-5" />
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-auto">{children}</div>

                {footer && (
                    <div className="flex items-center justify-end gap-2 border-t border-slate-200 px-5 py-4 shrink-0 bg-white">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    );
}
