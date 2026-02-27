import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../shared/Icon.jsx';
import { safeDelete, safeGet, safePost, safePut } from '../lib/api.js';

const settingTabs = [
    { id: 'security', label: 'Security Policies', icon: 'shield' },
    { id: 'head_office', label: 'Head Office Geo-Fence', icon: 'mapPin' },
    { id: 'integrations', label: 'API Integrations', icon: 'globe' },
    { id: 'shifts', label: 'Shift Templates', icon: 'schedule' },
    { id: 'notifications', label: 'Notification Rules', icon: 'bell' },
    { id: 'retention', label: 'Data Retention', icon: 'fileText' },
];

function Toggle({ checked, onChange, label }) {
    return (
        <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-slate-700">{label}</span>
            <button
                onClick={() => onChange(!checked)}
                className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-[#0a1f43]' : 'bg-slate-300'}`}
            >
                <span
                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`}
                />
            </button>
        </label>
    );
}

function Switch({ checked, onChange, label, disabled }) {
    return (
        <div className="flex items-center justify-between">
            <label className="text-sm text-slate-700">{label}</label>
            <button
                type="button"
                role="switch"
                aria-checked={checked ? 'true' : 'false'}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0a1f43] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                    checked ? 'bg-[#0a1f43]' : 'bg-slate-300'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-5' : 'translate-x-0'
                    }`}
                />
            </button>
        </div>
    );
}

