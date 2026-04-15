/**
 * Constants — Email types, colors, and configuration
 * Keep all magic values here for easy updates
 */

export const EMAIL_TYPES = [
  { value: "review_feedback", label: "Review Feedback", icon: "📋", color: "#6366f1" },
  { value: "weekly_schedule", label: "Weekly Schedule", icon: "📅", color: "#0ea5e9" },
  { value: "offer_letter",    label: "Offer Letter",    icon: "📄", color: "#10b981", hasPdf: true },
  { value: "certificate",     label: "Certificate",     icon: "🏆", color: "#f59e0b", hasPdf: true },
  { value: "first_review",    label: "First Review",    icon: "🔍", color: "#8b5cf6" },
  { value: "task_allocation", label: "Task Allocation", icon: "📌", color: "#f97316", hasPdf: true },
  { value: "review_reminder", label: "Review Reminder", icon: "⏰", color: "#ec4899" },
  { value: "hold",            label: "Hold Mail",       icon: "⏸️", color: "#6b7280" },
];

export const STATUS_COLORS = {
  active:    "#10b981",
  on_hold:   "#f59e0b",
  selected:  "#6366f1",
  rejected:  "#ef4444",
  completed: "#0ea5e9",
};

export const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:8000/ws";

export const EMAIL_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  FAILED: "failed",
};
