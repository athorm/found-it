// utils/profanityFilter.js
// Loads the profanity word list once and checks text for inappropriate content.
// Uses word-boundary matching AND substring matching for Filipino slang.

let cachedWords = null;
let cachedSubstrings = null;

/**
 * Loads and caches the profanity word list from /profanity-list.json.
 * @returns {Promise<{ words: string[], substrings: string[] }>}
 */
export async function loadProfanityList() {
  if (cachedWords && cachedSubstrings) return { words: cachedWords, substrings: cachedSubstrings };
  try {
    const res = await fetch("/profanity-list.json");
    const data = await res.json();
    cachedWords = (data.words || []).map((w) => w.toLowerCase());
    cachedSubstrings = (data.substrings || []).map((w) => w.toLowerCase());
    return { words: cachedWords, substrings: cachedSubstrings };
  } catch (err) {
    console.error("Failed to load profanity list:", err);
    return { words: [], substrings: [] };
  }
}

/**
 * Checks if the given text contains any profane words.
 * Uses two strategies:
 *   1. Word-boundary regex for exact word matches (avoids "class" matching "ass")
 *   2. Substring matching for Filipino concatenated slang (catches "tanginamo", "putanginamo")
 *
 * @param {string} text - The message text to check
 * @returns {Promise<{ isClean: boolean, flaggedWord: string | null }>}
 */
export async function containsProfanity(text) {
  const { words, substrings } = await loadProfanityList();
  if (!words.length && !substrings.length) return { isClean: true, flaggedWord: null };

  const normalized = text.toLowerCase();

  // Strategy 1: Word-boundary matching (English words, standalone Filipino words)
  for (const word of words) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escaped}\\b`, "i");
    if (regex.test(normalized)) {
      return { isClean: false, flaggedWord: word };
    }
  }

  // Strategy 2: Substring matching (Filipino concatenated slang like "tanginamo")
  // Remove spaces, special chars to catch attempts at evasion like "t a n g i n a"
  const stripped = normalized.replace(/[\s._\-*]/g, '');
  for (const sub of substrings) {
    if (stripped.includes(sub)) {
      return { isClean: false, flaggedWord: sub };
    }
  }

  return { isClean: true, flaggedWord: null };
}
