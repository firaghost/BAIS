import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

function hasToken() {
    try {
        return Boolean(localStorage.getItem('bais_token'));
    } catch {
        return false;
    }
}

export function RequireAuth() {
    const location = useLocation();

    if (!hasToken()) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    return <Outlet />;
}
