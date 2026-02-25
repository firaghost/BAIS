import React, { useEffect, useState } from 'react';

import { Panel } from '../components/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function CorrectionsPage() {
    const [corrections, setCorrections] = useState(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/attendance/corrections?per_page=20');

            if (!active) {
                return;
            }

            setCorrections(res.ok ? res.data : res);
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Attendance Corrections (sample)" right="GET /api/attendance/corrections?per_page=20">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(corrections, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
