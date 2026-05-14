/**
 * lib/ai.js
 * ─────────────────────────────────────────────────────────────
 * Hugging Face Inference API wrapper for AI-powered content moderation.
 *
 * Models used (Free Inference API):
 *   - Image:  falconsai/nsfw_image_detection          (NSFW binary classifier)
 *   - Text:   martin-ha/toxic-comment-model           (toxic/non-toxic, 94% accuracy, English)
 *   - Text:   Local profanity list + emergency blocklist  (Tagalog/Filipino coverage)
 *
 * Design:
 *   - Server-side only (never import this from client components)
 *   - Fail-open: if HF is down or rate-limited, content is ALLOWED through
 *   - Returns structured results that callers can act on
 *   - Retries automatically when the model is cold-starting
 *   - Emergency keyword blocklist catches obvious phrases models may miss
 * ─────────────────────────────────────────────────────────────
 */

const HF_API_BASE = 'https://router.huggingface.co/hf-inference/models'
const IMAGE_MODEL = 'Falconsai/nsfw_image_detection'
const TEXT_MODEL = 'martin-ha/toxic-comment-model'   // toxic / non-toxic — 94% accuracy
// NOTE: Tagalog profanity is handled by the local profanity-list.json + emergency blocklist instead.

// Confidence thresholds
const NSFW_THRESHOLD = 0.40  // 40% — more aggressive image blocking
const TOXICITY_THRESHOLD = 0.50  // 50% — model confidence to flag (martin-ha is accurate)


// Retry config
const MAX_RETRIES = 3
const RETRY_DELAY_MS = 2000
const IMAGE_MAX_RETRIES = 5
const IMAGE_RETRY_DELAY_MS = 3000

/**
 * Emergency keyword blocklist — catches obvious harmful phrases that AI models
 * sometimes miss. Checked BEFORE the API calls (instant, no latency).
 * Keep these as lowercase substrings — case-insensitive match is applied.
 */
const EMERGENCY_BLOCK_PHRASES = [
  // Death threats & self-harm instructions
  'kill yourself', 'kys', 'go kill', 'you should die', 'i hope you die',
  'die already', 'sana mamatay', 'mamatay ka', 'patay ka na',
  'wish you were dead', 'hope you die', 'go die', 'drop dead',
  // Violence
  'i will kill you', 'i will hurt you', 'i want to hurt', 'beat you up',
  'ill kill', "i'll kill", 'gonna kill', 'going to kill',
  // Extreme insults (that bypass local profanity filter)
  'you are worthless', 'youre worthless', "you're worthless",
  'you are nothing', 'nobody likes you', 'you are a failure',
  'complete failure', 'absolute idiot', 'disgusting human',
  // Tagalog threats & hate
  'sana mamatay', 'wala kang kwenta', 'napakasama mo', 'hayop ka',
  'salot ka', 'basura ka', 'walang silbi', 'patay gutom',
]

function getApiKey() {
  const key = process.env.HUGGINGFACE_API_KEY
  if (!key) {
    console.warn('⚠️  HUGGINGFACE_API_KEY is not set. AI moderation is disabled.')
  }
  return key
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check text against the emergency keyword blocklist.
 * Returns true if the text contains a blocked phrase (case-insensitive).
 */
function checkEmergencyBlocklist(text) {
  const lower = text.toLowerCase()
  for (const phrase of EMERGENCY_BLOCK_PHRASES) {
    if (lower.includes(phrase)) {
      console.log(`🚨 Emergency blocklist hit: "${phrase}" found in message`)
      return { blocked: true, phrase }
    }
  }
  return { blocked: false, phrase: null }
}

// ─────────────────────────────────────────────────────────────
// IMAGE MODERATION
// ─────────────────────────────────────────────────────────────

/**
 * Moderate an image for NSFW content.
 * @param {Buffer|Blob|ArrayBuffer} imageData - Raw image bytes
 * @returns {Promise<{ flagged: boolean, label: string, confidence: number, raw: any }>}
 */
export async function moderateImage(imageData) {
  const apiKey = getApiKey()
  if (!apiKey) return { flagged: false, label: 'skipped', confidence: 0, raw: null }

  for (let attempt = 0; attempt <= IMAGE_MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${HF_API_BASE}/${IMAGE_MODEL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/octet-stream',
        },
        body: imageData,
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error(`AI Image HTTP ${response.status}:`, errText)
        if (response.status === 503 && attempt < IMAGE_MAX_RETRIES) {
          console.log(`Image model cold start, retry ${attempt + 1}/${IMAGE_MAX_RETRIES} in ${IMAGE_RETRY_DELAY_MS}ms`)
          await sleep(IMAGE_RETRY_DELAY_MS)
          continue
        }
        return { flagged: false, label: 'error', confidence: 0, raw: errText }
      }

      const result = await response.json()

      // Handle model loading response
      if (result.error && typeof result.error === 'string' && result.error.includes('loading')) {
        if (attempt < IMAGE_MAX_RETRIES) {
          const waitTime = result.estimated_time ? Math.min(result.estimated_time * 1000, 20000) : IMAGE_RETRY_DELAY_MS
          console.log(`Image model loading, retry ${attempt + 1}/${IMAGE_MAX_RETRIES} in ${waitTime}ms`)
          await sleep(waitTime)
          continue
        }
        return { flagged: false, label: 'loading', confidence: 0, raw: result }
      }

      // falconsai/nsfw_image_detection returns: [{ label: "nsfw"|"normal", score: 0.xx }]
      if (!Array.isArray(result) || result.length === 0) {
        console.warn('AI Image: unexpected response format', JSON.stringify(result))
        return { flagged: false, label: 'unknown', confidence: 0, raw: result }
      }

      // Find the nsfw score — could be top-level array or nested
      const scores = Array.isArray(result[0]) ? result[0] : result
      const nsfwResult = scores.find(r => r.label === 'nsfw' || r.label === 'NSFW')
      const nsfwScore = nsfwResult?.score || 0
      const flagged = nsfwScore >= NSFW_THRESHOLD

      console.log(`AI Image: nsfw=${nsfwScore.toFixed(3)}, flagged=${flagged} (threshold=${NSFW_THRESHOLD})`, JSON.stringify(scores))

      return {
        flagged,
        label: flagged ? 'nsfw' : 'normal',
        confidence: nsfwScore,
        raw: result,
      }
    } catch (err) {
      console.error(`AI Image error (attempt ${attempt + 1}):`, err.message)
      if (attempt < IMAGE_MAX_RETRIES) {
        await sleep(IMAGE_RETRY_DELAY_MS)
        continue
      }
      return { flagged: false, label: 'error', confidence: 0, raw: err.message }
    }
  }

  return { flagged: false, label: 'error', confidence: 0, raw: 'max retries exceeded' }
}

