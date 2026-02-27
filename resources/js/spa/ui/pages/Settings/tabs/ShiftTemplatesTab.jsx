import React, { useEffect, useState } from 'react';
import { safeDelete, safeGet, safePost, safePut } from '../../../lib/api.js';
import { Icon } from '../../../shared/Icon.jsx';

function formatTime12(value) {
    const v = String(value || '').slice(0, 5);
    if (!/^\d{2}:\d{2}$/.test(v)) return String(value || '—');
    const [h, m] = v.split(':').map((x) => Number(x));
    const am = h < 12;
    const hh = ((h + 11) % 12) + 1;
    return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
}

export function ShiftTemplatesTab() {
    const [templates, setTemplates] = useState({ status: 'loading', data: [], error: null });
    const [defaults, setDefaults] = useState({
        status: 'loading',
        data: { default_shift_template_id: null, strict_break_compliance: true },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        error: null,
        saveError: null,
    });
    const [templateModal, setTemplateModal] = useState({
        open: false,
        mode: 'create',
        id: null,
        name: '',
        start_time: '08:00',
        end_time: '16:00',
        break_minutes: 60,
        status: 'active',
        submitStatus: 'idle',
        error: null,
    });
    const [archiveModal, setArchiveModal] = useState({ open: false, template: null, status: 'idle', error: null });

    useEffect(() => {
        let active = true;
        (async () => {
            setTemplates({ status: 'loading', data: [], error: null });
            setDefaults((prev) => ({ ...prev, status: 'loading', error: null }));

            const [tplRes, defRes] = await Promise.all([
                safeGet('/api/settings/shift-templates'),
                safeGet('/api/settings/shift-defaults'),
            ]);

            if (!active) return;

            setTemplates(tplRes.ok ? { status: 'success', data: tplRes.data?.data ?? [], error: null } : { status: 'error', data: [], error: tplRes.error });

            if (!defRes.ok) {
                setDefaults((prev) => ({ ...prev, status: 'error', error: defRes.error }));
                return;
            }
            const data = defRes.data?.data ?? { default_shift_template_id: null, strict_break_compliance: true };
            setDefaults((prev) => ({ ...prev, status: 'success', data, baseline: data, dirty: false, saveStatus: 'idle', error: null, saveError: null }));
        })();
        return () => { active = false; };
    }, []);

    const openCreateModal = () => {
        setTemplateModal({ open: true, mode: 'create', id: null, name: '', start_time: '08:00', end_time: '16:00', break_minutes: 60, status: 'active', submitStatus: 'idle', error: null });
    };

    const openEditModal = (tpl) => {
        setTemplateModal({
            open: true,
            mode: 'edit',
            id: Number(tpl?.id) || null,
            name: String(tpl?.name || ''),
            start_time: String(tpl?.start_time || '08:00').slice(0, 5),
            end_time: String(tpl?.end_time || '16:00').slice(0, 5),
            break_minutes: Number(tpl?.break_minutes) || 0,
            status: String(tpl?.status || 'active'),
            submitStatus: 'idle',
            error: null,
        });
    };

    const submitTemplate = async () => {
        if (templateModal.submitStatus === 'submitting') return;
        const name = String(templateModal.name || '').trim();
        if (!name) {
            setTemplateModal((prev) => ({ ...prev, submitStatus: 'error', error: { message: 'Template name is required.' } }));
            return;
        }
        const payload = { name, start_time: templateModal.start_time, end_time: templateModal.end_time, break_minutes: Number(templateModal.break_minutes) || 0, status: templateModal.status };
        setTemplateModal((prev) => ({ ...prev, submitStatus: 'submitting', error: null }));
        const res = templateModal.mode === 'edit' && templateModal.id
            ? await safePut(`/api/settings/shift-templates/${templateModal.id}`, payload)
            : await safePost('/api/settings/shift-templates', payload);

        if (!res.ok) { setTemplateModal((prev) => ({ ...prev, submitStatus: 'error', error: res.error })); return; }

        const saved = res.data?.data ?? null;
        if (saved) {
            setTemplates((prev) => {
                const list = Array.isArray(prev.data) ? prev.data : [];
                const idx = list.findIndex((x) => Number(x.id) === Number(saved.id));
                const data = idx >= 0 ? list.map((x, i) => (i === idx ? saved : x)) : [saved, ...list];
                return { ...prev, data };
            });
        }
        setTemplateModal((prev) => ({ ...prev, submitStatus: 'success', open: false }));
    };

    const requestArchive = (tpl) => setArchiveModal({ open: true, template: tpl, status: 'idle', error: null });

    const confirmArchive = async () => {
        const id = Number(archiveModal.template?.id) || 0;
        if (!id || archiveModal.status === 'submitting') return;
        setArchiveModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safeDelete(`/api/settings/shift-templates/${id}`);
        if (!res.ok) { setArchiveModal((prev) => ({ ...prev, status: 'error', error: res.error })); return; }
        setArchiveModal({ open: false, template: null, status: 'idle', error: null });
        setTemplates((prev) => ({ ...prev, data: (prev.data || []).filter((x) => Number(x.id) !== id) }));
        setDefaults((prev) => {
            if (Number(prev.data.default_shift_template_id) !== id) return prev;
            return { ...prev, data: { ...prev.data, default_shift_template_id: null }, dirty: true };
        });
    };

    const updateDefault = (field, value) => {
        setDefaults((prev) => ({ ...prev, data: { ...prev.data, [field]: value }, dirty: true, saveStatus: 'idle', saveError: null }));
    };

    const saveDefaults = async () => {
        if (defaults.status !== 'success' || !defaults.dirty || defaults.saveStatus === 'submitting') return;
        setDefaults((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/shift-defaults', { default_shift_template_id: defaults.data.default_shift_template_id, strict_break_compliance: Boolean(defaults.data.strict_break_compliance) });
        if (!res.ok) { setDefaults((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error })); return; }
        const saved = res.data?.data ?? defaults.data;
        setDefaults((prev) => ({ ...prev, saveStatus: 'success', data: saved, baseline: saved, dirty: false, saveError: null }));
    };

    const discardDefaults = () => {
        setDefaults((prev) => {
            if (prev.status !== 'success' || !prev.baseline) return prev;
            return { ...prev, data: prev.baseline, dirty: false, saveStatus: 'idle', saveError: null };
        });
    };

    return (
        <div className="space-y-6">
            {templateModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={() => { if (templateModal.submitStatus !== 'submitting') setTemplateModal((prev) => ({ ...prev, open: false })); }} aria-label="Close" />
                    <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">{templateModal.mode === 'edit' ? 'Edit Template' : 'Create New Template'}</h3>
                                <p className="text-xs text-slate-500 mt-1">Define a standard shift structure.</p>
                            </div>
                            <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => { if (templateModal.submitStatus !== 'submitting') setTemplateModal((prev) => ({ ...prev, open: false })); }} aria-label="Close">
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Template Name</label>
                                <input className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]" value={templateModal.name} onChange={(e) => setTemplateModal((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Morning Teller" />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                                    <input type="time" className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]" value={templateModal.start_time} onChange={(e) => setTemplateModal((prev) => ({ ...prev, start_time: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                                    <input type="time" className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]" value={templateModal.end_time} onChange={(e) => setTemplateModal((prev) => ({ ...prev, end_time: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Break (mins)</label>
                                    <input type="number" className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]" value={String(templateModal.break_minutes)} onChange={(e) => setTemplateModal((prev) => ({ ...prev, break_minutes: Number(e.target.value) || 0 }))} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                                <select className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]" value={templateModal.status} onChange={(e) => setTemplateModal((prev) => ({ ...prev, status: e.target.value }))}>
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>
                            {templateModal.submitStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{templateModal.error?.message || 'Failed to save template.'}</div>}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button type="button" onClick={() => setTemplateModal((prev) => ({ ...prev, open: false }))} disabled={templateModal.submitStatus === 'submitting'} className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={submitTemplate} disabled={templateModal.submitStatus === 'submitting'} className="px-3 py-2 text-sm bg-[#0a1f43] text-white rounded hover:bg-[#0a1f43]/90 shadow-sm disabled:opacity-50">{templateModal.submitStatus === 'submitting' ? 'Saving...' : 'Save Template'}</button>
                        </div>
                    </div>
                </div>
            )}

            {archiveModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={() => { if (archiveModal.status !== 'submitting') setArchiveModal({ open: false, template: null, status: 'idle', error: null }); }} aria-label="Close" />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Archive Template</h3>
                                <p className="text-xs text-slate-500 mt-1">This will hide the template from global selection.</p>
                            </div>
                            <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => { if (archiveModal.status !== 'submitting') setArchiveModal({ open: false, template: null, status: 'idle', error: null }); }} aria-label="Close">
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5">
                            <p className="text-sm text-slate-700">Archive <strong>{archiveModal.template?.name || 'this template'}</strong>? It will no longer appear in shift selections.</p>
                            {archiveModal.status === 'error' && <div className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{archiveModal.error?.message || 'Failed to archive.'}</div>}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button type="button" onClick={() => setArchiveModal({ open: false, template: null, status: 'idle', error: null })} disabled={archiveModal.status === 'submitting'} className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={confirmArchive} disabled={archiveModal.status === 'submitting'} className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 shadow-sm disabled:opacity-50">{archiveModal.status === 'submitting' ? 'Archiving...' : 'Archive'}</button>
                        </div>
                    </div>
                </div>
            )}

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Shift Templates</h2>
                        <p className="text-sm text-slate-500 mt-1">Define reusable standard shift schedules.</p>
                    </div>
                    <button type="button" onClick={openCreateModal} className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#0a1f43] text-white rounded-lg hover:bg-[#0a1f43]/90 shadow-sm">
                        <Icon name="plus" className="h-4 w-4" /> New Template
                    </button>
                </div>

                {templates.status === 'loading' ? (
                    <div className="p-6 text-sm text-slate-500">Loading templates...</div>
                ) : templates.status === 'error' ? (
                    <div className="p-6 text-sm text-red-600">{templates.error?.message || 'Failed to load templates.'}</div>
                ) : templates.data.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No shift templates yet. Create one to get started.</div>
                ) : (
                    <div className="divide-y divide-slate-200">
                        {templates.data.map((tpl) => (
                            <div key={tpl.id} className="flex items-center justify-between px-6 py-4">
                                <div>
                                    <div className="font-medium text-slate-800">{tpl.name}</div>
                                    <div className="text-xs text-slate-500 mt-0.5">
                                        {formatTime12(tpl.start_time)} – {formatTime12(tpl.end_time)} • {tpl.break_minutes ?? 0} min break
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${tpl.status === 'active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{tpl.status}</span>
                                    <button type="button" onClick={() => openEditModal(tpl)} className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg"><Icon name="pencil" className="h-4 w-4" /></button>
                                    <button type="button" onClick={() => requestArchive(tpl)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Icon name="archive" className="h-4 w-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Shift Defaults</h2>
                    <p className="text-sm text-slate-500 mt-1">Set the organization-wide default shift configuration.</p>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Default Shift Template</label>
                        <select
                            className="w-full rounded border-slate-300 text-sm focus:ring-[#0a1f43] bg-white"
                            disabled={defaults.status !== 'success' || templates.status !== 'success'}
                            value={String(defaults.data.default_shift_template_id ?? '')}
                            onChange={(e) => updateDefault('default_shift_template_id', e.target.value ? Number(e.target.value) : null)}
                        >
                            <option value="">None</option>
                            {(templates.data || []).map((tpl) => (
                                <option key={tpl.id} value={tpl.id}>{tpl.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm text-slate-700">Strict Break Compliance</label>
                        <button
                            type="button"
                            role="switch"
                            aria-checked={Boolean(defaults.data.strict_break_compliance) ? 'true' : 'false'}
                            disabled={defaults.status !== 'success'}
                            onClick={() => updateDefault('strict_break_compliance', !defaults.data.strict_break_compliance)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0a1f43] focus:ring-offset-2 disabled:opacity-60 ${Boolean(defaults.data.strict_break_compliance) ? 'bg-[#0a1f43]' : 'bg-slate-300'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${Boolean(defaults.data.strict_break_compliance) ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                    <div className="flex gap-3 justify-end pt-2">
                        <button type="button" onClick={discardDefaults} disabled={!defaults.dirty || defaults.saveStatus === 'submitting'} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50">Discard</button>
                        <button type="button" onClick={saveDefaults} disabled={defaults.status !== 'success' || !defaults.dirty || defaults.saveStatus === 'submitting'} className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50">{defaults.saveStatus === 'submitting' ? 'Saving...' : 'Save Defaults'}</button>
                    </div>
                    {defaults.saveStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{defaults.saveError?.message || 'Failed to save defaults.'}</div>}
                </div>
            </section>
        </div>
    );
}
