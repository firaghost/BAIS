import React, { useEffect, useState } from 'react';

import { Panel } from '../shared/ui/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function PayrollPage() {
    const [records, setRecords] = useState(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/payroll/records?per_page=10');

            if (!active) {
                return;
            }

            setRecords(res.ok ? res.data : res);
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Payroll Records (sample)" right="GET /api/payroll/records?per_page=10">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(records, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
