import React, { useEffect, useState } from 'react';
import { safeDelete, safeGet, safePost, safePut } from '../../../lib/api.js';
import { Icon } from '../../../shared/Icon.jsx';

const WEBHOOK_EVENTS = [
    { id: 'punch', label: 'Punch Events', desc: 'Clock-in, Clock-out, Breaks' },
    { id: 'leave', label: 'Leave Requests', desc: 'Applications, Approvals, Rejections' },
    { id: 'overtime', label: 'Overtime Alerts', desc: 'Threshold breaches' },
    { id: 'user', label: 'User Management', desc: 'New user created, Role changes' },
];

const DEFAULT_WEBHOOK = { endpoint_url: '', secret: '', enabled_events: ['punch'], verified: false };

export function IntegrationsTab() {
    const [apiKeys, setApiKeys] = useState({ status: 'loading', data: [], error: null });
    const [webhook, setWebhook] = useState({
        status: 'loading',
        data: DEFAULT_WEBHOOK,
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        testStatus: 'idle',
        error: null,
        saveError: null,
        testError: null,
    });
    const [newKeyModal, setNewKeyModal] = useState({ open: false, name: '', status: 'idle', error: null, created: null });
    const [revokeModal, setRevokeModal] = useState({ open: false, key: null, status: 'idle', error: null });
    const [secretCopied, setSecretCopied] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            setApiKeys({ status: 'loading', data: [], error: null });
            setWebhook((prev) => ({ ...prev, status: 'loading', error: null }));

            const [keysRes, webhookRes] = await Promise.all([
                safeGet('/api/settings/api-keys'),
                safeGet('/api/settings/webhook'),
            ]);

            if (!active) return;

            setApiKeys(keysRes.ok ? { status: 'success', data: keysRes.data?.data ?? [], error: null } : { status: 'error', data: [], error: keysRes.error });

            if (!webhookRes.ok) {
                setWebhook((prev) => ({ ...prev, status: 'error', error: webhookRes.error }));
                return;
            }
            const data = webhookRes.data?.data ?? DEFAULT_WEBHOOK;
            setWebhook((prev) => ({ ...prev, status: 'success', data, baseline: data, dirty: false, saveStatus: 'idle', testStatus: 'idle', error: null, saveError: null, testError: null }));
        })();
        return () => { active = false; };
    }, []);

    const openNewKeyModal = () => setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null });
    const openNewKeyModalOpen = () => setNewKeyModal({ open: true, name: '', status: 'idle', error: null, created: null });

    const createApiKey = async () => {
        if (newKeyModal.status === 'submitting') return;
        const name = String(newKeyModal.name || '').trim();
        if (!name) { setNewKeyModal((prev) => ({ ...prev, status: 'error', error: { message: 'Key name is required.' } })); return; }
        setNewKeyModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safePost('/api/settings/api-keys', { name });
        if (!res.ok) { setNewKeyModal((prev) => ({ ...prev, status: 'error', error: res.error })); return; }
        const created = res.data?.data ?? null;
        setNewKeyModal((prev) => ({ ...prev, status: 'success', created }));
        setApiKeys((prev) => ({ ...prev, data: created ? [created, ...(prev.data || [])] : prev.data }));
    };

    const regenerateApiKey = async (id) => {
        const keyId = Number(id) || 0;
        if (!keyId) return;
        const res = await safePost(`/api/settings/api-keys/${keyId}/regenerate`, {});
        if (!res.ok) return;
        const updated = res.data?.data ?? null;
        if (!updated) return;
        setNewKeyModal({ open: true, name: updated.name || '', status: 'success', error: null, created: updated });
        setApiKeys((prev) => ({ ...prev, data: (prev.data || []).map((k) => (Number(k.id) === keyId ? { ...k, ...updated } : k)) }));
    };

    const requestRevoke = (key) => setRevokeModal({ open: true, key, status: 'idle', error: null });

    const confirmRevoke = async () => {
        const keyId = Number(revokeModal.key?.id) || 0;
        if (!keyId || revokeModal.status === 'submitting') return;
        setRevokeModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safeDelete(`/api/settings/api-keys/${keyId}`);
        if (!res.ok) { setRevokeModal((prev) => ({ ...prev, status: 'error', error: res.error })); return; }
        setRevokeModal({ open: false, key: null, status: 'idle', error: null });
        setApiKeys((prev) => ({ ...prev, data: (prev.data || []).map((k) => (Number(k.id) === keyId ? { ...k, status: 'revoked' } : k)) }));
    };

    const updateWebhookField = (field, value) => {
        setWebhook((prev) => ({ ...prev, data: { ...prev.data, [field]: value }, dirty: true, saveStatus: 'idle', saveError: null }));
    };

    const toggleWebhookEvent = (eventId) => {
        const id = String(eventId);
        setWebhook((prev) => {
            const current = Array.isArray(prev.data.enabled_events) ? prev.data.enabled_events : [];
            const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
            return { ...prev, data: { ...prev.data, enabled_events: next }, dirty: true, saveStatus: 'idle', saveError: null };
        });
    };

    const cancelWebhook = () => {
        setWebhook((prev) => {
            if (prev.status !== 'success' || !prev.baseline) return prev;
            return { ...prev, data: prev.baseline, dirty: false, saveStatus: 'idle', saveError: null, testError: null };
        });
    };

    const saveWebhook = async () => {
        if (webhook.status !== 'success' || !webhook.dirty || webhook.saveStatus === 'submitting') return;
        setWebhook((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/webhook', { endpoint_url: webhook.data.endpoint_url, enabled_events: webhook.data.enabled_events });
        if (!res.ok) { setWebhook((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error })); return; }
        const updated = res.data?.data ?? webhook.data;
        setWebhook((prev) => ({ ...prev, saveStatus: 'success', data: { ...prev.data, ...updated }, baseline: { ...prev.data, ...updated }, dirty: false, saveError: null }));
    };

    const testWebhook = async () => {
        if (webhook.testStatus === 'submitting') return;
        setWebhook((prev) => ({ ...prev, testStatus: 'submitting', testError: null }));
        const res = await safePost('/api/settings/webhook/test', {});
        if (!res.ok) { setWebhook((prev) => ({ ...prev, testStatus: 'error', testError: res.error })); return; }
        const ok = Boolean(res.data?.data?.ok);
        setWebhook((prev) => ({ ...prev, testStatus: 'success', data: { ...prev.data, verified: ok } }));
    };

    const copySecret = async () => {
        const secret = String(webhook.data.secret || '');
        if (!secret) return;
        try {
            await navigator.clipboard.writeText(secret);
            setSecretCopied(true);
            window.setTimeout(() => setSecretCopied(false), 2000);
        } catch { /* ignore */ }
    };

    return (
        <div className="space-y-6">
            {newKeyModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={() => { if (newKeyModal.status !== 'submitting') setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null }); }} aria-label="Close" />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Generate API Key</h3>
                                <p className="text-xs text-slate-500 mt-1">Copy the key now. You won't be able to view it again.</p>
                            </div>
                            <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => { if (newKeyModal.status !== 'submitting') setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null }); }} aria-label="Close">
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            {newKeyModal.status !== 'success' && (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Key Name</label>
                                    <input className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]" value={newKeyModal.name} onChange={(e) => setNewKeyModal((prev) => ({ ...prev, name: e.target.value }))} placeholder="e.g. Payroll System (ADP)" />
                                </div>
                            )}
                            {newKeyModal.status === 'success' && newKeyModal.created?.key && (
                                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-700">API Key</div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <code className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded text-xs font-mono text-slate-700 break-all">{String(newKeyModal.created.key)}</code>
                                        <button type="button" className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50" onClick={() => navigator.clipboard.writeText(String(newKeyModal.created.key))}>
                                            <Icon name="copy" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            )}
                            {newKeyModal.status === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{newKeyModal.error?.message || 'Failed to generate key.'}</div>}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button type="button" onClick={() => setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null })} disabled={newKeyModal.status === 'submitting'} className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50">Close</button>
                            {newKeyModal.status !== 'success' && (
                                <button type="button" onClick={createApiKey} disabled={newKeyModal.status === 'submitting'} className="px-3 py-2 text-sm bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8] shadow-sm disabled:opacity-50">{newKeyModal.status === 'submitting' ? 'Generating...' : 'Generate'}</button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {revokeModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button type="button" className="absolute inset-0 bg-slate-900/40" onClick={() => { if (revokeModal.status !== 'submitting') setRevokeModal({ open: false, key: null, status: 'idle', error: null }); }} aria-label="Close" />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Revoke API Key</h3>
                                <p className="text-xs text-slate-500 mt-1">This will immediately disable access for this integration.</p>
                            </div>
                            <button type="button" className="text-slate-400 hover:text-slate-600" onClick={() => { if (revokeModal.status !== 'submitting') setRevokeModal({ open: false, key: null, status: 'idle', error: null }); }} aria-label="Close">
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <div className="font-semibold">Key:</div>
                                <div className="mt-1 break-words">{revokeModal.key?.name || '—'}</div>
                            </div>
                            {revokeModal.status === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{revokeModal.error?.message || 'Failed to revoke key.'}</div>}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button type="button" onClick={() => setRevokeModal({ open: false, key: null, status: 'idle', error: null })} disabled={revokeModal.status === 'submitting'} className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50">Cancel</button>
                            <button type="button" onClick={confirmRevoke} disabled={revokeModal.status === 'submitting'} className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 shadow-sm disabled:opacity-50">{revokeModal.status === 'submitting' ? 'Revoking...' : 'Revoke'}</button>
                        </div>
                    </div>
                </div>
            )}

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Active API Keys</h2>
                        <p className="text-sm text-slate-500 mt-1">Manage access keys for third-party integrations.</p>
                    </div>
                    <button type="button" onClick={openNewKeyModalOpen} className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded text-sm font-medium shadow-sm transition-colors flex items-center gap-2">
                        <Icon name="add" className="h-4 w-4" /> Generate New API Key
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                <th className="px-6 py-3 whitespace-nowrap">Key Name</th>
                                <th className="px-6 py-3 whitespace-nowrap">Created Date</th>
                                <th className="px-6 py-3 whitespace-nowrap">Last Used</th>
                                <th className="px-6 py-3 whitespace-nowrap">Status</th>
                                <th className="px-6 py-3 whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 text-sm">
                            {apiKeys.status === 'loading' ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading keys...</td></tr>
                            ) : apiKeys.status === 'error' ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-red-600">Failed to load keys.</td></tr>
                            ) : (apiKeys.data || []).length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-8 text-center text-slate-500">No API keys yet.</td></tr>
                            ) : (
                                (apiKeys.data || []).map((k) => {
                                    const isActive = String(k.status || '').toLowerCase() === 'active';
                                    return (
                                        <tr key={k.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800">{k.name}</span>
                                                    <span className="font-mono text-xs text-slate-400 mt-0.5">{String(k.prefix || '')}...</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}</td>
                                            <td className="px-6 py-4 text-slate-600">{k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}</td>
                                            <td className="px-6 py-4">
                                                <span className={`px-2 py-0.5 rounded text-xs font-medium border ${isActive ? 'bg-green-100 text-green-800 border-green-200' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                                    {isActive ? 'Active' : 'Revoked'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button type="button" className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-200" title="Regenerate" disabled={!isActive} onClick={() => regenerateApiKey(k.id)}>
                                                        <Icon name="refreshCw" className="h-5 w-5" />
                                                    </button>
                                                    <button type="button" className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50" title="Revoke" disabled={!isActive} onClick={() => requestRevoke(k)}>
                                                        <Icon name="trash2" className="h-5 w-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Webhook Configuration</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure endpoints to receive real-time event notifications.</p>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Endpoint URL</label>
                                <div className="flex rounded-md shadow-sm">
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">https://</span>
                                    <input
                                        className="flex-1 block w-full rounded-none rounded-r-md border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                        placeholder="api.yourdomain.com/webhooks/listener"
                                        type="text"
                                        disabled={webhook.status !== 'success'}
                                        value={String(webhook.data.endpoint_url || '').replace(/^https?:\/\//i, '')}
                                        onChange={(e) => updateWebhookField('endpoint_url', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key (Signing)</label>
                                <div className="relative">
                                    <input className="block w-full rounded border-slate-300 bg-slate-50 text-slate-600 sm:text-sm py-2 px-3 pr-10" readOnly type="text" value={String(webhook.data.secret || '')} />
                                    <button type="button" onClick={copySecret} className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-800 transition-colors" title="Copy">
                                        <Icon name={secretCopied ? 'checkCircle' : 'copy'} className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3">Event Triggers</h3>
                            <div className="space-y-3">
                                {WEBHOOK_EVENTS.map((evt) => (
                                    <div key={evt.id} className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input type="checkbox" className="w-4 h-4 text-[#0a1f43] border-slate-300 rounded focus:ring-[#0a1f43]" disabled={webhook.status !== 'success'} checked={Array.isArray(webhook.data.enabled_events) && webhook.data.enabled_events.includes(evt.id)} onChange={() => toggleWebhookEvent(evt.id)} />
                                        </div>
                                        <div className="ml-3 text-sm">
                                            <div className="font-medium text-slate-700">{evt.label}</div>
                                            <p className="text-slate-500 text-xs">{evt.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className={`flex h-2 w-2 rounded-full ${webhook.data.verified ? 'bg-green-500' : 'bg-slate-300'}`} />
                            <span className="text-xs text-slate-500">{webhook.data.verified ? 'Test webhook verified' : 'Test webhook not verified'}</span>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={testWebhook} disabled={webhook.status !== 'success' || webhook.testStatus === 'submitting'} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50">{webhook.testStatus === 'submitting' ? 'Testing...' : 'Test Connection'}</button>
                            <button type="button" onClick={saveWebhook} disabled={webhook.status !== 'success' || !webhook.dirty || webhook.saveStatus === 'submitting'} className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50">{webhook.saveStatus === 'submitting' ? 'Saving...' : 'Save Webhook'}</button>
                            <button type="button" onClick={cancelWebhook} disabled={webhook.status !== 'success' || !webhook.dirty || webhook.saveStatus === 'submitting'} className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50">Cancel</button>
                        </div>
                    </div>

                    {webhook.saveStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{webhook.saveError?.message || 'Failed to save webhook.'}</div>}
                    {webhook.testStatus === 'error' && <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{webhook.testError?.message || 'Webhook test failed.'}</div>}
                </div>
            </section>
        </div>
    );
}