// ─────────────────────────────────────────────────────────────
// TEXT MODERATION
// ─────────────────────────────────────────────────────────────

/**
 * Moderate a text message for toxicity.
 * Step 1: Emergency keyword blocklist (instant)
 * Step 2: English model (martin-ha/toxic-comment-model) — TOXIC/NOT_TOXIC
 * Flagged if ANY step catches it.
 */
export async function moderateText(text) {
  const apiKey = getApiKey()
  if (!apiKey) return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'skipped', raw: null }

  if (!text || text.trim().length < 3) {
    return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'too_short', raw: null }
  }

  // ── Step 1: Emergency blocklist (no API call needed) ──
  const emergencyCheck = checkEmergencyBlocklist(text)
  if (emergencyCheck.blocked) {
    return {
      flagged: true,
      labels: { emergency_blocklist: 1.0 },
      maxScore: 1.0,
      maxLabel: 'emergency_blocklist',
      raw: { blocklist_phrase: emergencyCheck.phrase },
    }
  }

  // ── Step 2: Run English AI model ──
  // (Tagalog model is not supported on the new HF router — Tagalog is handled by the local profanity list)
  const englishResult = await _moderateTextEnglish(text, apiKey)

  console.log(`AI Text EN: label=${englishResult.maxLabel}, score=${englishResult.maxScore?.toFixed(3)}, flagged=${englishResult.flagged}`)

  // Flag if the English model catches it
  if (englishResult.flagged) {
    return {
      ...englishResult,
      raw: { english: englishResult.raw },
    }
  }

  // Not flagged by any layer
  return {
    flagged: false,
    labels: englishResult.labels,
    maxScore: englishResult.maxScore || 0,
    maxLabel: 'clean',
    raw: { english: englishResult.raw },
  }
}

// ─────────────────────────────────────────────────────────────
// PRIVATE: English model
// martin-ha/toxic-comment-model returns: [{ label: "TOXIC"|"NOT_TOXIC", score: 0.xx }]
// ─────────────────────────────────────────────────────────────
async function _moderateTextEnglish(text, apiKey) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch(`${HF_API_BASE}/${TEXT_MODEL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: text }),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error(`AI Text (EN) HTTP ${response.status}:`, errText)
        if (response.status === 503 && attempt < MAX_RETRIES) {
          await sleep(RETRY_DELAY_MS)
          continue
        }
        return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'error', raw: errText }
      }

      const result = await response.json()

      if (result.error && typeof result.error === 'string' && result.error.includes('loading')) {
        if (attempt < MAX_RETRIES) {
          const waitTime = result.estimated_time ? Math.min(result.estimated_time * 1000, 10000) : RETRY_DELAY_MS
          await sleep(waitTime)
          continue
        }
        return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'loading', raw: result }
      }

      // martin-ha returns: [{ label: "TOXIC", score: 0.97 }, { label: "NOT_TOXIC", score: 0.03 }]
      // or nested: [[{ label: "TOXIC", ... }]]
      const scores = Array.isArray(result[0]) ? result[0] : result
      if (!Array.isArray(scores)) {
        console.warn('AI Text (EN): unexpected format', JSON.stringify(result))
        return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'unknown', raw: result }
      }

      const labels = {}
      for (const item of scores) {
        labels[item.label] = item.score
      }

      // The model gives a direct TOXIC score — use it directly
      // New HF router returns lowercase 'toxic'/'non-toxic' instead of 'TOXIC'/'NOT_TOXIC'
      const toxicScore = labels['TOXIC'] || labels['toxic'] || 0
      const flagged = toxicScore >= TOXICITY_THRESHOLD

      return {
        flagged,
        labels,
        maxScore: toxicScore,
        maxLabel: flagged ? 'TOXIC' : 'clean',
        raw: result,
      }
    } catch (err) {
      console.error(`AI Text (EN) error (attempt ${attempt + 1}):`, err.message)
      if (attempt < MAX_RETRIES) { await sleep(RETRY_DELAY_MS); continue }
      return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'error', raw: err.message }
    }
  }
  return { flagged: false, labels: {}, maxScore: 0, maxLabel: 'error', raw: 'max retries exceeded' }
}

