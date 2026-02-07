import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    register: (data: any) => api.post('/auth/register', data),
    login: (data: any) => api.post('/auth/login', data),
};

export const userApi = {
    getProfile: () => api.get('/user/profile'),
    addApiKey: (key: string) => api.post('/user/api-keys', { key }),
    deleteApiKey: (id: string) => api.delete(`/user/api-keys/${id}`),
};

export const scanApi = {
    saveScan: (data: any) => api.post('/scans', data),
    getHistory: (limit?: number) => api.get('/scans/history', { params: { limit } }),
    analyze: (url: string) => api.post('/scans/analyze', { url }),
    simulateAttack: (url: string, type: string) => api.post('/scans/simulate-attack', { url, type }),
    getRemediation: (title: string, description: string, query: string) =>
        api.post('/scans/remediation', { title, description, query }),
};

export const paymentApi = {
    createCheckoutSession: (amount: number, credits: number) => api.post('/payment/create-checkout-session', { amount, credits }),
    verify: (sessionId: string) => api.post('/payment/verify-session', { sessionId }),
};

export default api;
