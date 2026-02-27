import React from 'react';
import { MapPicker } from '../../../shared/MapPicker.jsx';

export function BranchFormModal({
    title,
    isOpen,
    onClose,
    onSubmit,
    state,
    payload,
    onChange,
    managerSearch,
    onManagerSearchChange,
    managerResults,
    onSelectManager,
    mapBranches,
}) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-lg max-h-[calc(100vh-2rem)] rounded-lg bg-white shadow-xl flex flex-col overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 p-4 shrink-0">
                    <h3 className="text-base font-bold text-slate-800">{title}</h3>
                    <button type="button" className="text-slate-500 hover:text-slate-700" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="space-y-4 p-4 overflow-auto flex-1">
                    {state.status === 'error' && (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {state.error?.message || `Failed to ${title.toLowerCase()}.`}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700">Name</label>
                        <input
                            className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                            value={payload.name}
                            onChange={(e) => onChange('name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Address</label>
                        <input
                            className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                            value={payload.address_line}
                            onChange={(e) => onChange('address_line', e.target.value)}
                            placeholder="Street address"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">City</label>
                            <input
                                className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                                value={payload.city}
                                onChange={(e) => onChange('city', e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">State</label>
                            <input
                                className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                                value={payload.state}
                                onChange={(e) => onChange('state', e.target.value)}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Branch Manager</label>
                        <div className="relative mt-1">
                            <input
                                className="w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                                value={managerSearch}
                                onChange={(e) => onManagerSearchChange(e.target.value)}
                                placeholder="Search by employee code or name..."
                            />
                            {managerResults.length > 0 && (
                                <div className="absolute z-30 mt-1 w-full rounded border border-slate-200 bg-white shadow-lg max-h-56 overflow-auto">
                                    {managerResults.map((emp) => (
                                        <button
                                            type="button"
                                            key={emp.id}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 border-b border-slate-100 last:border-b-0"
                                            onClick={() => onSelectManager(emp)}
                                        >
                                            <div className="font-medium text-slate-800">
                                                {emp.employee_code ? `${emp.employee_code} - ` : ''}{emp.full_name || emp.name || '—'}
                                            </div>
                                            <div className="text-xs text-slate-500">DB ID: {emp.id}</div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                            Selected manager DB ID: {payload.manager_employee_id || '—'}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Latitude</label>
                            <input
                                className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                                value={payload.latitude}
                                onChange={(e) => onChange('latitude', e.target.value)}
                                inputMode="decimal"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700">Longitude</label>
                            <input
                                className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                                value={payload.longitude}
                                onChange={(e) => onChange('longitude', e.target.value)}
                                inputMode="decimal"
                            />
                        </div>
                    </div>
                    <MapPicker
                        latitude={payload.latitude}
                        longitude={payload.longitude}
                        radiusMeters={Number(payload.radius_meters) || 100}
                        onChange={(lat, lng) => {
                            onChange('latitude', String(lat));
                            onChange('longitude', String(lng));
                        }}
                        markers={mapBranches.map((b) => ({
                            id: b.id,
                            latitude: b.latitude,
                            longitude: b.longitude,
                            name: b.name,
                            address: [b.address_line, b.city].filter(Boolean).join(', ')
                        }))}
                        height="240px"
                    />
                    <div>
                        <label className="block text-sm font-medium text-slate-700">Radius (meters)</label>
                        <input
                            className="mt-1 w-full rounded border-slate-200 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                            value={payload.radius_meters}
                            onChange={(e) => onChange('radius_meters', e.target.value)}
                            inputMode="numeric"
                        />
                    </div>
                </div>

                <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4 shrink-0 bg-white">
                    <button type="button" className="rounded border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50" onClick={onClose}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        className="rounded bg-[#0a1f43] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50 hover:bg-[#0a1f43]/90 transition-colors"
                        disabled={state.status === 'submitting'}
                        onClick={onSubmit}
                    >
                        {state.status === 'submitting' ? 'Processing…' : title}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CreateBranchModal(props) {
    return <BranchFormModal {...props} title="Add New Branch" />;
}

export function EditBranchModal(props) {
    return <BranchFormModal {...props} title="Edit Branch" />;
}
