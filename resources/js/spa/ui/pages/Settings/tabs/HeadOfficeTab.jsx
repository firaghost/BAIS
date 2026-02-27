import React, { useEffect, useState } from 'react';
import { safeGet, safePut } from '../../../lib/api.js';

export function HeadOfficeTab() {
    const [geo, setGeo] = useState({
        status: 'loading',
        data: { latitude: 0, longitude: 0, radius_meters: 50 },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        error: null,
        saveError: null,
    });

    useEffect(() => {
        let active = true;
        (async () => {
            setGeo((prev) => ({ ...prev, status: 'loading', error: null }));
            const res = await safeGet('/api/settings/head-office-geo');
            if (!active) return;
            if (!res.ok) {
                setGeo((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }
            const d = res.data?.data ?? {};
            const data = {
                latitude: Number(d.latitude ?? 0),
                longitude: Number(d.longitude ?? 0),
                radius_meters: Number(d.radius_meters ?? 50),
            };
            setGeo((prev) => ({ ...prev, status: 'success', data, baseline: data, dirty: false, saveStatus: 'idle', error: null, saveError: null }));
        })();
        return () => { active = false; };
    }, []);

    const canSave = geo.status === 'success' && geo.dirty && geo.saveStatus !== 'submitting';

    const updateField = (field, value) => {
        setGeo((prev) => ({ ...prev, data: { ...prev.data, [field]: value }, dirty: true, saveStatus: 'idle', saveError: null }));
    };

    const handleCancel = () => {
        setGeo((prev) => {
            if (prev.status !== 'success' || !prev.baseline) return prev;
            return { ...prev, data: prev.baseline, dirty: false, saveStatus: 'idle', saveError: null };
        });
    };

    const handleSave = async () => {
        if (!canSave) return;
        const latitude = Number(geo.data.latitude);
        const longitude = Number(geo.data.longitude);
        const radius = Number(geo.data.radius_meters);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radius) || radius <= 0) {
            setGeo((prev) => ({ ...prev, saveStatus: 'error', saveError: { message: 'Latitude, longitude, and radius are required.' } }));
            return;
        }

        setGeo((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/head-office-geo', { latitude, longitude, radius_meters: Math.round(radius) });

        if (!res.ok) {
            setGeo((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        const d = res.data?.data ?? {};
        const data = {
            latitude: Number(d.latitude ?? latitude),
            longitude: Number(d.longitude ?? longitude),
            radius_meters: Number(d.radius_meters ?? Math.round(radius)),
        };
        setGeo((prev) => ({ ...prev, saveStatus: 'success', data, baseline: data, dirty: false, saveError: null }));
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-lg border border-slate-200 shadow-soft p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-lg bg-[#0a1f43]/10 flex items-center justify-center">
                        <span className="text-[#0a1f43] text-lg">📍</span>
                    </div>
                    <div>
                        <h3 className="font-semibold text-slate-800">Head Office Geo-Fence</h3>
                        <p className="text-xs text-slate-500">Attendance is allowed only within this configured radius.</p>
                    </div>
                </div>

                {geo.status === 'loading' ? <div className="text-sm text-slate-500">Loading…</div> : null}

                {geo.status === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {geo.error?.message || 'Failed to load Head Office settings.'}
                    </div>
                ) : null}

                {geo.status === 'success' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <label className="text-sm">
                                <div className="mb-1 text-xs font-medium text-slate-600">Latitude</div>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className="w-full rounded border-slate-200"
                                    value={geo.data.latitude}
                                    onChange={(e) => updateField('latitude', e.target.value)}
                                />
                            </label>
                            <label className="text-sm">
                                <div className="mb-1 text-xs font-medium text-slate-600">Longitude</div>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className="w-full rounded border-slate-200"
                                    value={geo.data.longitude}
                                    onChange={(e) => updateField('longitude', e.target.value)}
                                />
                            </label>
                            <label className="text-sm">
                                <div className="mb-1 text-xs font-medium text-slate-600">Radius (meters)</div>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    className="w-full rounded border-slate-200"
                                    value={geo.data.radius_meters}
                                    onChange={(e) => updateField('radius_meters', e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                                Current: {Number(geo.data.latitude).toFixed(6)}, {Number(geo.data.longitude).toFixed(6)} •{' '}
                                {Math.round(Number(geo.data.radius_meters) || 0)}m
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={handleCancel}
                                    disabled={!geo.dirty || geo.saveStatus === 'submitting'}
                                    className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSave}
                                    disabled={!canSave}
                                    className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {geo.saveStatus === 'submitting' ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>

                        {geo.saveStatus === 'error' ? (
                            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {geo.saveError?.message || 'Failed to save Head Office settings.'}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </div>
        </div>
    );
}
