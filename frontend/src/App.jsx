// App.jsx — Email Automation System — Main Application
import { useState, useEffect, useRef, useCallback } from "react";

// ─── API Base ─────────────────────────────────────────────────────────────
const API = import.meta.env.VITE_API_URL || "http://localhost:8000/api";
const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

const fetchJSON = async (url, opts = {}) => {
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

// ─── Email Types ──────────────────────────────────────────────────────────
const EMAIL_TYPES = [
  { value: "review_feedback", label: "Review Feedback", icon: "📋", color: "#6366f1" },
  { value: "weekly_schedule", label: "Weekly Schedule", icon: "📅", color: "#0ea5e9" },
  { value: "offer_letter",    label: "Offer Letter",    icon: "📄", color: "#10b981", hasPdf: true },
  { value: "certificate",     label: "Certificate",     icon: "🏆", color: "#f59e0b", hasPdf: true },
  { value: "first_review",    label: "First Review",    icon: "🔍", color: "#8b5cf6" },
  { value: "task_allocation", label: "Task Allocation", icon: "📌", color: "#f97316", hasPdf: true },
  { value: "review_reminder", label: "Review Reminder", icon: "⏰", color: "#ec4899" },
  { value: "hold",            label: "Hold Mail",       icon: "⏸️", color: "#6b7280" },
];

const STATUS_COLORS = {
  active:    "#10b981",
  on_hold:   "#f59e0b",
  selected:  "#6366f1",
  rejected:  "#ef4444",
  completed: "#0ea5e9",
};

// ─── Shared UI Components ─────────────────────────────────────────────────
const Badge = ({ children, color = "#6366f1" }) => (
  <span style={{
    background: color + "20",
    color,
    border: `1px solid ${color}40`,
    borderRadius: "999px",
    padding: "2px 10px",
    fontSize: "11px",
    fontWeight: 600,
    letterSpacing: "0.02em",
  }}>{children}</span>
);

const StatCard = ({ label, value, sub, color = "#6366f1", icon }) => (
  <div style={{
    background: "#fff",
    border: "1px solid #e5e7eb",
    borderRadius: "12px",
    padding: "20px",
    borderTop: `3px solid ${color}`,
  }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ fontSize: "12px", color: "#6b7280", margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</p>
        <p style={{ fontSize: "28px", fontWeight: 700, color: "#111827", margin: 0, fontFamily: "'DM Mono', monospace" }}>{value}</p>
        {sub && <p style={{ fontSize: "12px", color: "#9ca3af", margin: "4px 0 0" }}>{sub}</p>}
      </div>
      <span style={{ fontSize: "24px" }}>{icon}</span>
    </div>
  </div>
);

const Button = ({ onClick, children, variant = "primary", size = "md", disabled, style = {} }) => {
  const base = {
    border: "none",
    borderRadius: "8px",
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit",
    fontWeight: 600,
    transition: "all 0.15s",
    opacity: disabled ? 0.5 : 1,
    ...(size === "sm" ? { padding: "6px 14px", fontSize: "12px" } : { padding: "10px 20px", fontSize: "14px" }),
  };
  const variants = {
    primary:   { background: "#6366f1", color: "#fff" },
    secondary: { background: "#f3f4f6", color: "#374151" },
    danger:    { background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" },
    success:   { background: "#d1fae5", color: "#065f46" },
    ghost:     { background: "transparent", color: "#6366f1", border: "1px solid #e0e7ff" },
  };
  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
};

const Modal = ({ open, onClose, title, children, width = "600px" }) => {
  if (!open) return null;
  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
    }} onClick={onClose}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "28px",
        width, maxWidth: "95vw", maxHeight: "85vh", overflowY: "auto",
        boxShadow: "0 25px 60px rgba(0,0,0,0.25)",
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#111827" }}>{title}</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "#6b7280" }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

const Input = ({ label, ...props }) => (
  <div style={{ marginBottom: "16px" }}>
    {label && <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{label}</label>}
    <input {...props} style={{
      width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
      borderRadius: "8px", fontSize: "14px", outline: "none",
      fontFamily: "inherit", boxSizing: "border-box",
      ...(props.style || {})
    }} />
  </div>
);

const Select = ({ label, options, ...props }) => (
  <div style={{ marginBottom: "16px" }}>
    {label && <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{label}</label>}
    <select {...props} style={{
      width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
      borderRadius: "8px", fontSize: "14px", background: "#fff",
      fontFamily: "inherit", boxSizing: "border-box",
    }}>
      {options.map(o => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </div>
);

const Textarea = ({ label, ...props }) => (
  <div style={{ marginBottom: "16px" }}>
    {label && <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>{label}</label>}
    <textarea {...props} style={{
      width: "100%", padding: "10px 12px", border: "1px solid #e5e7eb",
      borderRadius: "8px", fontSize: "14px", fontFamily: "inherit",
      resize: "vertical", minHeight: "120px", boxSizing: "border-box",
      ...(props.style || {})
    }} />
  </div>
);

// ─── Toast Notifications ──────────────────────────────────────────────────
let toastFn = null;
const Toast = () => {
  const [toasts, setToasts] = useState([]);
  toastFn = (msg, type = "success") => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };
  return (
    <div style={{ position: "fixed", bottom: "24px", right: "24px", zIndex: 9999, display: "flex", flexDirection: "column", gap: "10px" }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "success" ? "#065f46" : t.type === "error" ? "#7f1d1d" : "#1e3a8a",
          color: "#fff", padding: "12px 20px", borderRadius: "10px",
          fontSize: "14px", fontWeight: 500, maxWidth: "320px",
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          animation: "slideIn 0.2s ease",
        }}>
          {t.type === "success" ? "✓ " : t.type === "error" ? "✗ " : "ℹ "}{t.msg}
        </div>
      ))}
    </div>
  );
};
const toast = (msg, type) => toastFn && toastFn(msg, type);

