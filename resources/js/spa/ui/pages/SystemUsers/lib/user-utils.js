export function normalizeRoles(list) {
    if (!Array.isArray(list)) return [];
    return list
        .filter((r) => r && typeof r === 'object')
        .map((r) => ({
            id: Number(r.id) || 0,
            name: String(r.name ?? ''),
            slug: String(r.slug ?? ''),
        }))
        .filter((r) => r.id > 0);
}

export function statusUi(status) {
    const s = String(status || '');
    if (s === 'inactive') {
        return { label: 'Inactive', className: 'text-slate-400', dotClassName: 'bg-slate-400' };
    }
    if (s === 'pending') {
        return { label: 'Pending', className: 'text-amber-600', dotClassName: 'bg-amber-600' };
    }
    return { label: 'Active', className: 'text-green-600', dotClassName: 'bg-green-600' };
}

export function initials(name) {
    const parts = String(name || '')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
    const first = parts[0]?.[0] ?? 'U';
    const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
    return `${first}${last}`.toUpperCase();
}

export function rolePill(slug) {
    const s = String(slug || '');
    if (s === 'super-admin') return 'bg-[#0a1f43]/10 text-[#0a1f43]';
    if (s === 'hr-admin') return 'bg-blue-100 text-blue-800';
    if (s === 'branch-manager') return 'bg-amber-100 text-amber-800';
    if (s === 'payroll-officer') return 'bg-green-100 text-green-800';
    if (s === 'executive-viewer') return 'bg-slate-100 text-slate-700';
    return 'bg-slate-100 text-slate-700';
}
