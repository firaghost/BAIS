import React, { useEffect, useState } from 'react';

import { Panel } from '../components/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function ShiftSchedulesPage() {
    const [schedules, setSchedules] = useState(null);

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/payroll/shift-schedules?per_page=20');

            if (!active) {
                return;
            }

            setSchedules(res.ok ? res.data : res);
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Shift Schedules (sample)" right="GET /api/payroll/shift-schedules?per_page=20">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(schedules, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
