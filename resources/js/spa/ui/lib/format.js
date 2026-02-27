export function formatModelType(modelType) {
    if (!modelType || typeof modelType !== 'string') {
        return '—';
    }

    const parts = modelType.split('\\');
    return parts[parts.length - 1] || modelType;
}

export function formatIso(iso) {
    if (!iso) {
        return '—';
    }

    try {
        const dt = new Date(iso);
        if (Number.isNaN(dt.getTime())) {
            return String(iso);
        }

        return dt.toLocaleString();
    } catch {
        return String(iso);
    }
}
