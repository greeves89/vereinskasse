import axios, { AxiosInstance, AxiosError } from 'axios'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || '/api/v1'

const api: AxiosInstance = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for auth errors
let isRefreshing = false

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as typeof error.config & { _retry?: boolean }

    // Only try refresh once, and not on auth endpoints themselves
    if (
      error.response?.status === 401 &&
      !originalRequest?._retry &&
      !originalRequest?.url?.includes('/auth/')
    ) {
      originalRequest!._retry = true

      if (!isRefreshing) {
        isRefreshing = true
        try {
          await api.post('/auth/refresh')
          isRefreshing = false
          return api.request(originalRequest!)
        } catch {
          isRefreshing = false
          // Refresh failed - let the auth store handle redirect via fetchUser
        }
      }
    }

    return Promise.reject(error)
  }
)

export default api

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: { email: string; name: string; password: string; organization_name?: string }) =>
    api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
}

export const usersApi = {
  getProfile: () => api.get('/users/me'),
  updateProfile: (data: { name?: string; email?: string; organization_name?: string }) =>
    api.put('/users/me', data),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.put('/users/me/password', { current_password: currentPassword, new_password: newPassword }),
}

export const membersApi = {
  list: (params?: { status?: string; search?: string }) =>
    api.get('/members', { params }),
  create: (data: Record<string, unknown>) => api.post('/members', data),
  get: (id: number) => api.get(`/members/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/members/${id}`, data),
  delete: (id: number) => api.delete(`/members/${id}`),
  stats: () => api.get('/members/count/stats'),
  downloadTemplate: () => api.get('/members/template/csv', { responseType: 'blob' }),
  importCsv: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/members/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const transactionsApi = {
  list: (params?: Record<string, unknown>) => api.get('/transactions', { params }),
  create: (data: Record<string, unknown>) => api.post('/transactions', data),
  get: (id: number) => api.get(`/transactions/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/transactions/${id}`, data),
  delete: (id: number) => api.delete(`/transactions/${id}`),
  stats: () => api.get('/transactions/stats'),
  exportDatev: (year?: number) => api.get('/transactions/export/datev', { params: { year }, responseType: 'blob' }),
  exportJahresabschluss: (year: number) =>
    api.get('/transactions/export/jahresabschluss', { params: { year }, responseType: 'blob' }),
  monthlyChart: (months?: number) => api.get('/transactions/monthly-chart', { params: { months } }),
  downloadTemplate: () => api.get('/transactions/template/csv', { responseType: 'blob' }),
  importCsv: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/transactions/import', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
}

export const categoriesApi = {
  list: () => api.get('/categories'),
  create: (data: { name: string; type: string; color?: string }) => api.post('/categories', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/categories/${id}`, data),
  delete: (id: number) => api.delete(`/categories/${id}`),
}

export const feedbackApi = {
  list: () => api.get('/feedback'),
  create: (data: { type: string; title: string; message: string }) => api.post('/feedback', data),
  get: (id: number) => api.get(`/feedback/${id}`),
}

export const adminApi = {
  stats: () => api.get('/admin/stats'),
  listUsers: (search?: string) => api.get('/admin/users', { params: { search } }),
  updateUser: (id: number, data: Record<string, unknown>) => api.put(`/admin/users/${id}`, data),
  deleteUser: (id: number) => api.delete(`/admin/users/${id}`),
  listFeedback: (status?: string) => api.get('/admin/feedback', { params: { status } }),
  updateFeedback: (id: number, data: { status?: string; admin_response?: string }) =>
    api.put(`/admin/feedback/${id}`, data),
}

export const gdprApi = {
  exportData: () => api.get('/gdpr/export', { responseType: 'blob' }),
  deleteAccount: () => api.delete('/gdpr/delete-account'),
}

export const protocolsApi = {
  list: (params?: { protocol_type?: string; status?: string }) => api.get('/protocols', { params }),
  create: (data: Record<string, unknown>) => api.post('/protocols', data),
  get: (id: number) => api.get(`/protocols/${id}`),
  update: (id: number, data: Record<string, unknown>) => api.put(`/protocols/${id}`, data),
  delete: (id: number) => api.delete(`/protocols/${id}`),
}

export const documentsApi = {
  list: (category?: string) => api.get('/documents', { params: category ? { category } : undefined }),
  upload: (file: File, title?: string, description?: string, category?: string) => {
    const formData = new FormData()
    formData.append('file', file)
    if (title) formData.append('title', title)
    if (description) formData.append('description', description)
    if (category) formData.append('category', category)
    return api.post('/documents', formData, { headers: { 'Content-Type': 'multipart/form-data' } })
  },
  getDownloadUrl: (id: number) => `${api.defaults.baseURL}/documents/${id}/download`,
  update: (id: number, data: { title?: string; description?: string; category?: string }) =>
    api.patch(`/documents/${id}`, null, { params: data }),
  delete: (id: number) => api.delete(`/documents/${id}`),
}

export const donationsApi = {
  getSummary: (memberId: number, year: number) =>
    api.get(`/donations/summary/${memberId}`, { params: { year } }),
  getReceiptUrl: (memberId: number, year: number) =>
    `${api.defaults.baseURL}/donations/receipt/${memberId}?year=${year}`,
  downloadReceipt: (memberId: number, year: number) =>
    api.get(`/donations/receipt/${memberId}`, { params: { year }, responseType: 'blob' }),
}

export const paymentRemindersApi = {
  list: (memberId: number, status?: string) =>
    api.get(`/members/${memberId}/reminders`, { params: status ? { status } : undefined }),
  create: (memberId: number, data: { amount: string; due_date: string; notes?: string }) =>
    api.post(`/members/${memberId}/reminders`, data),
  update: (memberId: number, reminderId: number, data: Record<string, unknown>) =>
    api.put(`/members/${memberId}/reminders/${reminderId}`, data),
  delete: (memberId: number, reminderId: number) =>
    api.delete(`/members/${memberId}/reminders/${reminderId}`),
  send: (memberId: number, reminderId: number) =>
    api.post(`/members/${memberId}/reminders/${reminderId}/send`),
  paymentOverview: () => api.get('/members/payment-overview'),
}

export const inventoryApi = {
  list: (status?: string) => api.get('/inventory', { params: status ? { status } : undefined }),
  create: (data: Record<string, unknown>) => api.post('/inventory', data),
  update: (id: number, data: Record<string, unknown>) => api.put(`/inventory/${id}`, data),
  delete: (id: number) => api.delete(`/inventory/${id}`),
  lend: (id: number, data: { lent_to: string; lent_since: string }) => api.post(`/inventory/${id}/lend`, data),
  returnItem: (id: number) => api.post(`/inventory/${id}/return`),
}
