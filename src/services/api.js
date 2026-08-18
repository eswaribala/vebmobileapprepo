import axios from 'axios';

export const BASE_URL = 'https://vebdentalbackend-production.up.railway.app/api';

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 60000,
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

const MAX_RETRIES = 2;

api.interceptors.response.use(
  (res) => res.data,
  async (err) => {
    const config = err.config;
    // Retry only on network/timeout errors, not on API responses (4xx/5xx)
    const isNetworkError = !err.response && (err.code === 'ECONNABORTED' || err.message === 'Network Error');
    // Only retry idempotent requests — retrying POST/PUT/DELETE after a timeout can
    // create duplicate records if the original request actually succeeded server-side.
    const isIdempotent = (config?.method || 'get').toLowerCase() === 'get';
    if (isNetworkError && isIdempotent && config && (config._retryCount || 0) < MAX_RETRIES) {
      config._retryCount = (config._retryCount || 0) + 1;
      await new Promise((resolve) => setTimeout(resolve, 1000 * config._retryCount));
      return api(config);
    }
    const msg = err.response?.data?.error ||
      (isNetworkError ? 'Unable to reach server. Please check your internet connection and try again.' : err.message) ||
      'Network error';
    return Promise.reject(new Error(msg));
  }
);

// Auth
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  signup: (data) => api.post('/auth/signup', data),
  me: () => api.get('/auth/me'),
  changePassword: (current_password, new_password) => api.put('/auth/change-password', { current_password, new_password }),
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
  getOwnerBlockedSlots: (date) => api.get('/appointments/owner-blocked-slots', { params: { date } }),
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
  checkIn: (id, type = 'staff', session) => api.post('/attendance/checkin', {
    ...(type === 'doctor' ? { doctor_id: id } : { staff_id: id }),
    session,
  }),
  checkOut: (id, type = 'staff', session) => api.post('/attendance/checkout', {
    ...(type === 'doctor' ? { doctor_id: id } : { staff_id: id }),
    session,
  }),
  save: (data) => api.post('/attendance', data),
  update: (id, data) => api.put(`/attendance/${id}`, data),
  autoMarkAbsent: () => api.post('/attendance/auto-mark-absent'),
  backfillAbsent: (month, year) => api.post('/attendance/backfill-absent', { month, year }),
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

// Owner personal consulting
export const ownerConsultingAPI = {
  getAppointments: (params) => api.get('/owner/appointments', { params }),
  getByDate: (date) => api.get('/owner/appointments', { params: { date } }),
  addAppointment: (data) => api.post('/owner/appointments', data),
  updateAppointment: (id, data) => api.put(`/owner/appointments/${id}`, data),
  deleteAppointment: (id) => api.delete(`/owner/appointments/${id}`),
  getEarnings: (year) => api.get('/owner/earnings', { params: { year } }),
  getBlockedSlots: (date) => api.get('/owner/blocked-slots', { params: { date } }),
  getClinicSlots: (params) => api.get('/owner/clinic-slots', { params }),
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
  delete: (id) => api.delete(`/billing/${id}`),
  getStats: () => api.get('/billing/stats/summary'),
  getIncomeReport: (params) => api.get('/billing/income-report', { params }),
  voidBill: (id) => api.patch(`/billing/${id}/void`),
};

export default api;
