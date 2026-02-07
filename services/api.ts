import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

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
};

export const paymentApi = {
    initialize: (amount: number, credits: number) => api.post('/payment/initialize', { amount, credits }),
    verify: (reference: string) => api.post('/payment/verify', { reference }),
};

export default api;
