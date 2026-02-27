import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

function EmployeeFormFields({ payload, branches, onChange }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">First Name</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.first_name} onChange={(e) => onChange('first_name', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Last Name</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.last_name} onChange={(e) => onChange('last_name', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Middle Name</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.middle_name} onChange={(e) => onChange('middle_name', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Branch</label>
                <select className="mt-1 w-full rounded border-slate-200" value={payload.branch_id} onChange={(e) => onChange('branch_id', e.target.value)}>
                    <option value="">—</option>
                    {branches.map((b) => <option key={b.id} value={String(b.id)}>{b.name}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.email} onChange={(e) => onChange('email', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Phone</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.phone} onChange={(e) => onChange('phone', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Department</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.department} onChange={(e) => onChange('department', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Job Title</label>
                <input className="mt-1 w-full rounded border-slate-200" value={payload.job_title} onChange={(e) => onChange('job_title', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Hire Date</label>
                <input type="date" className="mt-1 w-full rounded border-slate-200" value={payload.hire_date} onChange={(e) => onChange('hire_date', e.target.value)} />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Status</label>
                <select className="mt-1 w-full rounded border-slate-200" value={payload.status} onChange={(e) => onChange('status', e.target.value)}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                </select>
            </div>
        </div>
    );
}

export function CreateEmployeeModal({ state, payload, branches, onClose, onChange, onSubmit, onDownloadTemplate }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && state.status !== 'submitting') onClose(); }}
        >
            <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                    <div className="font-bold text-slate-800">Add Employee</div>
                    <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
                </div>

                <div className="p-4 overflow-auto flex-1 space-y-4">
                    {state.status === 'error' && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{state.error?.message || 'Failed to create employee.'}</div>
                    )}
                    <button type="button" className="inline-flex items-center gap-2 text-sm font-medium text-[#0a1f43] hover:underline" onClick={onDownloadTemplate}>
                        <Icon name="download" className="h-4 w-4" /> Download Excel Template
                    </button>
                    <EmployeeFormFields payload={payload} branches={branches} onChange={onChange} />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                    <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
                    <button type="button" className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={state.status === 'submitting'} onClick={onSubmit}>
                        {state.status === 'submitting' ? 'Creating…' : 'Create'}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function EditEmployeeModal({ state, payload, branches, onClose, onChange, onSubmit }) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            onMouseDown={(e) => { if (e.target === e.currentTarget && state.status !== 'submitting') onClose(); }}
        >
            <div className="w-full max-w-2xl max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                    <div className="font-bold text-slate-800">Edit Employee</div>
                    <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>✕</button>
                </div>

                <div className="p-4 overflow-auto flex-1 space-y-4">
                    {state.status === 'error' && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to update employee.</div>
                    )}
                    <EmployeeFormFields payload={payload} branches={branches} onChange={onChange} />
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                    <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm" onClick={onClose}>Cancel</button>
                    <button type="button" className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-medium text-white disabled:opacity-50" disabled={state.status === 'submitting'} onClick={onSubmit}>
                        {state.status === 'submitting' ? 'Saving…' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
}
