import React, { useMemo } from 'react';

import { useMe } from '../../lib/useMe.js';
import { HrAdminAttendancePage } from '../RoleAttendances/HrAdminAttendancePage.jsx';
import { AttendancePage as DefaultAttendancePage } from '../AttendancePage.jsx';

function pickAttendanceVariant(roles) {
    if (!Array.isArray(roles)) {
        return 'default';
    }

    if (roles.includes('hr-admin')) {
        return 'hr-admin';
    }

    return 'default';
}

export function RoleBasedAttendancePage() {
    const { status, roles } = useMe();

    const variant = useMemo(() => pickAttendanceVariant(roles), [roles]);

    if (status === 'loading' || status === 'idle') {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
                Loading…
            </div>
        );
    }

    if (status === 'error') {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.1),0_1px_2px_0_rgba(0,0,0,0.06)]">
                Failed to load your profile.
            </div>
        );
    }

    if (variant === 'hr-admin') {
        return <HrAdminAttendancePage />;
    }

    return <DefaultAttendancePage />;
}
