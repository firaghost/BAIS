import React from 'react';

export function DeleteEmployeeModal({ employee, state, onClose, onConfirm }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && state.status !== 'submitting') onClose(); }}
        >
            <div className="w-full max-w-md max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="border-b border-slate-200 p-4 shrink-0">
                    <div className="text-base font-bold text-slate-800">Delete Employee</div>
                    <p className="mt-1 text-sm text-slate-600">This action cannot be undone.</p>
                </div>

                <div className="p-4 space-y-3 overflow-auto flex-1">
                    {state.status === 'error' && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to delete employee.</div>
                    )}
                    <div className="text-sm text-slate-700">
                        Delete <span className="font-semibold">{employee.full_name || employee.name || employee.employee_code || `#${employee.id}`}</span>?
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                    <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
                    <button type="button" className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={state.status === 'submitting'} onClick={onConfirm}>
                        {state.status === 'submitting' ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
