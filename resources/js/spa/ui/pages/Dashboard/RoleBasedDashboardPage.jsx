import React, { useMemo } from 'react';

import { useMe } from '../../lib/useMe.js';
import { SuperAdminDashboardPage } from '../RoleDashboards/SuperAdminDashboardPage.jsx';
import { HrAdminDashboardPage } from '../RoleDashboards/HrAdminDashboardPage.jsx';
import { BranchManagerDashboardPage } from '../RoleDashboards/BranchManagerDashboardPage.jsx';
import { PayrollOfficerDashboardPage } from '../RoleDashboards/PayrollOfficerDashboardPage.jsx';
import { ExecutiveViewerDashboardPage } from '../RoleDashboards/ExecutiveViewerDashboardPage.jsx';
import { EmployeeDashboardPage } from '../RoleDashboards/EmployeeDashboardPage.jsx';

function pickDashboard(roles) {
    if (!Array.isArray(roles)) {
        return 'employee';
    }

    if (roles.includes('super-admin')) {
        return 'super-admin';
    }

    if (roles.includes('hr-admin')) {
        return 'hr-admin';
    }

    if (roles.includes('branch-manager')) {
        return 'branch-manager';
    }

    if (roles.includes('payroll-officer')) {
        return 'payroll-officer';
    }

    if (roles.includes('executive-viewer')) {
        return 'executive-viewer';
    }

    return 'employee';
}

export function RoleBasedDashboardPage() {
    const { status, roles } = useMe();

    const variant = useMemo(() => pickDashboard(roles), [roles]);

    if (status === 'loading' || status === 'idle') {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)]">
                Loading…
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_2px_4px_-1px_rgba(0,0,0,0.03)]">
                Failed to load your profile.
            </div>
        );
    }

    if (variant === 'super-admin') {
        return <SuperAdminDashboardPage />;
    }

    if (variant === 'hr-admin') {
        return <HrAdminDashboardPage />;
    }

    if (variant === 'branch-manager') {
        return <BranchManagerDashboardPage />;
    }

    if (variant === 'payroll-officer') {
        return <PayrollOfficerDashboardPage />;
    }

    if (variant === 'executive-viewer') {
        return <ExecutiveViewerDashboardPage />;
    }

    return <EmployeeDashboardPage />;
}
