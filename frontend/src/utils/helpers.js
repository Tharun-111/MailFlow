/**
 * Helper Functions — Utility functions for component logic
 */

export const formatDate = (date) => {
  if (typeof date === "string") date = new Date(date);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

export const formatTime = (date) => {
  if (typeof date === "string") date = new Date(date);
  return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
};

export const truncate = (str, len = 50) => str && str.length > len ? str.slice(0, len) + "..." : str;

export const getStatusColor = (status, colorMap) => colorMap[status] || "#6b7280";

export const isEmpty = (obj) => Object.keys(obj).length === 0;

export const parseJWT = (token) => {
  try {
    return JSON.parse(atob(token.split(".")[1]));
  } catch {
    return null;
  }
};
