import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { moderateText } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/ai/moderate-text
 *
 * Accepts JSON: { text: string }
 * Sends the text to the Hugging Face toxic-bert model.
 * Logs the result to the ai_moderation_logs table.
 *
 * Auth: Requires valid JWT (Bearer token).
 * Returns: { flagged, maxLabel, maxScore }
 */
export async function POST(request) {
  try {
    // ─── Auth check ───
    const authHeader = request.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ─── Parse text ───
    const body = await request.json()
    const { text } = body

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required' }, { status: 400 })
    }

    // ─── Run AI moderation ───
    const result = await moderateText(text)

    // ─── Log to ai_moderation_logs ───
    // Skip trivially short / API-error cases, but log everything else
    const skipLabels = ['too_short', 'skipped', 'error', 'loading']
    console.log(`AI Text result: maxLabel=${result.maxLabel}, maxScore=${result.maxScore?.toFixed(3)}, flagged=${result.flagged}`)

    if (!skipLabels.includes(result.maxLabel)) {
      try {
        const adminClient = getSupabaseAdmin()
        let modelName
        if (result.maxLabel === 'emergency_blocklist') {
          modelName = 'emergency-keyword-blocklist'
        } else if (result.maxLabel === 'tagalog_hatespeech') {
          modelName = 'ggpt1006/tl-hatespeech-detection'
        } else {
          modelName = 'martin-ha/toxic-comment-model + ggpt1006/tl-hatespeech-detection'
        }

        const { error: insertErr } = await adminClient.from('ai_moderation_logs').insert({
          content_type: 'message',
          user_id: user.id,
          ai_model: modelName,
          ai_result: result.raw || {},
          flagged: result.flagged,
          action_taken: result.flagged ? 'blocked' : 'none',
        })
        if (insertErr) {
          console.error('AI log DB insert error:', insertErr.message, insertErr.details)
        } else {
          console.log('AI log saved (flagged:', result.flagged, ')')
        }
      } catch (logErr) {
        console.error('AI log insert error:', logErr.message)
      }
    } else {
      console.log('AI Text skipped logging (label:', result.maxLabel, ')')
    }

    return NextResponse.json({
      flagged: result.flagged,
      maxLabel: result.maxLabel,
      maxScore: result.maxScore,
    })
  } catch (err) {
    console.error('POST /api/ai/moderate-text error:', err)
    // Fail-open: return not-flagged so the user isn't blocked
    return NextResponse.json({
      flagged: false,
      maxLabel: 'error',
      maxScore: 0,
    })
  }
}
