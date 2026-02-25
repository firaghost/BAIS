import React from 'react';

export function Panel({ title, children, right }) {
    return (
        <section className="rounded-lg border bg-white">
            <div className="flex items-center justify-between border-b px-4 py-3">
                <h2 className="text-sm font-semibold">{title}</h2>
                {right ? <div className="text-xs text-slate-500">{right}</div> : null}
            </div>
            <div className="p-4">{children}</div>
        </section>
    );
}
