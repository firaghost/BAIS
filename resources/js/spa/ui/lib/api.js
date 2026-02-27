import axios from 'axios';

function getToken() {
    try {
        return localStorage.getItem('bais_token');
    } catch {
        return null;
    }
}

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
    headers: {
        Accept: 'application/json',
    },
});

api.interceptors.request.use((config) => {
    const token = getToken();

    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

export async function safeGet(url, config) {
    try {
        const res = await api.get(url, config);
        return { ok: true, data: res.data };
    } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        return { ok: false, status, error: data ?? String(err) };
    }
}

export async function safePost(url, payload, config) {
    try {
        const res = await api.post(url, payload, config);
        return { ok: true, data: res.data };
    } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        return { ok: false, status, error: data ?? String(err) };
    }
}

export async function safePut(url, payload, config) {
    try {
        const res = await api.put(url, payload, config);
        return { ok: true, data: res.data };
    } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        return { ok: false, status, error: data ?? String(err) };
    }
}

export async function safePatch(url, payload, config) {
    try {
        const res = await api.patch(url, payload, config);
        return { ok: true, data: res.data };
    } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        return { ok: false, status, error: data ?? String(err) };
    }
}

export async function safeDelete(url, config) {
    try {
        const res = await api.delete(url, config);
        return { ok: true, data: res.data };
    } catch (err) {
        const status = err?.response?.status;
        const data = err?.response?.data;
        return { ok: false, status, error: data ?? String(err) };
    }
}
