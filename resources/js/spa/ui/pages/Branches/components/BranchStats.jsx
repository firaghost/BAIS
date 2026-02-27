import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';
import { MapPicker } from '../../../shared/MapPicker.jsx';

function complianceFromDevices(activeDevices, totalDevices) {
    const active = Number.isFinite(activeDevices) ? activeDevices : 0;
    const total = Number.isFinite(totalDevices) ? totalDevices : 0;
    if (total <= 0) return { status: 'review', percentage: 0 };
    const pct = Math.max(0, Math.min(100, Math.round((active / total) * 100)));
    return { status: pct >= 95 ? 'compliant' : pct >= 80 ? 'review' : 'critical', percentage: pct };
}

export function BranchStats({ mapBranches, mapCenter, onMapCenterChange, onExpandMap }) {
    return (
        <div className="lg:w-1/3 bg-white rounded-lg border border-slate-200 shadow-soft flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    <Icon name="globe" className="h-5 w-5 text-[#0a1f43]" />
                    Global Distribution
                </h3>
                <button
                    type="button"
                    className="text-xs text-[#0a1f43] font-medium hover:underline"
                    onClick={onExpandMap}
                >
                    Expand Map
                </button>
            </div>

            <div className="p-4 flex-1">
                <MapPicker
                    latitude={mapCenter.lat}
                    longitude={mapCenter.lng}
                    radiusMeters={100}
                    onChange={(lat, lng) => onMapCenterChange({ lat, lng })}
                    markers={mapBranches.map((b) => ({
                        id: b.id,
                        latitude: b.latitude,
                        longitude: b.longitude,
                        name: b.name,
                        address: [b.address_line, b.city].filter(Boolean).join(', '),
                    }))}
                    height="360px"
                    enableSearch={true}
                />
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-200 border-t border-slate-200 shrink-0">
                <div className="p-4 text-center hover:bg-slate-50 transition-colors cursor-default">
                    <p className="text-xs text-slate-500">Avg Compliance</p>
                    <p className="text-lg font-bold text-slate-800">
                        {mapBranches.length === 0
                            ? '—'
                            : (() => {
                                const pins = mapBranches.map((b) => complianceFromDevices(b.active_devices || 0, b.total_devices || 0));
                                return `${Math.round(pins.reduce((s, p) => s + p.percentage, 0) / pins.length)}%`;
                            })()}
                    </p>
                </div>
                <div className="p-4 text-center hover:bg-slate-50 transition-colors cursor-default">
                    <p className="text-xs text-slate-500">Total Devices</p>
                    <p className="text-lg font-bold text-slate-800">
                        {mapBranches.reduce((s, b) => s + (Number(b.total_devices) || 0), 0)}
                    </p>
                </div>
            </div>
        </div>
    );
}
