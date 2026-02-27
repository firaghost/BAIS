import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function BulkUploadModal({ state, file, onClose, onDownloadExcel, onDownloadCsv, onFileChange, onSubmit }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && state.status !== 'submitting') onClose(); }}
        >
            <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                    <div className="font-bold text-slate-800">Bulk Upload</div>
                    <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
                </div>

                <div className="p-4 overflow-auto flex-1 space-y-4">
                    {state.status === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Bulk upload failed.</div>}
                    {state.status === 'success' && <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Bulk upload completed.</div>}

                    <div className="text-sm text-slate-600">
                        1) Download <b>Excel Template</b> (clean formatting).<br />
                        2) Fill your employees.<br />
                        3) In Excel: <b>Save As → CSV</b>.<br />
                        4) Upload the CSV here.
                    </div>

                    <button type="button" className="inline-flex items-center justify-center gap-2 rounded bg-[#0a1f43] px-4 py-2 text-sm font-medium text-white hover:bg-[#0a1f43]/90" onClick={onDownloadExcel}>
                        <Icon name="download" className="h-4 w-4" /> Download Excel Template
                    </button>

                    <button type="button" className="inline-flex items-center justify-center gap-2 rounded border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50" onClick={onDownloadCsv}>
                        <Icon name="download" className="h-4 w-4" /> Download Upload-Ready CSV
                    </button>

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Upload filled CSV</label>
                        <input className="mt-2 block w-full text-sm" type="file" accept=".csv,text/csv" onChange={(e) => onFileChange(e.target.files?.[0] ?? null)} />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                    <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={onClose}>Close</button>
                    <button type="button" className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={!file || state.status === 'submitting'} onClick={onSubmit}>
                        {state.status === 'submitting' ? 'Uploading…' : 'Upload'}
                    </button>
                </div>
            </div>
        </div>
    );
}
