import React from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';

import { App } from './ui/App.jsx';

import '../../css/app.css';

const el = document.getElementById('app');

function getBasename() {
    const path = window.location.pathname || '/';
    return path === '/app' || path.startsWith('/app/') ? '/app' : '/';
}

if (el) {
    createRoot(el).render(
        <React.StrictMode>
            <BrowserRouter basename={getBasename()}>
                <App />
            </BrowserRouter>
        </React.StrictMode>,
    );
}
