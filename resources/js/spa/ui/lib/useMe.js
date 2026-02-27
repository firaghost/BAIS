import { useEffect, useMemo, useState } from 'react';

import { safeGet } from './api.js';

export function useMe() {
    const [state, setState] = useState({ status: 'idle', data: null });

    useEffect(() => {
        let active = true;
        setState({ status: 'loading', data: null });

        (async () => {
            const res = await safeGet('/api/auth/me');

            if (!active) {
                return;
            }

            if (!res.ok) {
                setState({ status: 'error', data: null });
                return;
            }

            setState({ status: 'success', data: res.data });
        })();

        return () => {
            active = false;
        };
    }, []);

    const roles = useMemo(() => {
        return Array.isArray(state.data?.roles) ? state.data.roles : [];
    }, [state.data]);

    const user = useMemo(() => {
        return state.data?.user ?? null;
    }, [state.data]);

    return {
        status: state.status,
        me: state.data,
        roles,
        user,
    };
}
