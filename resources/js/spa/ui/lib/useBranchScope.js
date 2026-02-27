import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'bais_branch_scope';

function readValue() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw === null || raw === '' || raw === 'all') {
            return null;
        }

        const n = parseInt(raw, 10);
        return Number.isFinite(n) && n > 0 ? n : null;
    } catch {
        return null;
    }
}

export function useBranchScope() {
    const [branchId, setBranchIdState] = useState(null);

    useEffect(() => {
        setBranchIdState(readValue());
    }, []);

    const setBranchId = useCallback((next) => {
        const normalized = Number.isFinite(next) && next > 0 ? next : null;
        setBranchIdState(normalized);

        try {
            if (normalized === null) {
                localStorage.setItem(STORAGE_KEY, 'all');
                return;
            }

            localStorage.setItem(STORAGE_KEY, String(normalized));
        } catch {
            // ignore
        }
    }, []);

    return { branchId, setBranchId };
}
