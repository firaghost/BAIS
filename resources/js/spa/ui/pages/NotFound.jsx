import React from 'react';
import { Link } from 'react-router-dom';

import { Panel } from '../components/Panel.jsx';

export function NotFound() {
    return (
        <div className="mx-auto max-w-3xl px-4 py-10">
            <Panel title="Not found" subtitle="The page you requested does not exist.">
                <Link className="text-sm font-semibold text-slate-900 underline" to="/dashboard">
                    Go back to dashboard
                </Link>
            </Panel>
        </div>
    );
}
