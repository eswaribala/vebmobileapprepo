import axios from 'axios';

export const BASE_URL = 'https://vebdentalbackend-production.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Call this after login/logout to attach or remove the Bearer token
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

api.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (data) => api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
};

// Patients
export const patientsAPI = {
  getAll: (search) => api.get('/patients', { params: search ? { search } : {} }),
  getById: (id) => api.get(`/patients/${id}`),
  create: (data) => api.post('/patients', data),
  update: (id, data) => api.put(`/patients/${id}`, data),
  delete: (id) => api.delete(`/patients/${id}`),
  getHistory: (id) => api.get(`/patients/${id}/history`),
};

// Doctors
export const doctorsAPI = {
  getAll: () => api.get('/doctors'),
  getAllIncInactive: () => api.get('/doctors/all'),
  getById: (id) => api.get(`/doctors/${id}`),
  create: (data) => api.post('/doctors', data),
  update: (id, data) => api.put(`/doctors/${id}`, data),
  delete: (id) => api.delete(`/doctors/${id}`),
};

// Staff
export const staffAPI = {
  getAll: () => api.get('/staff'),
  getById: (id) => api.get(`/staff/${id}`),
  create: (data) => api.post('/staff', data),
  update: (id, data) => api.put(`/staff/${id}`, data),
  delete: (id) => api.delete(`/staff/${id}`),
};

// Appointments
export const appointmentsAPI = {
  getAll: (params) => api.get('/appointments', { params }),
  getToday: () => api.get('/appointments/today'),
  getReminders: () => api.get('/appointments/reminders/tomorrow'),
  getById: (id) => api.get(`/appointments/${id}`),
  create: (data) => api.post('/appointments', data),
  update: (id, data) => api.put(`/appointments/${id}`, data),
  delete: (id) => api.delete(`/appointments/${id}`),
};

// Attendance
export const attendanceAPI = {
  getAll: (params) => api.get('/attendance', { params }),
  getToday: () => api.get('/attendance/today'),
  getSummary: (month, year) => api.get('/attendance/summary', { params: { month, year } }),
  checkIn: (staff_id) => api.post('/attendance/checkin', { staff_id }),
  checkOut: (staff_id) => api.post('/attendance/checkout', { staff_id }),
  save: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
};

// Diagnosis
export const diagnosisAPI = {
  getAll: (params) => api.get('/diagnosis', { params }),
  getById: (id) => api.get(`/diagnosis/${id}`),
  create: (data) => api.post('/diagnosis', data),
  update: (id, data) => api.put(`/diagnosis/${id}`, data),
  addTreatment: (diagId, data) => api.post(`/diagnosis/${diagId}/treatments`, data),
  getTreatments: (diagId) => api.get(`/diagnosis/${diagId}/treatments`),
  updateTreatment: (treatId, data) => api.put(`/diagnosis/treatments/${treatId}`, data),
  deleteTreatment: (treatId) => api.delete(`/diagnosis/treatments/${treatId}`),
  addPrescription: (diagId, data) => api.post(`/diagnosis/${diagId}/prescriptions`, data),
  getPrescriptions: (diagId) => api.get(`/diagnosis/${diagId}/prescriptions`),
  getPatientTreatments: (patientId) => api.get(`/diagnosis/patient/${patientId}/treatments`),
};

// Owner / approval
export const ownerAPI = {
  getPending: () => api.get('/auth/pending'),
  approve: (id) => api.put(`/auth/approve/${id}`),
  reject: (id) => api.delete(`/auth/reject/${id}`),
};

// Consultants
export const consultantAPI = {
  getPaymentsSummary: () => api.get('/consultants/payments/summary'),
  getAppointments: (id) => api.get(`/consultants/${id}/appointments`),
  getPayments: (id) => api.get(`/consultants/${id}/payments`),
  addPayment: (id, data) => api.post(`/consultants/${id}/payments`, data),
  deletePayment: (paymentId) => api.delete(`/consultants/payments/${paymentId}`),
  getReminders: () => api.get('/consultants/reminders/upcoming'),
};

// Billing
export const billingAPI = {
  getAll: (params) => api.get('/billing', { params }),
  getById: (id) => api.get(`/billing/${id}`),
  create: (data) => api.post('/billing', data),
  update: (id, data) => api.put(`/billing/${id}`, data),
  getStats: () => api.get('/billing/stats/summary'),
};

export default api;