function SettingCard({ title, description, icon, children }) {
    return (
        <div className="bg-white rounded-lg border border-slate-200 shadow-soft p-6">
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-[#0a1f43]/10 flex items-center justify-center">
                    <Icon name={icon} className="h-5 w-5 text-[#0a1f43]" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-800">{title}</h3>
                    {description && <p className="text-xs text-slate-500">{description}</p>}
                </div>
            </div>
            {children}
        </div>
    );
}

export function SettingsPage() {
    const [activeTab, setActiveTab] = useState('security');

    // General settings state
    const [orgName, setOrgName] = useState('Enterprise Bank Corp');
    const [timezone, setTimezone] = useState('America/New_York');
    const [dateFormat, setDateFormat] = useState('MM/DD/YYYY');

    const [security, setSecurity] = useState({
        status: 'loading',
        data: {
            enforce_mfa_admin: true,
            enforce_mfa_employee: false,
            admin_session_timeout_minutes: 30,
            employee_session_timeout_minutes: 60,
            password_min_length: 12,
            require_special_chars: true,
            password_expiry_days: 90,
        },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        error: null,
        saveError: null,
    });

    const [headOfficeGeo, setHeadOfficeGeo] = useState({
        status: 'idle',
        data: {
            latitude: 0,
            longitude: 0,
            radius_meters: 50,
        },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        error: null,
        saveError: null,
    });

    const [notificationRules, setNotificationRules] = useState({
        status: 'idle',
        data: { events: [], rules: {} },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        resetStatus: 'idle',
        error: null,
        saveError: null,
        resetError: null,
    });

    const [dataRetention, setDataRetention] = useState({
        status: 'idle',
        data: {
            audit_logs_days: 365,
            attendance_days: 730,
            employee_documents_days: 3650,
            reports_days: 365,
            api_logs_days: 90,
            auto_purge_enabled: true,
        },
        baseline: null,
        dirty: false,
        saveStatus: 'idle',
        resetStatus: 'idle',
        error: null,
        saveError: null,
        resetError: null,
    });

    const [apiKeys, setApiKeys] = useState({ status: 'idle', data: [], error: null });
    const [webhook, setWebhook] = useState({
        status: 'idle',
        data: {
            endpoint_url: '',
            secret: '',
            enabled_events: ['punch'],
            verified: false,
        },
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

    const [shiftTemplates, setShiftTemplates] = useState({ status: 'idle', data: [], error: null });
    const [shiftDefaults, setShiftDefaults] = useState({
        status: 'idle',
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
            setSecurity((prev) => ({ ...prev, status: 'loading', error: null }));
            const res = await safeGet('/api/settings/security');
            if (!active) return;
            if (!res.ok) {
                setSecurity((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }

            setSecurity((prev) => ({
                ...prev,
                status: 'success',
                data: res.data?.data ?? prev.data,
                baseline: res.data?.data ?? prev.data,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
                error: null,
            }));
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (activeTab !== 'integrations') {
            return;
        }

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

            const data = webhookRes.data?.data ?? prevWebhookDefaults();
            setWebhook((prev) => ({
                ...prev,
                status: 'success',
                data,
                baseline: data,
                dirty: false,
                saveStatus: 'idle',
                testStatus: 'idle',
                error: null,
                saveError: null,
                testError: null,
            }));
        })();

        return () => {
            active = false;
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'head_office') {
            return;
        }

        let active = true;

        (async () => {
            setHeadOfficeGeo((prev) => ({ ...prev, status: 'loading', error: null }));
            const res = await safeGet('/api/settings/head-office-geo');
            if (!active) return;

            if (!res.ok) {
                setHeadOfficeGeo((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }

            const d = res.data?.data ?? {};
            const data = {
                latitude: Number(d.latitude ?? 0),
                longitude: Number(d.longitude ?? 0),
                radius_meters: Number(d.radius_meters ?? 50),
            };

            setHeadOfficeGeo((prev) => ({
                ...prev,
                status: 'success',
                data,
                baseline: data,
                dirty: false,
                saveStatus: 'idle',
                error: null,
                saveError: null,
            }));
        })();

        return () => {
            active = false;
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'retention') {
            return;
        }

        let active = true;

        (async () => {
            setDataRetention((prev) => ({
                ...prev,
                status: 'loading',
                error: null,
                saveStatus: 'idle',
                saveError: null,
                resetStatus: 'idle',
                resetError: null,
            }));

            const res = await safeGet('/api/settings/data-retention');
            if (!active) return;

            if (!res.ok) {
                setDataRetention((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }

            const payload = res.data?.data ?? {};
            const data = {
                audit_logs_days: Number(payload.audit_logs_days) || 365,
                attendance_days: Number(payload.attendance_days) || 730,
                employee_documents_days: Number(payload.employee_documents_days) || 3650,
                reports_days: Number(payload.reports_days) || 365,
                api_logs_days: Number(payload.api_logs_days) || 90,
                auto_purge_enabled: Boolean(payload.auto_purge_enabled),
            };

            setDataRetention((prev) => ({
                ...prev,
                status: 'success',
                data,
                baseline: data,
                dirty: false,
                error: null,
            }));
        })();

        return () => {
            active = false;
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'notifications') {
            return;
        }

        let active = true;

        (async () => {
            setNotificationRules((prev) => ({
                ...prev,
                status: 'loading',
                error: null,
                saveStatus: 'idle',
                saveError: null,
                resetStatus: 'idle',
                resetError: null,
            }));

            const res = await safeGet('/api/settings/notification-rules');
            if (!active) return;

            if (!res.ok) {
                setNotificationRules((prev) => ({ ...prev, status: 'error', error: res.error }));
                return;
            }

            const payload = res.data?.data ?? { events: [], rules: {} };
            const data = {
                events: Array.isArray(payload.events) ? payload.events : [],
                rules: payload.rules && typeof payload.rules === 'object' ? payload.rules : {},
            };

            setNotificationRules((prev) => ({
                ...prev,
                status: 'success',
                data,
                baseline: data,
                dirty: false,
                error: null,
            }));
        })();

        return () => {
            active = false;
        };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'shifts') {
            return;
        }

        let active = true;

        (async () => {
            setShiftTemplates({ status: 'loading', data: [], error: null });
            setShiftDefaults((prev) => ({ ...prev, status: 'loading', error: null }));

            const [tplRes, defRes] = await Promise.all([
                safeGet('/api/settings/shift-templates'),
                safeGet('/api/settings/shift-defaults'),
            ]);

            if (!active) return;

            setShiftTemplates(tplRes.ok ? { status: 'success', data: tplRes.data?.data ?? [], error: null } : { status: 'error', data: [], error: tplRes.error });

            if (!defRes.ok) {
                setShiftDefaults((prev) => ({ ...prev, status: 'error', error: defRes.error }));
                return;
            }

            const data = defRes.data?.data ?? { default_shift_template_id: null, strict_break_compliance: true };
            setShiftDefaults((prev) => ({
                ...prev,
                status: 'success',
                data,
                baseline: data,
                dirty: false,
                saveStatus: 'idle',
                error: null,
                saveError: null,
            }));
        })();

        return () => {
            active = false;
        };
    }, [activeTab]);

    const infoPanel = useMemo(() => {
        if (activeTab === 'head_office') {
            return {
                title: 'Geo-Fence Enforcement',
                body: 'Employees outside this radius will be blocked from attendance check-in/out.',
            };
        }

        if (activeTab === 'integrations') {
            return {
                title: 'API Documentation',
                body: 'Review the latest v2.1 developer documentation before generating new keys.',
            };
        }

        if (activeTab === 'shifts') {
            return {
                title: 'Template Logic',
                body: 'Changes to global templates will apply across the organization unless overridden locally.',
            };
        }

        if (activeTab === 'retention') {
            return {
                title: 'Configuration Note',
                body: 'Retention rules update immediately. Deleting historical data is irreversible.',
            };
        }

        return {
            title: 'Configuration Note',
            body: 'Changes to global security settings may force re-authentication for all active sessions.',
        };
    }, [activeTab]);

    function prevWebhookDefaults() {
        return {
            endpoint_url: '',
            secret: '',
            enabled_events: ['punch'],
            verified: false,
        };
    }

    const securityCanSave = useMemo(() => {
        return security.status === 'success' && security.dirty && security.saveStatus !== 'submitting';
    }, [security.dirty, security.saveStatus, security.status]);

    const headOfficeGeoCanSave = useMemo(() => {
        return headOfficeGeo.status === 'success' && headOfficeGeo.dirty && headOfficeGeo.saveStatus !== 'submitting';
    }, [headOfficeGeo.dirty, headOfficeGeo.saveStatus, headOfficeGeo.status]);

    const updateSecurityField = (field, value) => {
        setSecurity((prev) => ({
            ...prev,
            data: { ...prev.data, [field]: value },
            dirty: true,
            saveStatus: 'idle',
            saveError: null,
        }));
    };

    const saveSecurity = async () => {
        if (!securityCanSave) return;

        setSecurity((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/security', security.data);

        if (!res.ok) {
            setSecurity((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        setSecurity((prev) => ({
            ...prev,
            saveStatus: 'success',
            data: res.data?.data ?? prev.data,
            baseline: res.data?.data ?? prev.data,
            dirty: false,
            saveError: null,
        }));
    };

    const cancelSecurity = () => {
        setSecurity((prev) => {
            if (prev.status !== 'success' || !prev.baseline) {
                return prev;
            }

            return {
                ...prev,
                data: prev.baseline,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
            };
        });
    };

    const updateHeadOfficeGeoField = (field, value) => {
        setHeadOfficeGeo((prev) => ({
            ...prev,
            data: { ...prev.data, [field]: value },
            dirty: true,
            saveStatus: 'idle',
            saveError: null,
        }));
    };

    const cancelHeadOfficeGeo = () => {
        setHeadOfficeGeo((prev) => {
            if (prev.status !== 'success' || !prev.baseline) {
                return prev;
            }

            return {
                ...prev,
                data: prev.baseline,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
            };
        });
    };

    const saveHeadOfficeGeo = async () => {
        if (!headOfficeGeoCanSave) return;

        const latitude = Number(headOfficeGeo.data.latitude);
        const longitude = Number(headOfficeGeo.data.longitude);
        const radius = Number(headOfficeGeo.data.radius_meters);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(radius) || radius <= 0) {
            setHeadOfficeGeo((prev) => ({ ...prev, saveStatus: 'error', saveError: { message: 'Latitude, longitude, and radius are required.' } }));
            return;
        }

        setHeadOfficeGeo((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/head-office-geo', {
            latitude,
            longitude,
            radius_meters: Math.round(radius),
        });

        if (!res.ok) {
            setHeadOfficeGeo((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        const d = res.data?.data ?? {};
        const data = {
            latitude: Number(d.latitude ?? latitude),
            longitude: Number(d.longitude ?? longitude),
            radius_meters: Number(d.radius_meters ?? Math.round(radius)),
        };

        setHeadOfficeGeo((prev) => ({
            ...prev,
            saveStatus: 'success',
            data,
            baseline: data,
            dirty: false,
            saveError: null,
        }));
    };

    const openNewKeyModal = () => {
        setNewKeyModal({ open: true, name: '', status: 'idle', error: null, created: null });
    };

    const createApiKey = async () => {
        if (newKeyModal.status === 'submitting') {
            return;
        }

        const name = String(newKeyModal.name || '').trim();
        if (!name) {
            setNewKeyModal((prev) => ({ ...prev, status: 'error', error: { message: 'Key name is required.' } }));
            return;
        }

        setNewKeyModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safePost('/api/settings/api-keys', { name });
        if (!res.ok) {
            setNewKeyModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        const created = res.data?.data ?? null;
        setNewKeyModal((prev) => ({ ...prev, status: 'success', created }));
        setApiKeys((prev) => ({ ...prev, data: created ? [created, ...(prev.data || [])] : prev.data }));
    };

    const regenerateApiKey = async (id) => {
        const keyId = Number(id) || 0;
        if (!keyId) return;

        const res = await safePost(`/api/settings/api-keys/${keyId}/regenerate`, {});
        if (!res.ok) {
            return;
        }

        const updated = res.data?.data ?? null;
        if (!updated) return;

        setNewKeyModal({ open: true, name: updated.name || '', status: 'success', error: null, created: updated });
        setApiKeys((prev) => ({
            ...prev,
            data: (prev.data || []).map((k) => (Number(k.id) === keyId ? { ...k, ...updated } : k)),
        }));
    };

    const requestRevoke = (key) => {
        setRevokeModal({ open: true, key, status: 'idle', error: null });
    };

    const confirmRevoke = async () => {
        const keyId = Number(revokeModal.key?.id) || 0;
        if (!keyId || revokeModal.status === 'submitting') {
            return;
        }

        setRevokeModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safeDelete(`/api/settings/api-keys/${keyId}`);
        if (!res.ok) {
            setRevokeModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        setRevokeModal({ open: false, key: null, status: 'idle', error: null });
        setApiKeys((prev) => ({
            ...prev,
            data: (prev.data || []).map((k) => (Number(k.id) === keyId ? { ...k, status: 'revoked' } : k)),
        }));
    };

    const updateWebhookField = (field, value) => {
        setWebhook((prev) => ({
            ...prev,
            data: { ...prev.data, [field]: value },
            dirty: true,
            saveStatus: 'idle',
            saveError: null,
        }));
    };

    const toggleWebhookEvent = (eventId) => {
        const id = String(eventId);
        setWebhook((prev) => {
            const current = Array.isArray(prev.data.enabled_events) ? prev.data.enabled_events : [];
            const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
            return {
                ...prev,
                data: { ...prev.data, enabled_events: next },
                dirty: true,
                saveStatus: 'idle',
                saveError: null,
            };
        });
    };

    const cancelWebhook = () => {
        setWebhook((prev) => {
            if (prev.status !== 'success' || !prev.baseline) {
                return prev;
            }

            return {
                ...prev,
                data: prev.baseline,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
                testError: null,
            };
        });
    };

    const saveWebhook = async () => {
        if (webhook.status !== 'success' || !webhook.dirty || webhook.saveStatus === 'submitting') {
            return;
        }

        setWebhook((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/webhook', {
            endpoint_url: webhook.data.endpoint_url,
            enabled_events: webhook.data.enabled_events,
        });

        if (!res.ok) {
            setWebhook((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        const updated = res.data?.data ?? webhook.data;
        setWebhook((prev) => ({
            ...prev,
            saveStatus: 'success',
            data: { ...prev.data, ...updated },
            baseline: { ...prev.data, ...updated },
            dirty: false,
            saveError: null,
        }));
    };

    const testWebhook = async () => {
        if (webhook.testStatus === 'submitting') {
            return;
        }

        setWebhook((prev) => ({ ...prev, testStatus: 'submitting', testError: null }));
        const res = await safePost('/api/settings/webhook/test', {});
        if (!res.ok) {
            setWebhook((prev) => ({ ...prev, testStatus: 'error', testError: res.error }));
            return;
        }

        const ok = Boolean(res.data?.data?.ok);
        setWebhook((prev) => ({
            ...prev,
            testStatus: 'success',
            data: { ...prev.data, verified: ok },
        }));
    };

    const copySecret = async () => {
        const secret = String(webhook.data.secret || '');
        if (!secret) return;

        try {
            await navigator.clipboard.writeText(secret);
            setSecretCopied(true);
            window.setTimeout(() => setSecretCopied(false), 2000);
        } catch {
            // ignore
        }
    };

    const openCreateTemplate = () => {
        setTemplateModal({
            open: true,
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
    };

    const openEditTemplate = (tpl) => {
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
        if (templateModal.submitStatus === 'submitting') {
            return;
        }

        const name = String(templateModal.name || '').trim();
        if (!name) {
            setTemplateModal((prev) => ({ ...prev, submitStatus: 'error', error: { message: 'Template name is required.' } }));
            return;
        }

        const payload = {
            name,
            start_time: templateModal.start_time,
            end_time: templateModal.end_time,
            break_minutes: Number(templateModal.break_minutes) || 0,
            status: templateModal.status,
        };

        setTemplateModal((prev) => ({ ...prev, submitStatus: 'submitting', error: null }));
        const res = templateModal.mode === 'edit' && templateModal.id
            ? await safePut(`/api/settings/shift-templates/${templateModal.id}`, payload)
            : await safePost('/api/settings/shift-templates', payload);

        if (!res.ok) {
            setTemplateModal((prev) => ({ ...prev, submitStatus: 'error', error: res.error }));
            return;
        }

        const saved = res.data?.data ?? null;
        if (!saved) {
            setTemplateModal((prev) => ({ ...prev, submitStatus: 'success' }));
            setTemplateModal((prev) => ({ ...prev, open: false }));
            return;
        }

        setShiftTemplates((prev) => {
            const list = Array.isArray(prev.data) ? prev.data : [];
            const idx = list.findIndex((x) => Number(x.id) === Number(saved.id));
            if (idx >= 0) {
                const next = [...list];
                next[idx] = saved;
                return { ...prev, data: next };
            }
            return { ...prev, data: [saved, ...list] };
        });

        setTemplateModal((prev) => ({ ...prev, submitStatus: 'success' }));
        setTemplateModal((prev) => ({ ...prev, open: false }));
    };

    const requestArchiveTemplate = (tpl) => {
        setArchiveModal({ open: true, template: tpl, status: 'idle', error: null });
    };

    const confirmArchiveTemplate = async () => {
        const id = Number(archiveModal.template?.id) || 0;
        if (!id || archiveModal.status === 'submitting') {
            return;
        }

        setArchiveModal((prev) => ({ ...prev, status: 'submitting', error: null }));
        const res = await safeDelete(`/api/settings/shift-templates/${id}`);
        if (!res.ok) {
            setArchiveModal((prev) => ({ ...prev, status: 'error', error: res.error }));
            return;
        }

        setArchiveModal({ open: false, template: null, status: 'idle', error: null });
        setShiftTemplates((prev) => ({ ...prev, data: (prev.data || []).filter((x) => Number(x.id) !== id) }));

        setShiftDefaults((prev) => {
            if (Number(prev.data.default_shift_template_id) !== id) {
                return prev;
            }

            const data = { ...prev.data, default_shift_template_id: null };
            return { ...prev, data, baseline: prev.baseline ? { ...prev.baseline, default_shift_template_id: null } : prev.baseline, dirty: true };
        });
    };

    const updateShiftDefault = (field, value) => {
        setShiftDefaults((prev) => ({
            ...prev,
            data: { ...prev.data, [field]: value },
            dirty: true,
            saveStatus: 'idle',
            saveError: null,
        }));
    };

    const discardShiftDefaults = () => {
        setShiftDefaults((prev) => {
            if (prev.status !== 'success' || !prev.baseline) {
                return prev;
            }

            return {
                ...prev,
                data: prev.baseline,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
            };
        });
    };

    const saveShiftDefaults = async () => {
        if (shiftDefaults.status !== 'success' || !shiftDefaults.dirty || shiftDefaults.saveStatus === 'submitting') {
            return;
        }

        setShiftDefaults((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/shift-defaults', {
            default_shift_template_id: shiftDefaults.data.default_shift_template_id,
            strict_break_compliance: Boolean(shiftDefaults.data.strict_break_compliance),
        });

        if (!res.ok) {
            setShiftDefaults((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        const saved = res.data?.data ?? shiftDefaults.data;
        setShiftDefaults((prev) => ({
            ...prev,
            saveStatus: 'success',
            data: saved,
            baseline: saved,
            dirty: false,
            saveError: null,
        }));
    };

    const setNotificationRule = (eventId, channel, value) => {
        const id = String(eventId || '');
        if (!id) return;

        setNotificationRules((prev) => {
            const rules = prev.data?.rules && typeof prev.data.rules === 'object' ? prev.data.rules : {};
            const currentChannels = rules[id] && typeof rules[id] === 'object' ? rules[id] : { in_app: true, email: false, sms: false };
            const nextChannels = { ...currentChannels, [channel]: Boolean(value) };

            return {
                ...prev,
                data: {
                    ...prev.data,
                    rules: {
                        ...rules,
                        [id]: nextChannels,
                    },
                },
                dirty: true,
                saveStatus: 'idle',
                saveError: null,
            };
        });
    };

    const discardNotificationRules = () => {
        setNotificationRules((prev) => {
            if (prev.status !== 'success' || !prev.baseline) {
                return prev;
            }

            return {
                ...prev,
                data: prev.baseline,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
                resetStatus: 'idle',
                resetError: null,
            };
        });
    };

    const saveNotificationRules = async () => {
        if (notificationRules.status !== 'success' || !notificationRules.dirty || notificationRules.saveStatus === 'submitting') {
            return;
        }

        setNotificationRules((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/notification-rules', {
            rules: notificationRules.data.rules,
        });

        if (!res.ok) {
            setNotificationRules((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        const payload = res.data?.data ?? notificationRules.data;
        const data = {
            events: Array.isArray(payload.events) ? payload.events : notificationRules.data.events,
            rules: payload.rules && typeof payload.rules === 'object' ? payload.rules : notificationRules.data.rules,
        };

        setNotificationRules((prev) => ({
            ...prev,
            saveStatus: 'success',
            data,
            baseline: data,
            dirty: false,
            saveError: null,
        }));
    };

    const resetNotificationRules = async () => {
        if (notificationRules.resetStatus === 'submitting') {
            return;
        }

        setNotificationRules((prev) => ({ ...prev, resetStatus: 'submitting', resetError: null }));
        const res = await safePost('/api/settings/notification-rules/reset', {});
        if (!res.ok) {
            setNotificationRules((prev) => ({ ...prev, resetStatus: 'error', resetError: res.error }));
            return;
        }

        const payload = res.data?.data ?? { events: [], rules: {} };
        const data = {
            events: Array.isArray(payload.events) ? payload.events : [],
            rules: payload.rules && typeof payload.rules === 'object' ? payload.rules : {},
        };

        setNotificationRules((prev) => ({
            ...prev,
            resetStatus: 'success',
            data,
            baseline: data,
            dirty: false,
            saveStatus: 'idle',
            saveError: null,
            resetError: null,
        }));
    };

    const updateRetentionField = (field, value) => {
        setDataRetention((prev) => ({
            ...prev,
            data: { ...prev.data, [field]: value },
            dirty: true,
            saveStatus: 'idle',
            saveError: null,
        }));
    };

    const discardDataRetention = () => {
        setDataRetention((prev) => {
            if (prev.status !== 'success' || !prev.baseline) {
                return prev;
            }

            return {
                ...prev,
                data: prev.baseline,
                dirty: false,
                saveStatus: 'idle',
                saveError: null,
                resetStatus: 'idle',
                resetError: null,
            };
        });
    };

    const saveDataRetention = async () => {
        if (dataRetention.status !== 'success' || !dataRetention.dirty || dataRetention.saveStatus === 'submitting') {
            return;
        }

        setDataRetention((prev) => ({ ...prev, saveStatus: 'submitting', saveError: null }));
        const res = await safePut('/api/settings/data-retention', dataRetention.data);

        if (!res.ok) {
            setDataRetention((prev) => ({ ...prev, saveStatus: 'error', saveError: res.error }));
            return;
        }

        const payload = res.data?.data ?? dataRetention.data;
        const saved = {
            audit_logs_days: Number(payload.audit_logs_days) || dataRetention.data.audit_logs_days,
            attendance_days: Number(payload.attendance_days) || dataRetention.data.attendance_days,
            employee_documents_days: Number(payload.employee_documents_days) || dataRetention.data.employee_documents_days,
            reports_days: Number(payload.reports_days) || dataRetention.data.reports_days,
            api_logs_days: Number(payload.api_logs_days) || dataRetention.data.api_logs_days,
            auto_purge_enabled: Boolean(payload.auto_purge_enabled),
        };

        setDataRetention((prev) => ({
            ...prev,
            saveStatus: 'success',
            data: saved,
            baseline: saved,
            dirty: false,
            saveError: null,
        }));
    };

    const resetDataRetention = async () => {
        if (dataRetention.resetStatus === 'submitting') {
            return;
        }

        setDataRetention((prev) => ({ ...prev, resetStatus: 'submitting', resetError: null }));
        const res = await safePost('/api/settings/data-retention/reset', {});

        if (!res.ok) {
            setDataRetention((prev) => ({ ...prev, resetStatus: 'error', resetError: res.error }));
            return;
        }

        const payload = res.data?.data ?? {};
        const data = {
            audit_logs_days: Number(payload.audit_logs_days) || 365,
            attendance_days: Number(payload.attendance_days) || 730,
            employee_documents_days: Number(payload.employee_documents_days) || 3650,
            reports_days: Number(payload.reports_days) || 365,
            api_logs_days: Number(payload.api_logs_days) || 90,
            auto_purge_enabled: Boolean(payload.auto_purge_enabled),
        };

        setDataRetention((prev) => ({
            ...prev,
            resetStatus: 'success',
            data,
            baseline: data,
            dirty: false,
            saveStatus: 'idle',
            saveError: null,
            resetError: null,
        }));
    };

    function formatTime12(value) {
        const v = String(value || '').slice(0, 5);
        if (!/^\d{2}:\d{2}$/.test(v)) {
            return String(value || '—');
        }

        const [h, m] = v.split(':').map((x) => Number(x));
        const am = h < 12;
        const hh = ((h + 11) % 12) + 1;
        return `${String(hh).padStart(2, '0')}:${String(m).padStart(2, '0')} ${am ? 'AM' : 'PM'}`;
    }

    const renderShiftSettings = () => (
        <div className="space-y-6">
            {templateModal.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => {
                            if (templateModal.submitStatus === 'submitting') return;
                            setTemplateModal((prev) => ({ ...prev, open: false }));
                        }}
                        aria-label="Close template modal"
                    />
                    <div className="relative w-full max-w-xl bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">{templateModal.mode === 'edit' ? 'Edit Template' : 'Create New Template'}</h3>
                                <p className="text-xs text-slate-500 mt-1">Define a standard shift structure.</p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => {
                                    if (templateModal.submitStatus === 'submitting') return;
                                    setTemplateModal((prev) => ({ ...prev, open: false }));
                                }}
                                aria-label="Close"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Template Name</label>
                                <input
                                    className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                    value={templateModal.name}
                                    onChange={(e) => setTemplateModal((prev) => ({ ...prev, name: e.target.value }))}
                                    placeholder="e.g. Morning Teller"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                        value={templateModal.start_time}
                                        onChange={(e) => setTemplateModal((prev) => ({ ...prev, start_time: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                        value={templateModal.end_time}
                                        onChange={(e) => setTemplateModal((prev) => ({ ...prev, end_time: e.target.value }))}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Break (mins)</label>
                                    <input
                                        type="number"
                                        className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                        value={String(templateModal.break_minutes)}
                                        onChange={(e) => setTemplateModal((prev) => ({ ...prev, break_minutes: Number(e.target.value) || 0 }))}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                                <select
                                    className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                    value={templateModal.status}
                                    onChange={(e) => setTemplateModal((prev) => ({ ...prev, status: e.target.value }))}
                                >
                                    <option value="active">Active</option>
                                    <option value="draft">Draft</option>
                                </select>
                            </div>

                            {templateModal.submitStatus === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {templateModal.error?.message || 'Failed to save template.'}
                                </div>
                            ) : null}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button
                                type="button"
                                onClick={() => setTemplateModal((prev) => ({ ...prev, open: false }))}
                                disabled={templateModal.submitStatus === 'submitting'}
                                className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={submitTemplate}
                                disabled={templateModal.submitStatus === 'submitting'}
                                className="px-3 py-2 text-sm bg-[#0a1f43] text-white rounded hover:bg-[#0a1f43]/90 shadow-sm disabled:opacity-50"
                            >
                                {templateModal.submitStatus === 'submitting' ? 'Saving...' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            {archiveModal.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => {
                            if (archiveModal.status === 'submitting') return;
                            setArchiveModal({ open: false, template: null, status: 'idle', error: null });
                        }}
                        aria-label="Close archive modal"
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Archive Template</h3>
                                <p className="text-xs text-slate-500 mt-1">This will hide the template from global selection.</p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => {
                                    if (archiveModal.status === 'submitting') return;
                                    setArchiveModal({ open: false, template: null, status: 'idle', error: null });
                                }}
                                aria-label="Close"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <div className="font-semibold">Template:</div>
                                <div className="mt-1 break-words">{archiveModal.template?.name || '—'}</div>
                            </div>
                            {archiveModal.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {archiveModal.error?.message || 'Failed to archive template.'}
                                </div>
                            ) : null}
                        </div>
                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button
                                type="button"
                                onClick={() => setArchiveModal({ open: false, template: null, status: 'idle', error: null })}
                                disabled={archiveModal.status === 'submitting'}
                                className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmArchiveTemplate}
                                disabled={archiveModal.status === 'submitting'}
                                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 shadow-sm disabled:opacity-50"
                            >
                                {archiveModal.status === 'submitting' ? 'Archiving...' : 'Archive'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Global Shift Templates</h2>
                        <p className="text-sm text-slate-500 mt-1">Define standard shift structures for deployment across all banking units.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openCreateTemplate}
                        className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors flex items-center"
                    >
                        <Icon name="add" className="h-4 w-4 mr-2" />
                        Create New Template
                    </button>
                </div>

                <div className="p-6">
                    {shiftTemplates.status === 'loading' ? (
                        <div className="text-sm text-slate-500">Loading templates...</div>
                    ) : shiftTemplates.status === 'error' ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to load shift templates.</div>
                    ) : (shiftTemplates.data || []).length === 0 ? (
                        <div className="text-sm text-slate-500">No templates yet.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {(shiftTemplates.data || []).map((tpl) => {
                                const isDraft = String(tpl.status || '') === 'draft';
                                return (
                                    <div
                                        key={tpl.id}
                                        className="group border border-slate-200 rounded-lg p-5 hover:border-[#C9A227] transition-colors bg-slate-50 relative"
                                    >
                                        <div className="absolute top-4 right-4 text-slate-400 group-hover:text-slate-700 cursor-pointer">
                                            <button
                                                type="button"
                                                className="p-1 rounded hover:bg-slate-200"
                                                onClick={() => openEditTemplate(tpl)}
                                                title="Edit"
                                            >
                                                <Icon name="more" className="h-5 w-5" />
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center">
                                                <Icon name="clock" className="h-5 w-5" />
                                            </div>
                                            <h3 className="font-semibold text-slate-800">{tpl.name}</h3>
                                        </div>
                                        <div className="space-y-3 text-sm">
                                            <div className="flex justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-500">Start Time</span>
                                                <span className="font-mono font-medium text-slate-700">{formatTime12(tpl.start_time)}</span>
                                            </div>
                                            <div className="flex justify-between py-1 border-b border-slate-100">
                                                <span className="text-slate-500">End Time</span>
                                                <span className="font-mono font-medium text-slate-700">{formatTime12(tpl.end_time)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span className="text-slate-500">Break</span>
                                                <span className="font-mono font-medium text-slate-700">{Number(tpl.break_minutes) || 0} mins</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded border ${
                                                    isDraft
                                                        ? 'text-slate-500 bg-slate-200 border-slate-200'
                                                        : 'text-green-600 bg-green-100 border-green-200'
                                                }`}
                                            >
                                                {isDraft ? 'Draft' : 'Active'}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-slate-400">ID: {tpl.code}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => requestArchiveTemplate(tpl)}
                                                    className="text-xs text-red-600 hover:underline"
                                                >
                                                    Archive
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </section>

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden mt-6">
                <div className="p-6 border-b border-slate-200">
                    <h2 className="text-lg font-bold text-slate-800">Global Defaults</h2>
                    <p className="text-sm text-slate-500 mt-1">Configure default shift assignments for new entities.</p>
                </div>

                <div className="p-6">
                    {shiftDefaults.status === 'loading' ? (
                        <div className="text-sm text-slate-500">Loading defaults...</div>
                    ) : shiftDefaults.status === 'error' ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to load shift defaults.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Default Shift for New Departments</label>
                                <select
                                    className="block w-full rounded border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                    value={shiftDefaults.data.default_shift_template_id ?? ''}
                                    onChange={(e) => updateShiftDefault('default_shift_template_id', e.target.value ? Number(e.target.value) : null)}
                                >
                                    <option value="">Select a shift template...</option>
                                    {(shiftTemplates.data || []).map((t) => (
                                        <option key={t.id} value={t.id}>
                                            {t.name} ({formatTime12(t.start_time)} - {formatTime12(t.end_time)})
                                        </option>
                                    ))}
                                </select>
                                <p className="text-xs text-slate-500 mt-2">Automatically assigned when a new department is provisioned.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Default Break Policy</label>
                                <div className="flex items-start gap-3 mt-2">
                                    <div className="flex items-center h-5">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-[#0a1f43] bg-slate-100 border-slate-300 rounded focus:ring-[#0a1f43]"
                                            checked={Boolean(shiftDefaults.data.strict_break_compliance)}
                                            onChange={(e) => updateShiftDefault('strict_break_compliance', Boolean(e.target.checked))}
                                        />
                                    </div>
                                    <div className="ml-1 text-sm">
                                        <div className="font-medium text-slate-700">Strict Break Compliance</div>
                                        <p className="text-slate-500 text-xs mt-1">Flag anomalies if break duration exceeds template by &gt;5%.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={discardShiftDefaults}
                        disabled={shiftDefaults.saveStatus === 'submitting' || !shiftDefaults.dirty}
                        className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Discard Changes
                    </button>
                    <button
                        type="button"
                        onClick={saveShiftDefaults}
                        disabled={shiftDefaults.saveStatus === 'submitting' || !shiftDefaults.dirty}
                        className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                        {shiftDefaults.saveStatus === 'submitting' ? 'Saving...' : 'Save Configuration'}
                    </button>
                </div>
            </section>

            {shiftDefaults.saveStatus === 'error' ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {shiftDefaults.saveError?.message || 'Failed to save shift defaults.'}
                </div>
            ) : null}
        </div>
    );

    const renderGeneralSettings = () => (
        <div className="space-y-6">
            <SettingCard
                title="Organization Profile"
                description="Manage your organization's basic information"
                icon="building2"
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Organization Name</label>
                        <input
                            type="text"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                            className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43] focus:border-[#0a1f43]"
                        />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Timezone</label>
                            <select
                                value={timezone}
                                onChange={(e) => setTimezone(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43]"
                            >
                                <option value="America/New_York">Eastern Time (ET)</option>
                                <option value="America/Chicago">Central Time (CT)</option>
                                <option value="America/Denver">Mountain Time (MT)</option>
                                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                                <option value="Europe/London">London (GMT)</option>
                                <option value="Asia/Singapore">Singapore (SGT)</option>
                                <option value="Asia/Tokyo">Tokyo (JST)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Date Format</label>
                            <select
                                value={dateFormat}
                                onChange={(e) => setDateFormat(e.target.value)}
                                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43]"
                            >
                                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                            </select>
                        </div>
                    </div>
                </div>
            </SettingCard>

            <SettingCard
                title="System Preferences"
                description="Configure system-wide defaults"
                icon="slidersHorizontal"
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Default Language</label>
                            <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43]">
                                <option value="en">English</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Currency</label>
                            <select className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#0a1f43]">
                                <option value="USD">USD ($)</option>
                                <option value="EUR">EUR (€)</option>
                                <option value="GBP">GBP (£)</option>
                                <option value="JPY">JPY (¥)</option>
                                <option value="SGD">SGD (S$)</option>
                            </select>
                        </div>
                    </div>
                    <Toggle
                        checked={true}
                        onChange={() => {}}
                        label="Enable dark mode support"
                    />
                </div>
            </SettingCard>
        </div>
    );

    const renderHeadOfficeGeoSettings = () => (
        <div className="space-y-6">
            <SettingCard
                title="Head Office Geo-Fence"
                description="Attendance is allowed only within this configured radius."
                icon="mapPin"
            >
                {headOfficeGeo.status === 'loading' ? <div className="text-sm text-slate-500">Loading…</div> : null}

                {headOfficeGeo.status === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {headOfficeGeo.error?.message || 'Failed to load Head Office settings.'}
                    </div>
                ) : null}

                {headOfficeGeo.status === 'success' ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                            <label className="text-sm">
                                <div className="mb-1 text-xs font-medium text-slate-600">Latitude</div>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className="w-full rounded border-slate-200"
                                    value={headOfficeGeo.data.latitude}
                                    onChange={(e) => updateHeadOfficeGeoField('latitude', e.target.value)}
                                />
                            </label>
                            <label className="text-sm">
                                <div className="mb-1 text-xs font-medium text-slate-600">Longitude</div>
                                <input
                                    type="number"
                                    step="0.000001"
                                    className="w-full rounded border-slate-200"
                                    value={headOfficeGeo.data.longitude}
                                    onChange={(e) => updateHeadOfficeGeoField('longitude', e.target.value)}
                                />
                            </label>
                            <label className="text-sm">
                                <div className="mb-1 text-xs font-medium text-slate-600">Radius (meters)</div>
                                <input
                                    type="number"
                                    step="1"
                                    min="1"
                                    className="w-full rounded border-slate-200"
                                    value={headOfficeGeo.data.radius_meters}
                                    onChange={(e) => updateHeadOfficeGeoField('radius_meters', e.target.value)}
                                />
                            </label>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="text-xs text-slate-500">
                                Current: {Number(headOfficeGeo.data.latitude).toFixed(6)}, {Number(headOfficeGeo.data.longitude).toFixed(6)} • {Math.round(Number(headOfficeGeo.data.radius_meters) || 0)}m
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={cancelHeadOfficeGeo}
                                    disabled={headOfficeGeo.status !== 'success' || !headOfficeGeo.dirty || headOfficeGeo.saveStatus === 'submitting'}
                                    className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={saveHeadOfficeGeo}
                                    disabled={!headOfficeGeoCanSave}
                                    className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                                >
                                    {headOfficeGeo.saveStatus === 'submitting' ? 'Saving…' : 'Save'}
                                </button>
                            </div>
                        </div>

                        {headOfficeGeo.saveStatus === 'error' ? (
                            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                {headOfficeGeo.saveError?.message || 'Failed to save Head Office settings.'}
                            </div>
                        ) : null}
                    </div>
                ) : null}
            </SettingCard>
        </div>
    );

    const renderSecuritySettings = () => (
        <div className="space-y-6">
            {security.status === 'loading' ? (
                <div className="text-sm text-slate-500">Loading security policies...</div>
            ) : null}
            {security.status === 'error' ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {security.error?.message || 'Failed to load security policies.'}
                </div>
            ) : null}
            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Security Policies</h2>
                        <p className="text-sm text-slate-500 mt-1">Manage Multi-Factor Authentication (MFA) and session parameters.</p>
                    </div>
                    <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded uppercase">Active</span>
                </div>

                <div className="p-6 space-y-8">
                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide">Authentication Standards</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <label className="flex items-start gap-3">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-[#0a1f43] bg-slate-100 border-slate-300 rounded focus:ring-[#0a1f43]"
                                        checked={Boolean(security.data.enforce_mfa_admin)}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateSecurityField('enforce_mfa_admin', Boolean(e.target.checked))}
                                    />
                                </div>
                                <div className="ml-1 text-sm">
                                    <div className="font-medium text-slate-700">Enforce MFA for Administrators</div>
                                    <p className="text-slate-500 text-xs mt-1">Requires 2FA app or SMS verification for all admin roles.</p>
                                </div>
                            </label>

                            <label className="flex items-start gap-3">
                                <div className="flex items-center h-5">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-[#0a1f43] bg-slate-100 border-slate-300 rounded focus:ring-[#0a1f43]"
                                        checked={Boolean(security.data.enforce_mfa_employee)}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateSecurityField('enforce_mfa_employee', Boolean(e.target.checked))}
                                    />
                                </div>
                                <div className="ml-1 text-sm">
                                    <div className="font-medium text-slate-700">Enforce MFA for Employee Portal</div>
                                    <p className="text-slate-500 text-xs mt-1">Optional for standard users. Recommended for remote access.</p>
                                </div>
                            </label>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide border-t border-slate-100 pt-6">
                            Session Management
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Admin Session Timeout (Minutes)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        className="block w-full rounded border-slate-300 focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                        type="number"
                                        value={String(security.data.admin_session_timeout_minutes ?? '')}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateSecurityField('admin_session_timeout_minutes', Number(e.target.value) || 0)}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 sm:text-sm">min</span>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">Employee Session Timeout (Minutes)</label>
                                <div className="relative rounded-md shadow-sm">
                                    <input
                                        className="block w-full rounded border-slate-300 focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                        type="number"
                                        value={String(security.data.employee_session_timeout_minutes ?? '')}
                                        disabled={security.status !== 'success'}
                                        onChange={(e) => updateSecurityField('employee_session_timeout_minutes', Number(e.target.value) || 0)}
                                    />
                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                        <span className="text-slate-500 sm:text-sm">min</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h3 className="text-sm font-semibold text-slate-900 mb-4 uppercase tracking-wide border-t border-slate-100 pt-6">
                            Password Complexity
                        </h3>
                        <div className="flex flex-col space-y-4">
                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-700">Minimum Password Length</label>
                                <select
                                    className="rounded border-slate-300 text-sm focus:ring-[#0a1f43] focus:border-[#0a1f43] bg-white"
                                    disabled={security.status !== 'success'}
                                    value={String(security.data.password_min_length ?? 12)}
                                    onChange={(e) => updateSecurityField('password_min_length', Number(e.target.value) || 0)}
                                >
                                    <option value="8">8 Characters</option>
                                    <option value="12">12 Characters</option>
                                    <option value="16">16 Characters</option>
                                </select>
                            </div>

                            <Switch
                                checked={Boolean(security.data.require_special_chars)}
                                disabled={security.status !== 'success'}
                                onChange={(v) => updateSecurityField('require_special_chars', Boolean(v))}
                                label="Require Special Characters"
                            />

                            <div className="flex items-center justify-between">
                                <label className="text-sm text-slate-700">Password Expiry (Days)</label>
                                <input
                                    className="w-24 rounded border-slate-300 text-sm focus:ring-[#0a1f43] focus:border-[#0a1f43] bg-white py-1 px-2"
                                    type="number"
                                    value={String(security.data.password_expiry_days ?? '')}
                                    disabled={security.status !== 'success'}
                                    onChange={(e) => updateSecurityField('password_expiry_days', Number(e.target.value) || 0)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={cancelSecurity}
                        disabled={security.status !== 'success' || !security.dirty || security.saveStatus === 'submitting'}
                        className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={saveSecurity}
                        disabled={!securityCanSave}
                        className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                    >
                        {security.saveStatus === 'submitting' ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </section>

            {security.saveStatus === 'error' ? (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {security.saveError?.message || 'Failed to save security policies.'}
                </div>
            ) : null}
            {security.saveStatus === 'success' ? (
                <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Security policies saved.</div>
            ) : null}
        </div>
    );

    const renderNotificationSettings = () => {
        const events = Array.isArray(notificationRules.data?.events) ? notificationRules.data.events : [];
        const rules = notificationRules.data?.rules && typeof notificationRules.data.rules === 'object' ? notificationRules.data.rules : {};

        const severityMeta = {
            critical: { bg: 'bg-red-100', fg: 'text-red-600', icon: 'alertCircle' },
            warning: { bg: 'bg-amber-100', fg: 'text-amber-700', icon: 'alertCircle' },
            info: { bg: 'bg-blue-100', fg: 'text-blue-700', icon: 'info' },
        };

        const ChannelSwitch = ({ checked, disabled, onToggle }) => (
            <button
                type="button"
                role="switch"
                aria-checked={checked ? 'true' : 'false'}
                disabled={disabled}
                onClick={onToggle}
                className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#0a1f43] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
                    checked ? 'bg-[#0a1f43]' : 'bg-slate-200'
                }`}
            >
                <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                />
            </button>
        );

        return (
            <div className="space-y-6">
                <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center gap-4">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800">Event Notification Rules</h2>
                            <p className="text-sm text-slate-500 mt-1">Configure which channels are used for system alerts and critical events.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetNotificationRules}
                                disabled={notificationRules.status !== 'success' || notificationRules.resetStatus === 'submitting'}
                                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                {notificationRules.resetStatus === 'submitting' ? 'Resetting...' : 'Reset Defaults'}
                            </button>
                        </div>
                    </div>

                    <div className="p-0 overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 text-xs uppercase text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-4 w-5/12">Event Type</th>
                                    <th className="px-6 py-4 text-center w-2/12">In-App Alert</th>
                                    <th className="px-6 py-4 text-center w-2/12">Email</th>
                                    <th className="px-6 py-4 text-center w-2/12">SMS</th>
                                    <th className="px-6 py-4 text-right w-1/12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 text-sm">
                                {notificationRules.status === 'loading' ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">Loading notification rules...</td>
                                    </tr>
                                ) : notificationRules.status === 'error' ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-red-600">Failed to load notification rules.</td>
                                    </tr>
                                ) : events.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-500">No notification events available.</td>
                                    </tr>
                                ) : (
                                    events.map((evt) => {
                                        const id = String(evt.id || '');
                                        const severity = String(evt.severity || 'info');
                                        const meta = severityMeta[severity] ?? severityMeta.info;
                                        const ch = rules[id] && typeof rules[id] === 'object' ? rules[id] : { in_app: true, email: false, sms: false };
                                        const disabled = notificationRules.status !== 'success';

                                        return (
                                            <tr key={id} className="hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full ${meta.bg} ${meta.fg} flex items-center justify-center`}>
                                                            <Icon name={meta.icon} className="h-4 w-4" />
                                                        </div>
                                                        <div>
                                                            <div className="font-medium text-slate-800">{evt.name}</div>
                                                            <div className="text-xs text-slate-500">{evt.description}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ChannelSwitch
                                                        checked={Boolean(ch.in_app)}
                                                        disabled={disabled}
                                                        onToggle={() => setNotificationRule(id, 'in_app', !ch.in_app)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ChannelSwitch
                                                        checked={Boolean(ch.email)}
                                                        disabled={disabled}
                                                        onToggle={() => setNotificationRule(id, 'email', !ch.email)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <ChannelSwitch
                                                        checked={Boolean(ch.sms)}
                                                        disabled={disabled}
                                                        onToggle={() => setNotificationRule(id, 'sms', !ch.sms)}
                                                    />
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button type="button" className="text-slate-300 cursor-default" aria-hidden="true">
                                                        <Icon name="settings" className="h-5 w-5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={discardNotificationRules}
                            disabled={notificationRules.status !== 'success' || !notificationRules.dirty || notificationRules.saveStatus === 'submitting'}
                            className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Discard Changes
                        </button>
                        <button
                            type="button"
                            onClick={saveNotificationRules}
                            disabled={notificationRules.status !== 'success' || !notificationRules.dirty || notificationRules.saveStatus === 'submitting'}
                            className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {notificationRules.saveStatus === 'submitting' ? 'Saving...' : 'Save Rules'}
                        </button>
                    </div>
                </section>

                {notificationRules.saveStatus === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {notificationRules.saveError?.message || 'Failed to save notification rules.'}
                    </div>
                ) : null}
                {notificationRules.resetStatus === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {notificationRules.resetError?.message || 'Failed to reset notification rules.'}
                    </div>
                ) : null}
                {notificationRules.saveStatus === 'success' ? (
                    <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Notification rules saved.</div>
                ) : null}
            </div>
        );
    };

    const renderRetentionSettings = () => {
        const isReady = dataRetention.status === 'success';

        const clamp = (n, min, max) => Math.min(Math.max(n, min), max);
        const toYears = (days) => Math.max(1, Math.round(Number(days || 0) / 365));
        const toMonths = (days) => Math.max(6, Math.round(Number(days || 0) / 30));

        const attendanceYears = clamp(toYears(dataRetention.data.attendance_days), 1, 10);
        const auditMonths = clamp(toMonths(dataRetention.data.audit_logs_days), 6, 60);
        const docsYears = clamp(toYears(dataRetention.data.employee_documents_days), 1, 20);

        const RangeRow = ({
            title,
            description,
            valueLabel,
            minLabel,
            maxLabel,
            warn,
            input,
        }) => (
            <div className="relative">
                <div className="flex justify-between items-end mb-4">
                    <div>
                        <label className="block text-sm font-semibold text-slate-900">{title}</label>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">{description}</p>
                    </div>
                    <div className="text-right">
                        <span className="block text-2xl font-bold text-[#0a1f43] tabular-nums">{valueLabel}</span>
                        <span className="text-xs text-slate-400">Current Setting</span>
                    </div>
                </div>
                {input}
                <div className="flex justify-between text-xs font-medium text-slate-400 mt-2 px-1">
                    <span>{minLabel}</span>
                    <span>{maxLabel}</span>
                </div>
                {warn ? (
                    <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded border border-amber-100">
                        <Icon name="alertCircle" className="h-4 w-4" />
                        <span>{warn}</span>
                    </div>
                ) : null}
            </div>
        );

        return (
            <div className="space-y-6">
                <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
                        <div>
                            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                Data Retention Lifecycle
                                <Icon name="badgeCheck" className="h-4 w-4 text-slate-400" />
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">Configure automated data purging schedules for compliance.</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={resetDataRetention}
                                disabled={!isReady || dataRetention.resetStatus === 'submitting'}
                                className="px-3 py-1.5 border border-slate-300 text-slate-600 rounded text-sm hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                {dataRetention.resetStatus === 'submitting' ? 'Resetting...' : 'Reset Defaults'}
                            </button>
                        </div>
                    </div>

                    <div className="p-8 space-y-10">
                        {dataRetention.status === 'loading' ? (
                            <div className="text-sm text-slate-500">Loading retention policy...</div>
                        ) : dataRetention.status === 'error' ? (
                            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">Failed to load retention policy.</div>
                        ) : (
                            <>
                                <RangeRow
                                    title="Attendance Logs"
                                    description="Daily check-in/out records, biometric timestamps, and geofencing data."
                                    valueLabel={`${attendanceYears} Years`}
                                    minLabel="1 Year"
                                    maxLabel="10 Years"
                                    warn={attendanceYears < 5 ? 'Banking regulation requires a minimum of 5 years for auditability.' : null}
                                    input={(
                                        <input
                                            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A227]"
                                            type="range"
                                            min={1}
                                            max={10}
                                            step={1}
                                            disabled={!isReady}
                                            value={attendanceYears}
                                            onChange={(e) => updateRetentionField('attendance_days', Number(e.target.value) * 365)}
                                        />
                                    )}
                                />

                                <div className="relative pt-6 border-t border-slate-100">
                                    <RangeRow
                                        title="Audit Trails & System Logs"
                                        description="Admin actions, configuration changes, and security alerts."
                                        valueLabel={`${Math.round(auditMonths / 12)} Years`}
                                        minLabel="6 Months"
                                        maxLabel="60 Months"
                                        warn={null}
                                        input={(
                                            <input
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A227]"
                                                type="range"
                                                min={6}
                                                max={60}
                                                step={6}
                                                disabled={!isReady}
                                                value={auditMonths}
                                                onChange={(e) => updateRetentionField('audit_logs_days', Number(e.target.value) * 30)}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="relative pt-6 border-t border-slate-100">
                                    <RangeRow
                                        title="Employee Documents"
                                        description="Contracts, ID scans, and compliance forms for inactive employees."
                                        valueLabel={`${docsYears} Years`}
                                        minLabel="1 Year"
                                        maxLabel="20 Years"
                                        warn={null}
                                        input={(
                                            <input
                                                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#C9A227]"
                                                type="range"
                                                min={1}
                                                max={20}
                                                step={1}
                                                disabled={!isReady}
                                                value={docsYears}
                                                onChange={(e) => updateRetentionField('employee_documents_days', Number(e.target.value) * 365)}
                                            />
                                        )}
                                    />
                                </div>

                                <div className="pt-6 border-t border-slate-100">
                                    <Switch
                                        checked={Boolean(dataRetention.data.auto_purge_enabled)}
                                        disabled={!isReady}
                                        onChange={(v) => updateRetentionField('auto_purge_enabled', Boolean(v))}
                                        label="Enable automatic purge"
                                    />
                                </div>
                            </>
                        )}
                    </div>

                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={discardDataRetention}
                            disabled={!isReady || !dataRetention.dirty || dataRetention.saveStatus === 'submitting'}
                            className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            Discard
                        </button>
                        <button
                            type="button"
                            onClick={saveDataRetention}
                            disabled={!isReady || !dataRetention.dirty || dataRetention.saveStatus === 'submitting'}
                            className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                        >
                            {dataRetention.saveStatus === 'submitting' ? 'Saving...' : 'Save Policy'}
                        </button>
                    </div>
                </section>

                {dataRetention.saveStatus === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {dataRetention.saveError?.message || 'Failed to save retention policy.'}
                    </div>
                ) : null}
                {dataRetention.resetStatus === 'error' ? (
                    <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                        {dataRetention.resetError?.message || 'Failed to reset retention policy.'}
                    </div>
                ) : null}
                {dataRetention.saveStatus === 'success' ? (
                    <div className="rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">Retention policy saved.</div>
                ) : null}
            </div>
        );
    };

    const renderApiSettings = () => (
        <div className="space-y-6">
            {newKeyModal.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => {
                            if (newKeyModal.status === 'submitting') return;
                            setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null });
                        }}
                        aria-label="Close new key modal"
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Generate API Key</h3>
                                <p className="text-xs text-slate-500 mt-1">Copy the key now. You won’t be able to view it again.</p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => {
                                    if (newKeyModal.status === 'submitting') return;
                                    setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null });
                                }}
                                aria-label="Close"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {newKeyModal.status !== 'success' ? (
                                <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">Key Name</label>
                                    <input
                                        className="w-full text-sm border-slate-300 rounded bg-white focus:ring-[#0a1f43]"
                                        value={newKeyModal.name}
                                        onChange={(e) => setNewKeyModal((prev) => ({ ...prev, name: e.target.value }))}
                                        placeholder="e.g. Payroll System (ADP)"
                                    />
                                </div>
                            ) : null}

                            {newKeyModal.status === 'success' && newKeyModal.created?.key ? (
                                <div className="rounded border border-slate-200 bg-slate-50 p-3">
                                    <div className="text-xs font-semibold text-slate-700">API Key</div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <code className="flex-1 px-2 py-2 bg-white border border-slate-200 rounded text-xs font-mono text-slate-700 break-all">
                                            {String(newKeyModal.created.key)}
                                        </code>
                                        <button
                                            type="button"
                                            className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50"
                                            onClick={() => navigator.clipboard.writeText(String(newKeyModal.created.key))}
                                        >
                                            <Icon name="copy" className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ) : null}

                            {newKeyModal.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {newKeyModal.error?.message || 'Failed to generate key.'}
                                </div>
                            ) : null}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button
                                type="button"
                                onClick={() => setNewKeyModal({ open: false, name: '', status: 'idle', error: null, created: null })}
                                disabled={newKeyModal.status === 'submitting'}
                                className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                            >
                                Close
                            </button>
                            {newKeyModal.status !== 'success' ? (
                                <button
                                    type="button"
                                    onClick={createApiKey}
                                    disabled={newKeyModal.status === 'submitting'}
                                    className="px-3 py-2 text-sm bg-[#2563eb] text-white rounded hover:bg-[#1d4ed8] shadow-sm disabled:opacity-50"
                                >
                                    {newKeyModal.status === 'submitting' ? 'Generating...' : 'Generate'}
                                </button>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}

            {revokeModal.open ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <button
                        type="button"
                        className="absolute inset-0 bg-slate-900/40"
                        onClick={() => {
                            if (revokeModal.status === 'submitting') return;
                            setRevokeModal({ open: false, key: null, status: 'idle', error: null });
                        }}
                        aria-label="Close revoke modal"
                    />
                    <div className="relative w-full max-w-lg bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden">
                        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
                            <div>
                                <h3 className="text-base font-bold text-slate-800">Revoke API Key</h3>
                                <p className="text-xs text-slate-500 mt-1">This will immediately disable access for this integration.</p>
                            </div>
                            <button
                                type="button"
                                className="text-slate-400 hover:text-slate-600"
                                onClick={() => {
                                    if (revokeModal.status === 'submitting') return;
                                    setRevokeModal({ open: false, key: null, status: 'idle', error: null });
                                }}
                                aria-label="Close"
                            >
                                <Icon name="x" className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                                <div className="font-semibold">Key:</div>
                                <div className="mt-1 break-words">{revokeModal.key?.name || '—'}</div>
                            </div>

                            {revokeModal.status === 'error' ? (
                                <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                                    {revokeModal.error?.message || 'Failed to revoke key.'}
                                </div>
                            ) : null}
                        </div>

                        <div className="p-5 border-t border-slate-200 flex items-center justify-end gap-2 bg-white">
                            <button
                                type="button"
                                onClick={() => setRevokeModal({ open: false, key: null, status: 'idle', error: null })}
                                disabled={revokeModal.status === 'submitting'}
                                className="px-3 py-2 text-sm border border-slate-200 rounded hover:bg-slate-50 text-slate-700 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={confirmRevoke}
                                disabled={revokeModal.status === 'submitting'}
                                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 shadow-sm disabled:opacity-50"
                            >
                                {revokeModal.status === 'submitting' ? 'Revoking...' : 'Revoke'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : null}

            <section className="bg-white rounded-lg shadow-soft border border-slate-200 overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">Active API Keys</h2>
                        <p className="text-sm text-slate-500 mt-1">Manage access keys for third-party integrations.</p>
                    </div>
                    <button
                        type="button"
                        onClick={openNewKeyModal}
                        className="px-4 py-2 bg-[#2563eb] hover:bg-[#1d4ed8] text-white rounded text-sm font-medium shadow-sm transition-colors flex items-center gap-2"
                    >
                        <Icon name="add" className="h-4 w-4" />
                        Generate New API Key
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
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        Loading keys...
                                    </td>
                                </tr>
                            ) : apiKeys.status === 'error' ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-red-600">
                                        Failed to load keys.
                                    </td>
                                </tr>
                            ) : (apiKeys.data || []).length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                                        No API keys yet.
                                    </td>
                                </tr>
                            ) : (
                                (apiKeys.data || []).map((k) => {
                                    const status = String(k.status || '').toLowerCase();
                                    const isActive = status === 'active';
                                    return (
                                        <tr key={k.id} className="group hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-slate-800">{k.name}</span>
                                                    <span className="font-mono text-xs text-slate-400 mt-0.5">{String(k.prefix || '')}...</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600">{k.created_at ? new Date(k.created_at).toLocaleDateString() : '—'}</td>
                                            <td className="px-6 py-4 text-slate-600">
                                                {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span
                                                    className={`px-2 py-0.5 rounded text-xs font-medium border ${
                                                        isActive
                                                            ? 'bg-green-100 text-green-800 border-green-200'
                                                            : 'bg-slate-100 text-slate-600 border-slate-200'
                                                    }`}
                                                >
                                                    {isActive ? 'Active' : 'Revoked'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button
                                                        type="button"
                                                        className="text-slate-400 hover:text-slate-800 p-1 rounded hover:bg-slate-200"
                                                        title="Regenerate"
                                                        disabled={!isActive}
                                                        onClick={() => regenerateApiKey(k.id)}
                                                    >
                                                        <Icon name="refreshCw" className="h-5 w-5" />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="text-slate-400 hover:text-red-600 p-1 rounded hover:bg-red-50"
                                                        title="Revoke"
                                                        disabled={!isActive}
                                                        onClick={() => requestRevoke(k)}
                                                    >
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
                                    <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-slate-300 bg-slate-50 text-slate-500 text-sm">
                                        https://
                                    </span>
                                    <input
                                        className="flex-1 block w-full rounded-none rounded-r-md border-slate-300 bg-white focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3"
                                        placeholder="api.yourdomain.com/webhooks/listener"
                                        type="text"
                                        disabled={webhook.status !== 'success'}
                                        value={String(webhook.data.endpoint_url || '').replace(/^https?:\/\//i, '')}
                                        onChange={(e) => updateWebhookField('endpoint_url', e.target.value)}
                                    />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">The server endpoint that will receive POST requests.</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Secret Key (Signing)</label>
                                <div className="relative">
                                    <input
                                        className="block w-full rounded border-slate-300 bg-slate-50 text-slate-600 focus:border-[#0a1f43] focus:ring-[#0a1f43] sm:text-sm py-2 px-3 pr-10"
                                        readOnly
                                        type="text"
                                        value={String(webhook.data.secret || '')}
                                    />
                                    <button
                                        type="button"
                                        onClick={copySecret}
                                        className="absolute inset-y-0 right-0 px-3 flex items-center text-slate-400 hover:text-slate-800 transition-colors"
                                        title="Copy"
                                    >
                                        <Icon name={secretCopied ? 'checkCircle' : 'copy'} className="h-5 w-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="lg:col-span-1 bg-slate-50 rounded-lg p-4 border border-slate-200">
                            <h3 className="text-sm font-semibold text-slate-800 mb-3">Event Triggers</h3>
                            <div className="space-y-3">
                                {[
                                    { id: 'punch', label: 'Punch Events', desc: 'Clock-in, Clock-out, Breaks' },
                                    { id: 'leave', label: 'Leave Requests', desc: 'Applications, Approvals, Rejections' },
                                    { id: 'overtime', label: 'Overtime Alerts', desc: 'Threshold breaches' },
                                    { id: 'user', label: 'User Management', desc: 'New user created, Role changes' },
                                ].map((evt) => (
                                    <div key={evt.id} className="flex items-start">
                                        <div className="flex items-center h-5">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-[#0a1f43] border-slate-300 rounded focus:ring-[#0a1f43]"
                                                disabled={webhook.status !== 'success'}
                                                checked={Array.isArray(webhook.data.enabled_events) && webhook.data.enabled_events.includes(evt.id)}
                                                onChange={() => toggleWebhookEvent(evt.id)}
                                            />
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
                            <span className="text-xs text-slate-500">
                                {webhook.data.verified ? 'Test webhook verified' : 'Test webhook not verified'}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <button
                                type="button"
                                onClick={testWebhook}
                                disabled={webhook.status !== 'success' || webhook.testStatus === 'submitting'}
                                className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                {webhook.testStatus === 'submitting' ? 'Testing...' : 'Test Connection'}
                            </button>
                            <button
                                type="button"
                                onClick={saveWebhook}
                                disabled={webhook.status !== 'success' || !webhook.dirty || webhook.saveStatus === 'submitting'}
                                className="px-4 py-2 bg-[#0a1f43] hover:bg-[#0a1f43]/90 text-white rounded text-sm font-medium shadow-sm transition-colors disabled:opacity-50"
                            >
                                {webhook.saveStatus === 'submitting' ? 'Saving...' : 'Save Webhook'}
                            </button>
                            <button
                                type="button"
                                onClick={cancelWebhook}
                                disabled={webhook.status !== 'success' || !webhook.dirty || webhook.saveStatus === 'submitting'}
                                className="px-4 py-2 border border-slate-300 rounded text-slate-700 hover:bg-white text-sm font-medium transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>

                    {webhook.saveStatus === 'error' ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {webhook.saveError?.message || 'Failed to save webhook.'}
                        </div>
                    ) : null}
                    {webhook.testStatus === 'error' ? (
                        <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                            {webhook.testError?.message || 'Webhook test failed.'}
                        </div>
                    ) : null}
                </div>
            </section>
        </div>
    );

    const renderContent = () => {
        switch (activeTab) {
            case 'security':
                return renderSecuritySettings();
            case 'head_office':
                return renderHeadOfficeGeoSettings();
            case 'notifications':
                return renderNotificationSettings();
            case 'integrations':
                return renderApiSettings();
            case 'shifts':
                return renderShiftSettings();
            case 'retention':
                return renderRetentionSettings();
            default:
                return (
                    <div className="text-center p-8 text-slate-500">
                        This section is coming soon.
                    </div>
                );
        }
    };

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:w-64 shrink-0">
                <div className="bg-white rounded-lg border border-slate-200 shadow-soft p-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Settings</h2>
                    <nav className="space-y-1 mt-3">
                        {settingTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 font-medium rounded-lg transition-all border-l-4 text-sm ${
                                        isActive
                                            ? 'bg-white text-[#0a1f43] shadow-sm border-[#C9A227]'
                                            : 'text-slate-600 border-transparent hover:bg-slate-50 hover:text-slate-900'
                                    }`}
                                >
                                    <Icon name={tab.icon} className="h-4 w-4" />
                                    <span className="ml-3">{tab.label}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-100">
                    <div className="flex items-start gap-3">
                        <Icon name="info" className="h-5 w-5 text-blue-600" />
                        <div>
                            <h4 className="text-sm font-semibold text-blue-800">{infoPanel.title}</h4>
                            <p className="text-xs text-blue-600 mt-1">{infoPanel.body}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-auto">
                <div className="bg-white rounded-lg border border-slate-200 shadow-soft min-h-full">
                    <div className="p-6 border-b border-slate-200">
                        <h2 className="text-lg font-bold text-slate-800">
                            {settingTabs.find((t) => t.id === activeTab)?.label}
                        </h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage your {settingTabs.find((t) => t.id === activeTab)?.label.toLowerCase()} preferences
                        </p>
                    </div>
                    <div className="p-6">{renderContent()}</div>
                </div>
            </div>
        </div>
    );
}
