import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swam_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('swam_token');
      localStorage.removeItem('swam_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email: string, password: string) => api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

// ─── Students ─────────────────────────────────────────────────────────────────
export const studentsApi = {
  list: (params?: Record<string, string>) => api.get('/students', { params }),
  get: (id: number) => api.get(`/students/${id}`),
  create: (data: Record<string, unknown>) => api.post('/students', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/students/${id}`, data),
};

// ─── Classes ──────────────────────────────────────────────────────────────────
export const classesApi = {
  list: () => api.get('/classes'),
  getSubjects: (id: number) => api.get(`/classes/${id}/subjects`),
  getStudents: (id: number) => api.get(`/classes/${id}/students`),
  allSubjects: () => api.get('/classes/subjects/all'),
  create: (data: Record<string, unknown>) => api.post('/classes', data),
  createSubject: (classId: number, data: Record<string, unknown>) => api.post(`/classes/${classId}/subjects`, data),
};

// ─── Grades ───────────────────────────────────────────────────────────────────
export const gradesApi = {
  list: (params?: Record<string, string>) => api.get('/grades', { params }),
  summary: (studentId: number) => api.get(`/grades/summary/${studentId}`),
  create: (data: Record<string, unknown>) => api.post('/grades', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/grades/${id}`, data),
  delete: (id: number) => api.delete(`/grades/${id}`),
};

// ─── Attendance ───────────────────────────────────────────────────────────────
export const attendanceApi = {
  list: (params?: Record<string, string>) => api.get('/attendance', { params }),
  stats: (studentId: number) => api.get(`/attendance/stats/${studentId}`),
  record: (data: unknown) => api.post('/attendance', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/attendance/${id}`, data),
};

// ─── Fees ─────────────────────────────────────────────────────────────────────
export const feesApi = {
  list: (params?: Record<string, string>) => api.get('/fees', { params }),
  summary: () => api.get('/fees/summary'),
  payments: (feeId: number) => api.get(`/fees/${feeId}/payments`),
  create: (data: Record<string, unknown>) => api.post('/fees', data),
  recordPayment: (feeId: number, data: Record<string, unknown>) => api.post(`/fees/${feeId}/payment`, data),
};

// ─── Wellbeing ────────────────────────────────────────────────────────────────
export const wellbeingApi = {
  list: (params?: Record<string, string>) => api.get('/wellbeing', { params }),
  create: (data: Record<string, unknown>) => api.post('/wellbeing', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/wellbeing/${id}`, data),
  behaviorList: (params?: Record<string, string>) => api.get('/wellbeing/behavior', { params }),
  createBehavior: (data: Record<string, unknown>) => api.post('/wellbeing/behavior', data),
};

// ─── Messages ─────────────────────────────────────────────────────────────────
export const messagesApi = {
  inbox: () => api.get('/messages', { params: { type: 'inbox' } }),
  sent: () => api.get('/messages', { params: { type: 'sent' } }),
  contacts: () => api.get('/messages/contacts'),
  send: (data: Record<string, unknown>) => api.post('/messages', data),
  markRead: (id: number) => api.put(`/messages/${id}/read`),
};

// ─── Announcements ────────────────────────────────────────────────────────────
export const announcementsApi = {
  list: () => api.get('/announcements'),
  listAll: () => api.get('/announcements/all'),
  create: (data: Record<string, unknown>) => api.post('/announcements', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/announcements/${id}`, data),
  delete: (id: number) => api.delete(`/announcements/${id}`),
};

// ─── Notifications ────────────────────────────────────────────────────────────
export const notificationsApi = {
  list: () => api.get('/notifications'),
  unreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id: number) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
};

// ─── Analytics ────────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: () => api.get('/analytics/overview'),
  student: (studentId: number) => api.get(`/analytics/student/${studentId}`),
  atRisk: () => api.get('/analytics/at-risk'),
  events: () => api.get('/analytics/events'),
};

// ─── Alerts ───────────────────────────────────────────────────────────────────
export const alertsApi = {
  list: (params?: Record<string, string>) => api.get('/alerts', { params }),
  generate: () => api.post('/alerts/generate'),
  resolve: (id: number, notes?: string) => api.put(`/alerts/${id}/resolve`, { notes }),
  create: (data: Record<string, unknown>) => api.post('/alerts', data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersApi = {
  list: (params?: Record<string, string>) => api.get('/users', { params }),
  create: (data: Record<string, unknown>) => api.post('/users', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}`, data),
  changePassword: (id: number, data: Record<string, unknown>) => api.put(`/users/${id}/password`, data),
  toggleActive: (id: number) => api.put(`/users/${id}/toggle-active`),
};
