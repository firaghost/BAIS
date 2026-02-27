import React, { useEffect, useMemo, useState } from 'react';
import { safeGet } from '../../lib/api.js';
import { Icon } from '../../shared/Icon.jsx';
import { AuditDetailSidepanel } from './components/AuditDetailSidepanel.jsx';
import { AuditFilters } from './components/AuditFilters.jsx';
import { AuditTable } from './components/AuditTable.jsx';

export function AuditPage() {
    const [state, setState] = useState({ status: 'loading', data: null, error: null });
    const [search, setSearch] = useState('');
    const [eventType, setEventType] = useState('');
    const [category, setCategory] = useState('all');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [page, setPage] = useState(1);
    const [perPage, setPerPage] = useState(25);
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailLog, setDetailLog] = useState(null);

    const closeDetail = () => {
        setDetailOpen(false);
        setDetailLog(null);
    };

    const openDetail = (log) => {
        setDetailLog(log);
        setDetailOpen(true);
    };

    const copyText = async (text) => {
        try {
            await navigator.clipboard.writeText(String(text ?? ''));
        } catch {
            // ignore
        }
    };

    const clearFilters = () => {
        setSearch('');
        setEventType('');
        setCategory('all');
        setDateFrom('');
        setDateTo('');
        setPerPage(25);
        setPage(1);
    };

    useEffect(() => {
        let active = true;
        setState({ status: 'loading', data: null, error: null });

        (async () => {
            const params = new URLSearchParams();
            params.set('page', String(page));
            params.set('per_page', String(perPage));
            if (search.trim()) params.set('search', search.trim());
            if (eventType) params.set('action', eventType);
            if (category) params.set('category', category);
            if (dateFrom) params.set('from', dateFrom);
            if (dateTo) params.set('to', dateTo);

            const res = await safeGet(`/api/audit/logs?${params.toString()}`);

            if (!active) return;

            if (!res.ok) {
                setState({ status: 'error', data: null, error: res.error });
                return;
            }

            setState({ status: 'success', data: res.data, error: null });
        })();

        return () => {
            active = false;
        };
    }, [search, eventType, category, dateFrom, dateTo, page, perPage]);

    const logs = useMemo(() => state.data?.data ?? [], [state.data]);
    const meta = useMemo(() => {
        const d = state.data;
        return {
            current_page: Number(d?.current_page ?? 1),
            last_page: Number(d?.last_page ?? 1),
            per_page: Number(d?.per_page ?? perPage),
            total: Number(d?.total ?? 0),
            from: Number(d?.from ?? 0),
            to: Number(d?.to ?? 0),
        };
    }, [state.data, perPage]);

    const rangeLabel = useMemo(() => {
        const from = dateFrom ? `${dateFrom} 00:00` : '—';
        const to = dateTo ? `${dateTo} 23:59` : '—';
        return `${from} - ${to}`;
    }, [dateFrom, dateTo]);

    const showingLabel = useMemo(() => {
        if (!meta.total) {
            return 'Displaying records 0-0 of 0 total events';
        }

        const from = meta.from > 0 ? meta.from : (meta.current_page - 1) * meta.per_page + 1;
        const to = meta.to > 0 ? meta.to : Math.min(meta.current_page * meta.per_page, meta.total);
        return `Displaying records ${from}-${to} of ${meta.total} total events`;
    }, [meta]);

    const handleExport = () => {
        const payload = {
            exported_at: new Date().toISOString(),
            logs: logs,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'audit-logs-export.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-6 h-full flex flex-col">
            <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Icon name="history" className="h-7 w-7 text-[#C9A227]" />
                        Audit Logs Timeline
                    </h2>
                    <p className="text-slate-500 text-sm mt-1 max-w-2xl">
                        Immutable record of all system actions, policy changes, and access events.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <Icon name="badgeCheck" className="h-4 w-4" />
                        Verify Log Integrity
                    </button>
                    <button
                        type="button"
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-[#0a1f43] text-white rounded-lg text-sm font-medium hover:bg-[#0a1f43]/90 transition-colors shadow-md shadow-[#0a1f43]/20"
                    >
                        <Icon name="download" className="h-4 w-4" />
                        Export Encrypted Ledger
                    </button>
                </div>
            </div>

            <AuditFilters
                search={search}
                setSearch={setSearch}
                eventType={eventType}
                setEventType={setEventType}
                dateFrom={dateFrom}
                setDateFrom={setDateFrom}
                dateTo={dateTo}
                setDateTo={setDateTo}
                category={category}
                setCategory={setCategory}
                rangeLabel={rangeLabel}
                clearFilters={clearFilters}
                setPage={setPage}
            />

            <AuditTable
                state={state}
                logs={logs}
                openDetail={openDetail}
                showingLabel={showingLabel}
                perPage={perPage}
                setPerPage={setPerPage}
                page={page}
                setPage={setPage}
                meta={meta}
            />

            <AuditDetailSidepanel
                detailOpen={detailOpen}
                closeDetail={closeDetail}
                detailLog={detailLog}
                copyText={copyText}
            />
        </div>
    );
}
