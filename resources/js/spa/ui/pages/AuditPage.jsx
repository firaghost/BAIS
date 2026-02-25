import React, { useEffect, useState } from 'react';

import { Panel } from '../components/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function AuditPage() {
    const [logs, setLogs] = useState(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/audit/logs?per_page=20');

            if (!active) {
                return;
            }

            setLogs(res.ok ? res.data : res);
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Audit Logs (sample)" right="GET /api/audit/logs?per_page=20">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(logs, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
