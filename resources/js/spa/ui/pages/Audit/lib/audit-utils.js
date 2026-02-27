export function getEventDescription(action) {
    const descriptions = {
        'auth.login': 'User successfully logged into the system',
        'auth.logout': 'User logged out of the system',
        'auth.failed': 'Failed login attempt detected',
        'device.bound': 'New device registered and bound to user',
        'device.rejected': 'Unregistered device login attempt blocked',
        'employee.created': 'New employee record created in system',
        'employee.updated': 'Employee information modified',
        'branch.created': 'New branch added to network',
        'branch.updated': 'Branch details updated',
    };

    return descriptions[action] || 'System event recorded';
}

export function auditSeverity(log) {
    const action = String(log?.action ?? '').toLowerCase();
    if (action.includes('failed') || action.includes('rejected') || action.includes('breach')) {
        return { label: 'Critical', bg: 'bg-red-100 text-red-800', dot: 'bg-red-500', row: 'bg-red-50/50 border-l-red-500' };
    }
    if (action.includes('override') || action.includes('updated') || action.includes('modified')) {
        return { label: 'Medium', bg: 'bg-amber-100 text-amber-800', dot: 'bg-amber-500', row: '' };
    }
    if (action.includes('export') || action.includes('backup')) {
        return { label: 'Info', bg: 'bg-blue-100 text-blue-800', dot: 'bg-accent-gold', row: '' };
    }
    return { label: 'Low', bg: 'bg-green-100 text-green-800', dot: 'bg-slate-300', row: '' };
}
