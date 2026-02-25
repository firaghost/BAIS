import React, { useEffect, useState } from 'react';

import { Panel } from '../components/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function AttendancePage() {
    const [manage, setManage] = useState(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/attendance/manage?per_page=10');

            if (!active) {
                return;
            }

            setManage(res.ok ? res.data : res);
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Attendance Management (sample)" right="GET /api/attendance/manage?per_page=10">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(manage, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
