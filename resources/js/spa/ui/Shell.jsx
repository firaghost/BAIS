import React, { useEffect, useMemo, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';

import { useMe } from './lib/useMe.js';
import { safeGet } from './lib/api.js';
import { useBranchScope } from './lib/useBranchScope.js';
import { Icon } from './shared/Icon.jsx';

const systemAdminNav = [
    { to: '/super-admin/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/super-admin/branches', label: 'Branches', icon: 'branches' },
    { to: '/super-admin/employees', label: 'Employees', icon: 'users' },
    { to: '/super-admin/system-users', label: 'System Users', icon: 'userPlus' },
    { to: '/super-admin/audit', label: 'Audit Logs', icon: 'wrench' },
    { to: '/super-admin/reports', label: 'Reports', icon: 'analytics' },
    { to: '/super-admin/settings', label: 'Settings', icon: 'settings' },
];

const hrAdminNav = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/attendance', label: 'Attendance', icon: 'schedule' },
    { to: '/employees', label: 'Employees', icon: 'users' },
    { to: '/leaves', label: 'Leave Requests', icon: 'event', badgeKey: 'pending_leave_requests' },
    { to: '/corrections', label: 'Corrections', icon: 'edit_note' },
    { to: '/reports', label: 'Reports', icon: 'analytics' },
    { to: '/settings', label: 'Policy Config', icon: 'settings' },
];

const defaultNav = [
    { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
    { to: '/attendance', label: 'Attendance', icon: 'schedule' },
    { to: '/leaves', label: 'Leaves', icon: 'event' },
    { to: '/payroll', label: 'Payroll', icon: 'payments' },
    { to: '/audit', label: 'Audit Logs', icon: 'wrench' },
    { to: '/corrections', label: 'Corrections', icon: 'edit_note' },
    { to: '/shift-schedules', label: 'Shift Schedules', icon: 'work_history' },
];

function isSystemAdmin(roles) {
    return Array.isArray(roles) && roles.includes('super-admin');
}

function isHrAdmin(roles) {
    return Array.isArray(roles) && roles.includes('hr-admin');
}

function useAutoCollapse() {
    const [shouldCollapse, setShouldCollapse] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(max-width: 1024px)');

        const onChange = () => {
            setShouldCollapse(mq.matches);
        };

        onChange();
        mq.addEventListener('change', onChange);

        return () => {
            mq.removeEventListener('change', onChange);
        };
    }, []);

    return shouldCollapse;
}

