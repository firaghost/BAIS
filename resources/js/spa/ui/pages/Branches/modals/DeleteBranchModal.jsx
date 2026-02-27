import React from 'react';

export function DeleteBranchModal({ branch, state, onClose, onConfirm }) {
    if (!branch) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
                <div className="border-b border-slate-200 p-4">
                    <h3 className="text-base font-bold text-slate-800">Delete Branch</h3>
                    <p className="mt-1 text-sm text-slate-600">This action cannot be undone.</p>
                </div>

                <div className="space-y-3 p-4">
                    {state.status === 'error' && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {state.error?.message || 'Failed to delete branch.'}
                        </div>
                    )}
                    <div className="text-sm text-slate-700">
                        Delete <span className="font-semibold">{branch.name}</span>?
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
                    <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded bg-red-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
                        disabled={state.status === 'submitting'}
                        onClick={onConfirm}
                    >
                        {state.status === 'submitting' ? 'Deleting…' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>
    );
}