// ─── SIDEBAR ──────────────────────────────────────────────────────────────
const PAGES = [
  { id: "dashboard",  label: "Dashboard",         icon: "▣" },
  { id: "students",   label: "Students",           icon: "👥" },
  { id: "templates",  label: "Email Templates",    icon: "✉" },
  { id: "trigger",    label: "Send Emails",        icon: "🚀" },
  { id: "logs",       label: "Email Logs",         icon: "📊" },
];

const Sidebar = ({ page, setPage, notifications, onLogout }) => (
  <aside style={{
    width: "240px", minHeight: "100vh", background: "#0f172a",
    display: "flex", flexDirection: "column", padding: "0",
    flexShrink: 0,
  }}>
    <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid #1e293b" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
        <div style={{ width: "36px", height: "36px", background: "#6366f1", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "18px" }}>✉</div>
        <div>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#fff" }}>MailFlow</p>
          <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>Email Automation</p>
        </div>
      </div>
    </div>

    <nav style={{ flex: 1, padding: "16px 10px" }}>
      {PAGES.map(p => (
        <button key={p.id} onClick={() => setPage(p.id)} style={{
          display: "flex", alignItems: "center", gap: "12px",
          width: "100%", padding: "10px 12px", marginBottom: "4px",
          background: page === p.id ? "#6366f1" : "transparent",
          color: page === p.id ? "#fff" : "#94a3b8",
          border: "none", borderRadius: "8px", cursor: "pointer",
          fontSize: "14px", fontWeight: page === p.id ? 600 : 400,
          textAlign: "left", transition: "all 0.15s", fontFamily: "inherit",
        }}>
          <span style={{ fontSize: "16px", width: "20px", textAlign: "center" }}>{p.icon}</span>
          {p.label}
          {p.id === "logs" && notifications > 0 && (
            <span style={{ marginLeft: "auto", background: "#ef4444", color: "#fff", borderRadius: "999px", fontSize: "10px", padding: "2px 6px", fontWeight: 700 }}>{notifications}</span>
          )}
        </button>
      ))}
    </nav>

    <div style={{ padding: "16px 20px", borderTop: "1px solid #1e293b" }}>
      <p style={{ margin: 0, fontSize: "11px", color: "#475569" }}>Powered by Claude AI</p>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px" }}>
        <div style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981" }}></div>
        <p style={{ margin: 0, fontSize: "11px", color: "#64748b" }}>System online</p>
      </div>
      <button onClick={onLogout} style={{
        width: "100%", marginTop: "12px", padding: "8px 12px",
        background: "#1e293b", color: "#94a3b8", border: "1px solid #334155",
        borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
        transition: "all 0.15s"
      }}>🔓 Logout</button>
    </div>
  </aside>
);

