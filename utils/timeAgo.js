// utils/timeAgo.js
// Shared time-ago utility — single source of truth across the app.
// Previously duplicated in Home/page.js, items/page.js, and NotificationDropdown.js.

/**
 * Converts an ISO date string into a human-readable relative time label.
 * @param {string} dateString — ISO 8601 date (e.g. from Supabase `created_at`)
 * @returns {string} — "Just now", "5m ago", "3h ago", "Yesterday", "2d ago", "1w ago", or "Mon DD"
 */
export function getTimeAgo(dateString) {
  const now = new Date();
  const then = new Date(dateString);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHrs = Math.floor(diffMins / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
