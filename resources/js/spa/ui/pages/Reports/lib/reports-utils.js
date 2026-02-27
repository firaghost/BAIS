export function sanitizeFilename(name) {
    const cleaned = String(name ?? '').trim().replace(/[^a-zA-Z0-9._-]+/g, '-');
    return cleaned.replace(/^-+|-+$/g, '') || 'report';
}

export function getFilenameFromContentDisposition(contentDisposition) {
    const value = String(contentDisposition ?? '');
    if (!value) return null;

    const encodedMatch = value.match(/filename\*=(?:UTF-8'')?([^;]+)/i);
    if (encodedMatch?.[1]) {
        try {
            return decodeURIComponent(encodedMatch[1].trim().replace(/^"|"$/g, ''));
        } catch {
            return encodedMatch[1].trim().replace(/^"|"$/g, '');
        }
    }

    const plainMatch = value.match(/filename=([^;]+)/i);
    if (plainMatch?.[1]) {
        return plainMatch[1].trim().replace(/^"|"$/g, '');
    }

    return null;
}

export function toLocalDateInputValue(date) {
    const d = date instanceof Date ? date : new Date(date);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function payrollMonthRangeOptionA(now) {
    const d = now instanceof Date ? now : new Date(now);
    const year = d.getFullYear();
    const month = d.getMonth();
    const day = d.getDate();

    const end = day >= 24 ? new Date(year, month, 24) : new Date(year, month - 1, 24);
    const start = new Date(end.getFullYear(), end.getMonth() - 1, 25);

    return {
        from: toLocalDateInputValue(start),
        to: toLocalDateInputValue(end),
    };
}
