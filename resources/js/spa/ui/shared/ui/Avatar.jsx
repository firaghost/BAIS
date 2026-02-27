import React from 'react';

export function Avatar({ src, initials, size = 'md' }) {
    const sizeClass = size === 'sm' ? 'w-6 h-6 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-10 h-10 text-sm';

    if (src) {
        return <img src={src} alt="" className={`${sizeClass} rounded-full object-cover`} />;
    }

    return (
        <div className={`${sizeClass} rounded-full bg-slate-200 flex items-center justify-center font-medium text-slate-700`}>
            {initials}
        </div>
    );
}
