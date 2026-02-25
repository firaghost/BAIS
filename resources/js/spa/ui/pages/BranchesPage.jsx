import React, { useEffect, useState } from 'react';

import { Panel } from '../components/Panel.jsx';
import { safeGet } from '../lib/api.js';

export function BranchesPage() {
    const [state, setState] = useState({ status: 'loading', data: null });

    useEffect(() => {
        let active = true;

        (async () => {
            const res = await safeGet('/api/branches');

            if (!active) {
                return;
            }

            if (!res.ok) {
                setState({ status: 'error', data: res.error });
                return;
            }

            setState({ status: 'success', data: res.data });
        })();

        return () => {
            active = false;
        };
    }, []);

    return (
        <div className="space-y-4">
            <Panel title="Branches" right="GET /api/branches">
                <pre className="overflow-auto rounded bg-slate-950 p-3 text-xs text-slate-100">
                    {JSON.stringify(state, null, 2)}
                </pre>
            </Panel>
        </div>
    );
}
