import React, { useEffect, useMemo, useState } from 'react';
import { Icon } from '../../shared/Icon.jsx';
import { useMe } from '../../lib/useMe.js';
import { SecurityTab } from './tabs/SecurityTab.jsx';
import { HeadOfficeTab } from './tabs/HeadOfficeTab.jsx';
import { IntegrationsTab } from './tabs/IntegrationsTab.jsx';
import { ShiftTemplatesTab } from './tabs/ShiftTemplatesTab.jsx';
import { NotificationsTab } from './tabs/NotificationsTab.jsx';
import { DataRetentionTab } from './tabs/DataRetentionTab.jsx';
import { HolidaysTab } from './tabs/HolidaysTab.jsx';

const TABS = [
    { id: 'security', label: 'Security Policies', icon: 'shield' },
    { id: 'head_office', label: 'Head Office Geo-Fence', icon: 'mapPin' },
    { id: 'integrations', label: 'API Integrations', icon: 'globe' },
    { id: 'shifts', label: 'Shift Templates', icon: 'schedule' },
    { id: 'holidays', label: 'Holidays', icon: 'calendar' },
    { id: 'notifications', label: 'Notification Rules', icon: 'bell' },
    { id: 'retention', label: 'Data Retention', icon: 'fileText' },
];

const INFO_PANEL = {
    head_office: { title: 'Geo-Fence Enforcement', body: 'Employees outside this radius will be blocked from attendance check-in/out.' },
    integrations: { title: 'API Documentation', body: 'Review the latest v2.1 developer documentation before generating new keys.' },
    shifts: { title: 'Template Logic', body: 'Changes to global templates will apply across the organization unless overridden locally.' },
    holidays: { title: 'Holiday Enforcement', body: 'Attendance is automatically disabled on Sundays and on active holidays. Keep dates accurate each year.' },
    retention: { title: 'Configuration Note', body: 'Retention rules update immediately. Deleting historical data is irreversible.' },
    default: { title: 'Configuration Note', body: 'Changes to global security settings may force re-authentication for all active sessions.' },
};

function renderTabContent(tabId) {
    switch (tabId) {
        case 'security': return <SecurityTab />;
        case 'head_office': return <HeadOfficeTab />;
        case 'integrations': return <IntegrationsTab />;
        case 'shifts': return <ShiftTemplatesTab />;
        case 'holidays': return <HolidaysTab />;
        case 'notifications': return <NotificationsTab />;
        case 'retention': return <DataRetentionTab />;
        default: return <div className="text-center p-8 text-slate-500">This section is coming soon.</div>;
    }
}

export function SettingsPage() {
    const { permissions, roles, status } = useMe();
    const isSuperAdmin = useMemo(() => Array.isArray(roles) && roles.includes('super-admin'), [roles]);
    const can = useMemo(() => {
        if (isSuperAdmin) {
            return () => true;
        }

        const set = new Set(Array.isArray(permissions) ? permissions : []);
        return (slug) => set.has(slug);
    }, [isSuperAdmin, permissions]);

    const allowedTabs = useMemo(() => {
        const needs = {
            security: 'settings.manage',
            head_office: 'settings.manage',
            integrations: 'settings.manage',
            shifts: 'settings.manage',
            notifications: 'settings.manage',
            retention: 'settings.manage',
            holidays: 'holidays.manage',
        };

        return TABS.filter((t) => {
            const required = needs[t.id];
            return required ? can(required) : true;
        });
    }, [can]);

    const [activeTab, setActiveTab] = useState(() => allowedTabs[0]?.id ?? '');

    useEffect(() => {
        if (allowedTabs.length === 0) {
            setActiveTab('');
            return;
        }

        setActiveTab((prev) => {
            if (allowedTabs.some((t) => t.id === prev)) {
                return prev;
            }

            return allowedTabs[0].id;
        });
    }, [allowedTabs]);

    const infoPanel = useMemo(() => INFO_PANEL[activeTab] ?? INFO_PANEL.default, [activeTab]);
    const activeTabLabel = allowedTabs.find((t) => t.id === activeTab)?.label ?? '';

    return (
        <div className="h-full flex flex-col lg:flex-row gap-6">
            {/* Sidebar Navigation */}
            <div className="lg:w-64 shrink-0">
                <div className="bg-white rounded-lg border border-slate-200 shadow-soft p-4">
                    <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Settings</h2>
                    <nav className="space-y-1 mt-3">
                        {allowedTabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`w-full flex items-center px-4 py-3 font-medium rounded-lg transition-all border-l-4 text-sm ${isActive
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
                        <h2 className="text-lg font-bold text-slate-800">{activeTabLabel}</h2>
                        <p className="text-xs text-slate-500 mt-0.5">
                            Manage your {activeTabLabel.toLowerCase()} preferences
                        </p>
                    </div>
                    <div className="p-6">
                        {status === 'loading' ? (
                            <div className="text-sm text-slate-500">Loading settings...</div>
                        ) : allowedTabs.length === 0 ? (
                            <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                                You do not have permission to view system settings.
                            </div>
                        ) : (
                            renderTabContent(activeTab)
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
