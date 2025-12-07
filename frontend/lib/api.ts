import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use(
  (config) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        // Ensure headers object exists
        if (!config.headers) {
          config.headers = {};
        }
        // Always set Authorization header
        config.headers.Authorization = `Bearer ${token}`;
        
        // If sending FormData, remove Content-Type so axios can set it with boundary
        if (config.data instanceof FormData) {
          delete config.headers['Content-Type'];
        }
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  sendOTP: (mobile: string) => api.post('/auth/send-otp', { mobile }),
  verifyOTP: (mobile: string, otp: string) => api.post('/auth/verify-otp', { mobile, otp }),
};

// User API
export const userAPI = {
  getProfile: () => api.get('/users/profile'),
  updateProfile: (data: any) => api.put('/users/profile', data),
};

// Policy API
export const policyAPI = {
  getAll: () => api.get('/policies'),
  getById: (id: string) => api.get(`/policies/${id}`),
  buy: (data: FormData) => api.post('/policies/buy', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  delete: (id: string) => api.delete(`/policies/${id}`),
  renew: (id: string, data: any) => api.post(`/policies/${id}/renew`, data),
};

// Claim API
export const claimAPI = {
  getAll: () => api.get('/claims'),
  getById: (id: string) => api.get(`/claims/${id}`),
  submit: (formData: FormData) => {
    // Get token to verify it exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    
    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }
    
    // Don't pass any headers - let the interceptor handle it
    // Axios will automatically set Content-Type for FormData with boundary
    // The interceptor will add Authorization header
    return api.post('/claims/submit', formData);
  },
  delete: (id: string) => api.delete(`/claims/${id}`),
  getMLReport: (id: string) => api.get(`/claims/${id}/ml-report`),
};

// Calculator API
export const calculatorAPI = {
  getPolicyTypes: () => api.get('/calculator/policy-types'),
  calculatePremium: (data: any) => api.post('/calculator/premium', data),
  calculateIDV: (data: any) => api.post('/calculator/idv', data),
  calculateNCB: (data: any) => api.post('/calculator/ncb', data),
};

// Admin API
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getPolicyTypes: () => api.get('/admin/policy-types'),
  createPolicyType: (data: any) => api.post('/admin/policy-types', data),
  updatePolicyType: (id: string, data: any) => api.put(`/admin/policy-types/${id}`, data),
  deletePolicyType: (id: string) => api.delete(`/admin/policy-types/${id}`),
  getUsers: () => api.get('/admin/users'),
  getPolicies: () => api.get('/admin/policies'),
  getClaims: () => api.get('/admin/claims'),
  updateClaimStatus: (id: string, status: string) => api.put(`/admin/claims/${id}/status`, { status }),
};

export default api;

