import React from 'react';
import { Icon } from '../../../shared/Icon.jsx';

export function StepProgressNav({ steps, currentStepId, onStepClick }) {
    return (
        <nav className="space-y-1">
            {steps.map((s) => {
                const isActive = s.id === currentStepId;
                const isDone = steps.findIndex((x) => x.id === currentStepId) > steps.findIndex((x) => x.id === s.id);
                const isLocked = !isDone && !isActive && steps.findIndex((x) => x.id === s.id) > steps.findIndex((x) => x.id === currentStepId);

                return (
                    <button
                        key={s.id}
                        type="button"
                        disabled={isLocked}
                        onClick={() => {
                            if (!isLocked) onStepClick(s.id);
                        }}
                        className={[
                            'w-full flex items-center px-4 py-3 font-semibold rounded-xl transition-all text-left',
                            isActive
                                ? 'bg-white text-[#0a1f43] shadow-md border-l-4 border-[#C9A227] transform scale-[1.02]'
                                : isLocked
                                    ? 'text-slate-400 cursor-not-allowed opacity-60'
                                    : 'text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-sm',
                        ].join(' ')}
                    >
                        <div
                            className={[
                                'w-7 h-7 rounded-full flex items-center justify-center mr-3 text-xs font-black shadow-inner',
                                isDone
                                    ? 'bg-green-500 text-white shadow-green-600/50'
                                    : isActive
                                        ? 'bg-[#C9A227] text-[#0a1f43] shadow-[#C9A227]/50'
                                        : 'bg-slate-200 text-slate-500',
                            ].join(' ')}
                        >
                            {isDone ? <Icon name="check" className="h-4 w-4" strokeWidth={3} /> : s.number}
                        </div>
                        {s.label}
                    </button>
                );
            })}
        </nav>
    );
}
