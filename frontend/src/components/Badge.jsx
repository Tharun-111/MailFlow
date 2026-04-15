/**
 * Badge Component — Small status/tag badges
 */

export default function Badge({ children, color = "#6366f1" }) {
  return (
    <span style={{
      background: color + "20",
      color,
      border: `1px solid ${color}40`,
      borderRadius: "999px",
      padding: "2px 10px",
      fontSize: "11px",
      fontWeight: "600",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
    }}>
      {children}
    </span>
  );
}
