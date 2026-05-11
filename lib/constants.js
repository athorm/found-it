/**
 * lib/constants.js
 * ─────────────────────────────────────────────────────────────────────────────
 * SINGLE SOURCE OF TRUTH for all shared app-wide constants.
 *
 * ✏️  HOW TO ADD A NEW LOCATION OR CATEGORY:
 *   1. Add to CAMPUS_LOCATIONS or ITEM_CATEGORIES below.
 *   2. That's it — all pages will pick it up automatically.
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Campus Locations ────────────────────────────────────────────────────────
export const CAMPUS_LOCATIONS = [
  'Shed',
  'Activity Center',
  'ER Bldg.',
  'ENB Bldg.',
  'Volleyball Court',
  'Basketball Court',
  'Admin Bldg.',
  'Quadrangle',
];

export const CAMPUS_LOCATIONS_WITH_ALL = ['All', ...CAMPUS_LOCATIONS];

export const CAMPUS_LOCATION_OPTIONS = CAMPUS_LOCATIONS.map((loc) => ({
  label: loc,
  value: loc,
}));

// ─── Item Categories ────────────────────────────────────────────────────────
export const ITEM_CATEGORIES = [
  { label: "Electronics", value: "Electronics", emoji: "📱" },
  { label: "Wallets", value: "Wallets", emoji: "👛" },
  { label: "IDs & Cards", value: "IDs & Cards", emoji: "🪪" },
  { label: "School Supplies", value: "School Supplies", emoji: "📚" },
  { label: "Keys", value: "Keys", emoji: "🔑" },
  { label: "Books", value: "Books", emoji: "📖" },
  { label: "Clothing", value: "Clothing", emoji: "👕" },
  { label: "Bags", value: "Bags", emoji: "🎒" },
  { label: "Accessories", value: "Accessories", emoji: "⌚" },
  { label: "Documents", value: "Documents", emoji: "📄" },
  { label: "Other", value: "Other", emoji: "📦" },
];

// Emoji map for quick lookup by value
export const CATEGORY_EMOJI = {
  Electronics: "📱", Wallets: "👛", "IDs & Cards": "🪪",
  "School Supplies": "📚", Keys: "🔑", Books: "📖",
  Clothing: "👕", Bags: "🎒", Accessories: "⌚",
  Documents: "📄", Other: "📦",
};