// ─── DASHBOARD PAGE ────────────────────────────────────────────────────────
const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [logStats, setLogStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchJSON("/students/stats/").catch(() => null),
      fetchJSON("/logs/analytics/").catch(() => null),
    ]).then(([s, l]) => {
      setStats(s);
      setLogStats(l);
      setLoading(false);
    });
  }, []);

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "300px" }}>
      <div style={{ textAlign: "center", color: "#6b7280" }}>
        <div style={{ fontSize: "32px", marginBottom: "12px" }}>⟳</div>
        <p>Loading dashboard...</p>
      </div>
    </div>
  );

  const trend = logStats?.trend?.slice(-14) || [];
  const maxVal = Math.max(...trend.map(d => d.sent + d.failed), 1);

  return (
    <div>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 700, color: "#111827" }}>Dashboard</h1>
        <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Real-time overview of your email automation system</p>
      </div>

      {/* Student stats */}
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>Students</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard label="Total Students" value={stats?.total || 0} icon="👥" color="#6366f1" />
        <StatCard label="Active" value={stats?.by_status?.active || 0} icon="✓" color="#10b981" />
        <StatCard label="On Hold" value={stats?.by_status?.on_hold || 0} icon="⏸" color="#f59e0b" />
        <StatCard label="Selected" value={stats?.by_status?.selected || 0} icon="★" color="#6366f1" />
        <StatCard label="Completed" value={stats?.by_status?.completed || 0} icon="🏆" color="#0ea5e9" />
      </div>

      {/* Email stats */}
      <p style={{ fontSize: "12px", fontWeight: 700, color: "#9ca3af", letterSpacing: "0.08em", textTransform: "uppercase", margin: "0 0 12px" }}>Email Performance</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <StatCard label="Total Sent" value={logStats?.total || 0} icon="✉" color="#6366f1" />
        <StatCard label="Success Rate" value={`${logStats?.success_rate || 0}%`} icon="✓" color="#10b981" sub={`${logStats?.sent || 0} delivered`} />
        <StatCard label="Failed" value={logStats?.failed || 0} icon="✗" color="#ef4444" />
        <StatCard label="Last 7 Days" value={logStats?.last_7_days || 0} icon="📅" color="#0ea5e9" />
      </div>

      {/* Trend chart */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginBottom: "24px" }}>
        <p style={{ margin: "0 0 20px", fontSize: "14px", fontWeight: 700, color: "#374151" }}>14-Day Email Trend</p>
        {trend.length > 0 ? (
          <div style={{ display: "flex", alignItems: "flex-end", gap: "4px", height: "120px" }}>
            {trend.map((d, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", alignItems: "center", height: "100%" }}>
                <div style={{ display: "flex", flexDirection: "column-reverse", gap: "2px", width: "100%", height: "100%" }}>
                  <div style={{ background: "#6366f1", borderRadius: "3px 3px 0 0", height: `${(d.sent / maxVal) * 100}%`, minHeight: d.sent > 0 ? "4px" : "0" }} title={`Sent: ${d.sent}`}></div>
                  <div style={{ background: "#fca5a5", borderRadius: "3px 3px 0 0", height: `${(d.failed / maxVal) * 100}%`, minHeight: d.failed > 0 ? "4px" : "0" }} title={`Failed: ${d.failed}`}></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ height: "120px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af" }}>No data yet</div>
        )}
        <div style={{ display: "flex", gap: "16px", marginTop: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "12px", background: "#6366f1", borderRadius: "3px" }}></div><span style={{ fontSize: "12px", color: "#6b7280" }}>Sent</span></div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><div style={{ width: "12px", height: "12px", background: "#fca5a5", borderRadius: "3px" }}></div><span style={{ fontSize: "12px", color: "#6b7280" }}>Failed</span></div>
        </div>
      </div>

      {/* By type */}
      {logStats?.by_type?.length > 0 && (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
          <p style={{ margin: "0 0 16px", fontSize: "14px", fontWeight: 700, color: "#374151" }}>Emails by Type</p>
          {logStats.by_type.map(t => {
            const et = EMAIL_TYPES.find(e => e.value === t.email_type);
            const pct = Math.round((t.sent / (t.count || 1)) * 100);
            return (
              <div key={t.email_type} style={{ marginBottom: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ fontSize: "13px", color: "#374151" }}>{et?.icon} {et?.label || t.email_type}</span>
                  <span style={{ fontSize: "13px", color: "#6b7280" }}>{t.count} sent</span>
                </div>
                <div style={{ height: "6px", background: "#f3f4f6", borderRadius: "999px" }}>
                  <div style={{ height: "100%", width: `${pct}%`, background: et?.color || "#6366f1", borderRadius: "999px", transition: "width 0.5s ease" }}></div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── STUDENTS PAGE ─────────────────────────────────────────────────────────
const StudentsPage = () => {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState({});
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fileRef = useRef();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/students/?page=${page}`;
      if (search) url += `&search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      const data = await fetchJSON(url);
      setStudents(data.results || data);
      setTotal(data.count || (data.results || data).length);
    } catch (e) { toast("Failed to load students", "error"); }
    setLoading(false);
  }, [page, search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    try {
      if (form.id) {
        await fetchJSON(`/students/${form.id}/`, { method: "PUT", body: JSON.stringify(form) });
        toast("Student updated");
      } else {
        await fetchJSON("/students/", { method: "POST", body: JSON.stringify(form) });
        toast("Student created");
      }
      setModal(null);
      load();
    } catch (e) { toast(e.message, "error"); }
  };

  const del = async (id) => {
    if (!confirm("Delete this student?")) return;
    try {
      await fetchJSON(`/students/${id}/`, { method: "DELETE" });
      toast("Student deleted");
      load();
    } catch (e) { toast("Delete failed", "error"); }
  };

  const handleCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    const token = localStorage.getItem("token");
    try {
      const res = await fetch(`${API}/students/bulk_import/`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: fd,
      });
      const data = await res.json();
      toast(`Imported: ${data.created} created, ${data.updated} updated`);
      load();
    } catch (e) { toast("CSV import failed", "error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 700, color: "#111827" }}>Students</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>{total} total students</p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <Button variant="ghost" size="sm" onClick={() => fileRef.current.click()}>📁 Import CSV</Button>
          <input ref={fileRef} type="file" accept=".csv,.xlsx" style={{ display: "none" }} onChange={handleCSV} />
          <Button size="sm" onClick={() => { setForm({}); setModal("edit"); }}>+ Add Student</Button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <input
          placeholder="Search name, email, batch..."
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1); }}
          style={{ flex: 1, padding: "8px 14px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", fontFamily: "inherit" }}
        />
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "#fff" }}>
          <option value="">All Statuses</option>
          {["active","on_hold","selected","rejected","completed"].map(s => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {["Name", "Email", "Course / Batch", "Status", "Review Date", "Actions"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Loading...</td></tr>
            ) : students.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No students found. Add one or import a CSV.</td></tr>
            ) : students.map(s => (
              <tr key={s.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ fontWeight: 600, color: "#111827" }}>{s.name}</div>
                  {s.mentor && <div style={{ fontSize: "12px", color: "#9ca3af" }}>Mentor: {s.mentor}</div>}
                </td>
                <td style={{ padding: "12px 16px", color: "#6b7280" }}>{s.email}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ color: "#374151" }}>{s.course || "—"}</div>
                  {s.batch && <div style={{ fontSize: "12px", color: "#9ca3af" }}>{s.batch}</div>}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <Badge color={STATUS_COLORS[s.status] || "#6b7280"}>{s.status?.replace("_", " ")}</Badge>
                </td>
                <td style={{ padding: "12px 16px", color: "#6b7280", fontSize: "13px" }}>{s.review_date || "—"}</td>
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <Button size="sm" variant="ghost" onClick={() => { setForm(s); setModal("edit"); }}>Edit</Button>
                    <Button size="sm" variant="danger" onClick={() => del(s.id)}>Del</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
        {page > 1 && <Button size="sm" variant="secondary" onClick={() => setPage(p => p - 1)}>← Prev</Button>}
        <span style={{ padding: "6px 14px", fontSize: "14px", color: "#6b7280" }}>Page {page}</span>
        {students.length === 20 && <Button size="sm" variant="secondary" onClick={() => setPage(p => p + 1)}>Next →</Button>}
      </div>

      {/* Edit Modal */}
      <Modal open={modal === "edit"} onClose={() => setModal(null)} title={form.id ? "Edit Student" : "Add Student"} width="640px">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
          <Input label="Full Name *" value={form.name || ""} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="John Doe" />
          <Input label="Email *" type="email" value={form.email || ""} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="john@example.com" />
          <Input label="Phone" value={form.phone || ""} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="+91 98765 43210" />
          <Select label="Status" value={form.status || "active"} onChange={e => setForm(f => ({...f, status: e.target.value}))} options={[
            {value:"active",label:"Active"},{value:"on_hold",label:"On Hold"},
            {value:"selected",label:"Selected"},{value:"rejected",label:"Rejected"},{value:"completed",label:"Completed"}
          ]} />
          <Input label="Course" value={form.course || ""} onChange={e => setForm(f => ({...f, course: e.target.value}))} placeholder="Full Stack Development" />
          <Input label="Batch" value={form.batch || ""} onChange={e => setForm(f => ({...f, batch: e.target.value}))} placeholder="Batch 2024" />
          <Input label="Mentor" value={form.mentor || ""} onChange={e => setForm(f => ({...f, mentor: e.target.value}))} placeholder="Jane Smith" />
          <Input label="Review Date" type="date" value={form.review_date || ""} onChange={e => setForm(f => ({...f, review_date: e.target.value}))} />
          <Input label="Task Title" value={form.task_title || ""} onChange={e => setForm(f => ({...f, task_title: e.target.value}))} placeholder="Build REST API" />
          <Input label="Task Due Date" type="date" value={form.task_due_date || ""} onChange={e => setForm(f => ({...f, task_due_date: e.target.value}))} />
        </div>
        <Textarea label="Feedback" value={form.feedback || ""} onChange={e => setForm(f => ({...f, feedback: e.target.value}))} placeholder="Enter performance feedback..." />
        <Textarea label="Task Description" value={form.task_description || ""} onChange={e => setForm(f => ({...f, task_description: e.target.value}))} placeholder="Describe the task..." />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
          <Button variant="secondary" onClick={() => setModal(null)}>Cancel</Button>
          <Button onClick={save}>Save Student</Button>
        </div>
      </Modal>
    </div>
  );
};

// ─── TEMPLATES PAGE ────────────────────────────────────────────────────────
const TemplatesPage = () => {
  const [templates, setTemplates] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    fetchJSON("/emails/templates/").then(data => {
      setTemplates(data.results || data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const save = async () => {
    try {
      if (selected.id) {
        const updated = await fetchJSON(`/emails/templates/${selected.id}/`, {
          method: "PUT", body: JSON.stringify(selected)
        });
        setTemplates(t => t.map(x => x.id === updated.id ? updated : x));
        toast("Template saved");
      }
    } catch (e) { toast("Save failed", "error"); }
  };

  const improveWithAI = async () => {
    setAiLoading(true);
    try {
      const data = await fetchJSON(`/emails/templates/${selected.id}/improve_with_ai/`, { method: "POST" });
      setSelected(s => ({ ...s, ai_suggested_body: data.improved }));
      toast("AI suggestion ready!");
    } catch (e) { toast("AI improvement failed", "error"); }
    setAiLoading(false);
  };

  const detectTone = async () => {
    try {
      const data = await fetchJSON(`/emails/templates/${selected.id}/detect_tone/`, { method: "POST" });
      setSelected(s => ({ ...s, tone: data.tone }));
      toast(`Tone detected: ${data.tone}`);
    } catch (e) { toast("Tone detection failed", "error"); }
  };

  const loadPreview = async () => {
    try {
      const data = await fetchJSON(`/emails/templates/${selected.id}/preview/`, { method: "POST" });
      setPreview(data);
    } catch (e) { toast("Preview failed", "error"); }
  };

  if (loading) return <div style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Loading templates...</div>;

  return (
    <div style={{ display: "flex", gap: "24px", height: "calc(100vh - 100px)" }}>
      {/* Template list */}
      <div style={{ width: "280px", flexShrink: 0 }}>
        <h1 style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 700, color: "#111827" }}>Email Templates</h1>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {EMAIL_TYPES.map(et => {
            const tpl = templates.find(t => t.type === et.value);
            return (
              <button key={et.value} onClick={() => { setSelected(tpl || null); setPreview(null); }} style={{
                display: "flex", alignItems: "center", gap: "10px",
                padding: "12px 14px", border: "1px solid",
                borderColor: selected?.type === et.value ? et.color : "#e5e7eb",
                borderRadius: "10px", background: selected?.type === et.value ? et.color + "10" : "#fff",
                cursor: "pointer", textAlign: "left", fontFamily: "inherit",
              }}>
                <span style={{ fontSize: "20px" }}>{et.icon}</span>
                <div>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 600, color: "#111827" }}>{et.label}</p>
                  <p style={{ margin: 0, fontSize: "11px", color: tpl ? "#10b981" : "#f59e0b" }}>{tpl ? "✓ Configured" : "Not set"}</p>
                </div>
                {et.hasPdf && <span style={{ marginLeft: "auto", fontSize: "10px", background: "#fef3c7", color: "#92400e", padding: "2px 6px", borderRadius: "4px" }}>PDF</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor */}
      <div style={{ flex: 1, overflowY: "auto" }}>
        {!selected ? (
          <div style={{ height: "300px", display: "flex", alignItems: "center", justifyContent: "center", color: "#9ca3af", border: "2px dashed #e5e7eb", borderRadius: "12px" }}>
            Select a template to edit
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <div>
                <h2 style={{ margin: "0 0 4px", fontSize: "18px", fontWeight: 700, color: "#111827" }}>{selected.name || EMAIL_TYPES.find(e => e.value === selected.type)?.label}</h2>
                {selected.tone && <Badge color="#6366f1">{selected.tone} tone</Badge>}
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <Button size="sm" variant="ghost" onClick={detectTone}>🎯 Detect Tone</Button>
                <Button size="sm" variant="ghost" onClick={improveWithAI} disabled={aiLoading}>{aiLoading ? "⟳ Working..." : "✨ AI Improve"}</Button>
                <Button size="sm" variant="ghost" onClick={loadPreview}>👁 Preview</Button>
                <Button size="sm" onClick={save}>Save</Button>
              </div>
            </div>

            <Input label="Subject Line" value={selected.subject || ""} onChange={e => setSelected(s => ({...s, subject: e.target.value}))} />
            <Textarea label="Email Body (supports {{name}}, {{date}}, {{feedback}}, {{course}}, {{mentor}}, {{task_title}}, etc.)"
              value={selected.body || ""} onChange={e => setSelected(s => ({...s, body: e.target.value}))}
              style={{ minHeight: "200px", fontFamily: "monospace", fontSize: "13px" }}
            />

            {selected.ai_suggested_body && (
              <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "10px", padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <p style={{ margin: 0, fontSize: "13px", fontWeight: 700, color: "#166534" }}>✨ AI Suggested Improvement</p>
                  <Button size="sm" variant="success" onClick={() => setSelected(s => ({...s, body: s.ai_suggested_body, ai_suggested_body: ""}))}>Apply</Button>
                </div>
                <pre style={{ fontSize: "12px", whiteSpace: "pre-wrap", color: "#166534", margin: 0 }}>{selected.ai_suggested_body}</pre>
              </div>
            )}

            {preview && (
              <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "10px", padding: "20px" }}>
                <p style={{ margin: "0 0 8px", fontSize: "13px", fontWeight: 700, color: "#374151" }}>Preview</p>
                <p style={{ margin: "0 0 12px", fontSize: "13px", fontWeight: 600, color: "#6366f1" }}>Subject: {preview.subject}</p>
                <div style={{ fontSize: "14px", color: "#374151", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: preview.body }} />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── TRIGGER PAGE ──────────────────────────────────────────────────────────
const TriggerPage = () => {
  const [mode, setMode] = useState("single");
  const [students, setStudents] = useState([]);
  const [studentId, setStudentId] = useState("");
  const [emailType, setEmailType] = useState("review_feedback");
  const [attachPdf, setAttachPdf] = useState("");
  const [statusGroup, setStatusGroup] = useState("active");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");

  useEffect(() => {
    fetchJSON("/students/?page_size=100").then(d => setStudents(d.results || d)).catch(() => {});
  }, []);

  const sendSingle = async () => {
    if (!studentId || !emailType) { toast("Select a student and email type", "error"); return; }
    setSending(true);
    try {
      const data = await fetchJSON("/emails/trigger/send_single/", {
        method: "POST",
        body: JSON.stringify({ student_id: parseInt(studentId), email_type: emailType, attach_pdf: attachPdf }),
      });
      setResult({ success: true, message: data.message, task_id: data.task_id });
      toast("Email queued successfully!");
    } catch (e) { toast("Send failed: " + e.message, "error"); }
    setSending(false);
  };

  const sendBulk = async () => {
    if (!emailType) { toast("Select an email type", "error"); return; }
    setSending(true);
    try {
      const data = await fetchJSON("/emails/trigger/send_to_status_group/", {
        method: "POST",
        body: JSON.stringify({ status: statusGroup, email_type: emailType }),
      });
      setResult({ success: true, message: data.message, count: data.count });
      toast(`Queued for ${data.count} students!`);
    } catch (e) { toast("Bulk send failed", "error"); }
    setSending(false);
  };

  const generateAIFeedback = async () => {
    if (!studentId) { toast("Select a student first", "error"); return; }
    setAiLoading(true);
    try {
      const data = await fetchJSON(`/emails/trigger/ai_feedback/${studentId}/`);
      setAiFeedback(data.feedback);
      toast("AI feedback generated!");
    } catch (e) { toast("AI feedback failed", "error"); }
    setAiLoading(false);
  };

  const selectedEmailType = EMAIL_TYPES.find(e => e.value === emailType);

  return (
    <div>
      <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 700, color: "#111827" }}>Send Emails</h1>
      <p style={{ margin: "0 0 24px", color: "#6b7280", fontSize: "14px" }}>Trigger email campaigns individually or in bulk</p>

      {/* Mode toggle */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", background: "#f3f4f6", padding: "4px", borderRadius: "10px", width: "fit-content" }}>
        {["single", "bulk"].map(m => (
          <button key={m} onClick={() => setMode(m)} style={{
            padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
            fontFamily: "inherit", fontWeight: 600, fontSize: "14px",
            background: mode === m ? "#fff" : "transparent",
            color: mode === m ? "#111827" : "#6b7280",
            boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
          }}>{m === "single" ? "👤 Single" : "👥 Bulk"}</button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Config panel */}
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px" }}>
          <h3 style={{ margin: "0 0 20px", fontSize: "16px", fontWeight: 700, color: "#111827" }}>Configuration</h3>

          {mode === "single" ? (
            <div>
              <Select label="Select Student" value={studentId} onChange={e => setStudentId(e.target.value)} options={[
                { value: "", label: "-- Choose a student --" },
                ...students.map(s => ({ value: s.id, label: `${s.name} (${s.email})` })),
              ]} />
              {studentId && (
                <div style={{ marginBottom: "16px" }}>
                  <Button size="sm" variant="ghost" onClick={generateAIFeedback} disabled={aiLoading}>
                    {aiLoading ? "⟳ Generating..." : "✨ Generate AI Feedback"}
                  </Button>
                  {aiFeedback && (
                    <div style={{ background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", padding: "12px", marginTop: "10px" }}>
                      <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "#166534" }}>AI-Generated Feedback</p>
                      <p style={{ margin: 0, fontSize: "13px", color: "#166534" }}>{aiFeedback}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <Select label="Send to Status Group" value={statusGroup} onChange={e => setStatusGroup(e.target.value)} options={[
              { value: "active", label: "Active Students" },
              { value: "on_hold", label: "On Hold" },
              { value: "selected", label: "Selected" },
              { value: "completed", label: "Completed" },
            ]} />
          )}

          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "8px" }}>Email Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {EMAIL_TYPES.map(et => (
                <button key={et.value} onClick={() => setEmailType(et.value)} style={{
                  padding: "10px", border: "1px solid",
                  borderColor: emailType === et.value ? et.color : "#e5e7eb",
                  borderRadius: "8px", background: emailType === et.value ? et.color + "15" : "#fff",
                  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                  display: "flex", alignItems: "center", gap: "8px",
                }}>
                  <span>{et.icon}</span>
                  <span style={{ fontSize: "12px", fontWeight: emailType === et.value ? 700 : 400, color: emailType === et.value ? et.color : "#374151" }}>{et.label}</span>
                  {et.hasPdf && <span style={{ marginLeft: "auto", fontSize: "9px", background: "#fef3c7", color: "#92400e", padding: "1px 5px", borderRadius: "4px" }}>PDF</span>}
                </button>
              ))}
            </div>
          </div>

          {selectedEmailType?.hasPdf && (
            <Select label="PDF Attachment" value={attachPdf} onChange={e => setAttachPdf(e.target.value)} options={[
              { value: "", label: "No attachment" },
              { value: "offer_letter", label: "Offer Letter PDF" },
              { value: "certificate", label: "Certificate PDF" },
              { value: "task_sheet", label: "Task Sheet PDF" },
            ]} />
          )}

          <Button onClick={mode === "single" ? sendSingle : sendBulk} disabled={sending} style={{ width: "100%", justifyContent: "center" }}>
            {sending ? "⟳ Sending..." : `🚀 ${mode === "single" ? "Send Email" : "Send to Group"}`}
          </Button>
        </div>

        {/* Preview / Result panel */}
        <div>
          {selectedEmailType && (
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "24px", marginBottom: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
                <div style={{ width: "40px", height: "40px", background: selectedEmailType.color + "20", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>{selectedEmailType.icon}</div>
                <div>
                  <p style={{ margin: 0, fontWeight: 700, color: "#111827" }}>{selectedEmailType.label}</p>
                  <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>{selectedEmailType.hasPdf ? "Includes PDF attachment" : "Email only"}</p>
                </div>
              </div>
              <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "12px" }}>
                <p style={{ margin: "0 0 4px", fontSize: "12px", color: "#9ca3af" }}>Available placeholders</p>
                {["{{name}}", "{{email}}", "{{course}}", "{{batch}}", "{{mentor}}", "{{date}}", "{{feedback}}", "{{review_date}}", "{{task_title}}"].map(p => (
                  <span key={p} style={{ display: "inline-block", margin: "2px", background: "#e0e7ff", color: "#3730a3", borderRadius: "4px", padding: "2px 8px", fontSize: "11px", fontFamily: "monospace" }}>{p}</span>
                ))}
              </div>
            </div>
          )}

          {result && (
            <div style={{ background: result.success ? "#f0fdf4" : "#fef2f2", border: `1px solid ${result.success ? "#86efac" : "#fca5a5"}`, borderRadius: "12px", padding: "20px" }}>
              <p style={{ margin: "0 0 8px", fontWeight: 700, color: result.success ? "#166534" : "#dc2626" }}>
                {result.success ? "✓ Email Queued!" : "✗ Failed"}
              </p>
              <p style={{ margin: "0 0 8px", fontSize: "14px", color: result.success ? "#15803d" : "#dc2626" }}>{result.message}</p>
              {result.task_id && <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af", fontFamily: "monospace" }}>Task ID: {result.task_id}</p>}
              {result.count && <p style={{ margin: 0, fontSize: "13px", color: "#166534" }}>Recipients: {result.count}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── LOGS PAGE ─────────────────────────────────────────────────────────────
const LogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/logs/?page=${page}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (typeFilter) url += `&email_type=${typeFilter}`;
      const data = await fetchJSON(url);
      setLogs(data.results || data);
      setTotal(data.count || 0);
    } catch (e) { toast("Failed to load logs", "error"); }
    setLoading(false);
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { load(); }, [load]);

  const exportCSV = () => {
    const token = localStorage.getItem("token");
    const url = `${API}/logs/export_csv/`;
    const a = document.createElement("a");
    a.href = url;
    a.download = "email_logs.csv";
    a.click();
  };

  const STATUS_BADGE = {
    sent:     "#10b981",
    failed:   "#ef4444",
    pending:  "#f59e0b",
    retrying: "#6366f1",
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 700, color: "#111827" }}>Email Logs</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>{total} total records</p>
        </div>
        <Button size="sm" variant="ghost" onClick={exportCSV}>⬇ Export CSV</Button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "#fff" }}>
          <option value="">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="pending">Pending</option>
          <option value="retrying">Retrying</option>
        </select>
        <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }} style={{ padding: "8px 12px", border: "1px solid #e5e7eb", borderRadius: "8px", fontSize: "14px", background: "#fff" }}>
          <option value="">All Types</option>
          {EMAIL_TYPES.map(et => <option key={et.value} value={et.value}>{et.label}</option>)}
        </select>
        <Button size="sm" variant="secondary" onClick={load}>↺ Refresh</Button>
      </div>

      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#f9fafb" }}>
              {["Student", "Email Type", "Status", "Subject", "Attachment", "Sent At"].map(h => (
                <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>Loading...</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>No logs found.</td></tr>
            ) : logs.map(log => {
              const et = EMAIL_TYPES.find(e => e.value === log.email_type);
              return (
                <tr key={log.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 14px" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{log.student_name}</div>
                    <div style={{ fontSize: "11px", color: "#9ca3af" }}>{log.recipient_email}</div>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>{et?.icon}</span>
                      <span style={{ color: "#374151" }}>{et?.label || log.email_type}</span>
                    </span>
                  </td>
                  <td style={{ padding: "10px 14px" }}>
                    <Badge color={STATUS_BADGE[log.status] || "#6b7280"}>{log.status}</Badge>
                    {log.retry_count > 0 && <div style={{ fontSize: "10px", color: "#9ca3af", marginTop: "2px" }}>Retries: {log.retry_count}</div>}
                  </td>
                  <td style={{ padding: "10px 14px", color: "#6b7280", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{log.subject}</td>
                  <td style={{ padding: "10px 14px", textAlign: "center" }}>{log.has_attachment ? "📎" : "—"}</td>
                  <td style={{ padding: "10px 14px", color: "#9ca3af", fontSize: "12px" }}>
                    {log.sent_at ? new Date(log.sent_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : log.status === "failed" ? <span style={{ color: "#ef4444" }}>✗ Failed</span> : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
        {page > 1 && <Button size="sm" variant="secondary" onClick={() => setPage(p => p - 1)}>← Prev</Button>}
        <span style={{ padding: "6px 14px", fontSize: "14px", color: "#6b7280" }}>Page {page}</span>
        {logs.length === 20 && <Button size="sm" variant="secondary" onClick={() => setPage(p => p + 1)}>Next →</Button>}
      </div>
    </div>
  );
};

// ─── LOGIN PAGE ───────────────────────────────────────────────────────────
const LoginPage = ({ onLogin }) => {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username || !password) { toast("Enter username and password", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/auth/token/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!res.ok) throw new Error("Invalid credentials");
      const data = await res.json();
      localStorage.setItem("token", data.access);
      toast("✓ Login successful!");
      onLogin();
    } catch (e) {
      toast("Login failed: " + e.message, "error");
    }
    setLoading(false);
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", fontFamily: "'Inter', sans-serif"
    }}>
      <div style={{
        background: "#fff", borderRadius: "16px", padding: "40px",
        width: "100%", maxWidth: "400px", boxShadow: "0 20px 60px rgba(0,0,0,0.3)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{
            width: "60px", height: "60px", background: "#6366f1", borderRadius: "12px",
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px",
            margin: "0 auto 16px"
          }}>✉</div>
          <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700, color: "#111827" }}>MailFlow</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Email Automation System</p>
        </div>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <Input
            label="Username"
            type="text"
            value={username}
            onChange={e => setUsername(e.target.value)}
            placeholder="admin"
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
          />
          <Button
            onClick={handleLogin}
            disabled={loading}
            style={{ width: "100%", justifyContent: "center", marginTop: "8px" }}
          >
            {loading ? "⟳ Logging in..." : "🔓 Login"}
          </Button>
        </form>

        <div style={{ marginTop: "24px", padding: "12px", background: "#f0fdf4", border: "1px solid #86efac", borderRadius: "8px", fontSize: "12px", color: "#166534" }}>
          <p style={{ margin: "0 0 4px", fontWeight: 600 }}>Demo Credentials</p>
          <p style={{ margin: 0 }}>Username: <strong>admin</strong></p>
          <p style={{ margin: 0 }}>Password: <strong>admin123</strong></p>
        </div>
      </div>
    </div>
  );
};

// ─── MAIN APP ──────────────────────────────────────────────────────────────
export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));
  const [page, setPage] = useState("dashboard");
  const [notifications, setNotifications] = useState(0);
  const [wsStatus, setWsStatus] = useState("connecting");
  const wsRef = useRef(null);

  if (!isLoggedIn) {
    return (
      <>
        <LoginPage onLogin={() => setIsLoggedIn(true)} />
        <Toast />
      </>
    );
  }

  // WebSocket for real-time notifications
  useEffect(() => {
    const connect = () => {
      try {
        const ws = new WebSocket(`${WS_URL}/notifications/`);
        ws.onopen = () => setWsStatus("connected");
        ws.onmessage = (e) => {
          const data = JSON.parse(e.data);
          if (!data.success) setNotifications(n => n + 1);
          toast(
            `${data.success ? "✓" : "✗"} ${data.email_type} → ${data.student_name}`,
            data.success ? "success" : "error"
          );
        };
        ws.onclose = () => { setWsStatus("disconnected"); setTimeout(connect, 5000); };
        ws.onerror = () => setWsStatus("error");
        wsRef.current = ws;
      } catch (e) {
        setWsStatus("error");
      }
    };
    connect();
    return () => wsRef.current?.close();
  }, []);

  const PAGES_MAP = {
    dashboard: DashboardPage,
    students:  StudentsPage,
    templates: TemplatesPage,
    trigger:   TriggerPage,
    logs:      LogsPage,
  };
  const PageComp = PAGES_MAP[page] || DashboardPage;

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    wsRef.current?.close();
    toast("✓ Logged out");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        @keyframes slideIn { from { transform: translateX(40px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        ::-webkit-scrollbar { width: 6px; } ::-webkit-scrollbar-track { background: #f3f4f6; } ::-webkit-scrollbar-thumb { background: #d1d5db; border-radius: 3px; }
        button:hover { filter: brightness(0.95); }
      `}</style>

      <Sidebar page={page} setPage={p => { setPage(p); if (p === "logs") setNotifications(0); }} notifications={notifications} onLogout={handleLogout} />

      <main style={{ flex: 1, padding: "32px", overflowY: "auto" }}>
        {/* WS status bar */}
        {wsStatus !== "connected" && (
          <div style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: "8px", padding: "8px 16px", marginBottom: "16px", fontSize: "13px", color: "#92400e", display: "flex", alignItems: "center", gap: "8px" }}>
            <span>⚠</span> WebSocket {wsStatus} — real-time notifications unavailable
          </div>
        )}
        <PageComp />
      </main>

      <Toast />
    </div>
  );
}
