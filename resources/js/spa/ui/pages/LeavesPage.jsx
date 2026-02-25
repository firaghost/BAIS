import React, { useEffect, useState } from 'react';

import { Panel } from '../components/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function LeavesPage() {
    const [requests, setRequests] = useState(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/leaves/requests');

            if (!active) {
                return;
            }

            setRequests(res.ok ? res.data : res);
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Leave Requests (sample)" right="GET /api/leaves/requests">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(requests, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
