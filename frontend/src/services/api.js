/**
 * API Service — Centralized API calls
 * All backend communication happens here
 */

const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

export const fetchJSON = async (url, opts = {}) => {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
    ...opts,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

// Auth
export const login = (username, password) =>
  fetchJSON("/auth/token/", { method: "POST", body: JSON.stringify({ username, password }) });

// Students
export const getStudents = () => fetchJSON("/students/");
export const createStudent = (data) => fetchJSON("/students/", { method: "POST", body: JSON.stringify(data) });
export const updateStudent = (id, data) => fetchJSON(`/students/${id}/`, { method: "PUT", body: JSON.stringify(data) });
export const deleteStudent = (id) => fetchJSON(`/students/${id}/`, { method: "DELETE" });
export const importStudents = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  const token = localStorage.getItem("token");
  return fetch(`${API}/students/bulk_import/`, {
    method: "POST",
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: formData,
  }).then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)));
};

// Templates
export const getTemplates = () => fetchJSON("/emails/templates/");
export const updateTemplate = (id, data) => fetchJSON(`/emails/templates/${id}/`, { method: "PUT", body: JSON.stringify(data) });

// Send Emails
export const sendSingleEmail = (studentId, emailType, extraContext, attachPdf) =>
  fetchJSON("/emails/trigger/send_single/", {
    method: "POST",
    body: JSON.stringify({ student_id: studentId, email_type: emailType, extra_context: extraContext, attach_pdf: attachPdf }),
  });

export const sendBulkEmail = (studentIds, emailType, extraContext) =>
  fetchJSON("/emails/trigger/send_bulk/", {
    method: "POST",
    body: JSON.stringify({ student_ids: studentIds, email_type: emailType, extra_context: extraContext }),
  });

// Logs
export const getLogs = (status) => fetchJSON(`/logs/?status=${status}`);
export const exportLogs = () => fetchJSON("/logs/export/");