export function Shell() {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, roles } = useMe();
    const { branchId, setBranchId } = useBranchScope();
    const [branches, setBranches] = useState([]);
    const [navMeta, setNavMeta] = useState({});

    const nav = useMemo(() => {
        if (isSystemAdmin(roles)) {
            return systemAdminNav;
        }

        if (isHrAdmin(roles)) {
            return hrAdminNav;
        }

        return defaultNav;
    }, [roles]);
    const autoCollapse = useAutoCollapse();
    const [collapsed, setCollapsed] = useState(false);

    useEffect(() => {
        if (autoCollapse) {
            setCollapsed(true);
        }
    }, [autoCollapse]);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/branches');

            if (!active) {
                return;
            }

            const list = res.ok && Array.isArray(res.data?.data) ? res.data.data : [];
            setBranches(list);
        })();

        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        let active = true;

        if (!isHrAdmin(roles)) {
            setNavMeta({});
            return () => {
                active = false;
            };
        }

        const fetchNavMeta = async () => {
            const res = await safeGet('/api/hr-admin/dashboard/nav-meta');

            if (!active) {
                return;
            }

            if (!res.ok) {
                setNavMeta({});
                return;
            }

            setNavMeta(res.data ?? {});
        };

        fetchNavMeta();

        const onRefresh = () => {
            fetchNavMeta();
        };

        window.addEventListener('bais:navMetaRefresh', onRefresh);

        return () => {
            active = false;
            window.removeEventListener('bais:navMetaRefresh', onRefresh);
        };
    }, [roles]);

    const title = useMemo(() => {
        const item = nav.find((n) => n.to === location.pathname);
        return item?.label ?? 'BAIS';
    }, [location.pathname]);

    return (
        <div className="flex min-h-screen bg-slate-50 text-slate-900">
            <aside
                className={[
                    'sticky top-0 h-screen flex-shrink-0 overflow-hidden bg-[#0a1f43] text-white transition-all duration-300',
                    collapsed ? 'w-20' : 'w-64',
                ].join(' ')}
            >
                <div className="flex h-full flex-col">
                    <div className="flex h-16 items-center justify-center border-b border-white/10 px-4">
                        <div className="flex w-full items-center justify-center gap-3">
                            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-[#C9A227] text-lg font-bold text-[#0a1f43]">
                                A
                            </div>
                            {collapsed ? null : <div className="text-lg font-bold tracking-wide">AdminConsole</div>}
                        </div>
                    </div>

                    <div className="flex-1 px-3 py-6">
                        <nav className="space-y-2">
                            {nav.map((item) => (
                                <NavLink
                                    key={item.to}
                                    to={item.to}
                                    className={({ isActive }) =>
                                        [
                                            'group relative flex items-center rounded-lg p-3 transition-colors',
                                            collapsed ? 'justify-center' : 'justify-start',
                                            isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white',
                                        ].join(' ')
                                    }
                                >
                                    <Icon name={item.icon} className="h-5 w-5" />
                                    {collapsed ? null : <span className="ml-3 font-medium">{item.label}</span>}

                                    {!collapsed && item.badgeKey ? (
                                        <span className="ml-auto rounded-full bg-red-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                            {Number(navMeta?.[item.badgeKey] ?? 0)}
                                        </span>
                                    ) : null}

                                    {collapsed ? (
                                        <span className="pointer-events-none absolute left-16 z-50 hidden rounded bg-slate-800 px-2 py-1 text-xs opacity-0 transition-opacity md:block group-hover:opacity-100">
                                            {item.label}
                                        </span>
                                    ) : null}
                                </NavLink>
                            ))}
                        </nav>
                    </div>

                    <div className="border-t border-white/10 p-4">
                        <div className={["flex items-center gap-3", collapsed ? 'justify-center' : 'justify-start'].join(' ')}>
                            <div className="h-10 w-10 flex-shrink-0 rounded-full border-2 border-[#C9A227] bg-white/10" />
                            {collapsed ? null : (
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{user?.name ?? '—'}</span>
                                    <span className="text-xs text-slate-300">
                                        {isSystemAdmin(roles) ? 'Super Admin' : roles?.[0] ?? 'User'}
                                    </span>
                                </div>
                            )}
                        </div>

                        <button
                            type="button"
                            className={[
                                'mt-4 flex w-full items-center rounded-lg px-3 py-2 text-slate-300 transition-colors hover:text-white',
                                collapsed ? 'justify-center hover:bg-white/5' : 'justify-start hover:bg-white/5',
                            ].join(' ')}
                            onClick={() => {
                                try {
                                    localStorage.removeItem('bais_token');
                                } catch {
                                    // ignore
                                }

                                navigate('/login', { replace: true });
                            }}
                        >
                            <Icon name="logout" className="h-4 w-4" />
                            {collapsed ? null : <span className="ml-2 text-sm">Logout</span>}
                        </button>
                    </div>
                </div>
            </aside>

            <div className="flex min-h-screen flex-1 flex-col overflow-hidden">
                <header className="z-10 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <button
                            type="button"
                            className="rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                            onClick={() => setCollapsed((v) => !v)}
                            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        >
                            <Icon name="menu" className="h-5 w-5" />
                        </button>

                        <h1 className="hidden text-xl font-bold text-[#0a1f43] sm:block">{title}</h1>

                        <div className="relative hidden md:block">
                            <label className="sr-only" htmlFor="branch-scope">
                                Branch scope
                            </label>
                            <select
                                id="branch-scope"
                                className="rounded bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-200"
                                value={branchId ?? 0}
                                onChange={(e) => {
                                    const n = parseInt(e.target.value, 10);
                                    setBranchId(Number.isFinite(n) && n > 0 ? n : null);
                                }}
                            >
                                <option value={0}>Global View (All Branches)</option>
                                {branches.map((b) => (
                                    <option key={b.id} value={b.id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 md:flex">
                            <div className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
                            <span className="text-xs font-medium text-green-700">System Operational</span>
                        </div>

                        <div className="mx-2 hidden h-6 w-px bg-slate-200 md:block" />

                        <button
                            type="button"
                            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                            aria-label="Search"
                        >
                            <Icon name="search" className="h-5 w-5" />
                        </button>

                        <button
                            type="button"
                            className="relative rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100"
                            aria-label="Notifications"
                        >
                            <Icon name="bell" className="h-5 w-5" />
                            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-red-500" />
                        </button>

                        <span className="rounded-full bg-[#0a1f43] px-3 py-1 text-xs font-bold uppercase tracking-wider text-white">
                            {isSystemAdmin(roles) ? 'Super Admin' : 'User'}
                        </span>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto bg-[#f6f7f8] p-6">
                    <div className="mx-auto w-full max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
