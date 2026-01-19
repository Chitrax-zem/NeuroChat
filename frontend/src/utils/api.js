import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json'
  }
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = url.includes('/auth/login') || url.includes('/auth/register');

    if (status === 401 && !isAuthAttempt) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  updateSettings: (data) => api.put('/auth/settings', data),
  updatePassword: (data) => api.put('/auth/password', data)
};

export const chatAPI = {
  createChat: (data) => api.post('/chat/new', data),
  getChats: (params) => api.get('/chat', { params }),
  getChat: (chatId) => api.get(`/chat/${chatId}`),
  sendMessageFallback: (chatId, data) => api.post(`/chat/${chatId}/message-fallback`, data),
  updateChat: (chatId, data) => api.put(`/chat/${chatId}`, data),
  deleteChat: (chatId) => api.delete(`/chat/${chatId}`),
  archiveChat: (chatId) => api.put(`/chat/${chatId}/archive`)
};

export const uploadAPI = {
  processFile: (formData) => api.post('/upload/process', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  processVoice: (formData) => api.post('/upload/voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
};

export const voiceAPI = {
  speechToText: (audioData) => api.post('/voice/speech-to-text', { audioData }),
  textToSpeech: (text, language) => api.post('/voice/text-to-speech', { text, language })
};

export const analyticsAPI = {
  getDashboard: (days) => api.get('/analytics/dashboard', { params: { days } }),
  getTrends: (days) => api.get('/analytics/trends', { params: { days } })
};

export default api;
