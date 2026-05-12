import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { moderateImage } from '@/lib/ai'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * POST /api/ai/moderate-image
 *
 * Accepts a multipart FormData with an "image" field.
 * Sends the image to the Hugging Face NSFW detection model.
 * Logs the result to the ai_moderation_logs table.
 *
 * Auth: Optional JWT (Bearer token). If provided, logs user_id.
 *       If not provided (e.g. signup flow), still runs moderation but logs without user_id.
 * Returns: { flagged, label, confidence }
 */
export async function POST(request) {
  try {
    // ─── Optional Auth check ───
    let userId = null
    const authHeader = request.headers.get('Authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.replace('Bearer ', '')
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
        const { data: { user } } = await userClient.auth.getUser()
        if (user) userId = user.id
      } catch (authErr) {
        // Auth failed but we still run moderation — just won't log user_id
        console.warn('AI moderate-image: auth check failed, proceeding without user_id')
      }
    }

    // ─── Parse image from FormData ───
    const formData = await request.formData()
    const imageFile = formData.get('image')

    if (!imageFile || typeof imageFile === 'string') {
      return NextResponse.json({ error: 'No image file provided' }, { status: 400 })
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer())

    // ─── Run AI moderation ───
    const result = await moderateImage(imageBuffer)

    // ─── Log to ai_moderation_logs (fire-and-forget) ───
    try {
      const contentType = formData.get('content_type') || 'image'
      const adminClient = getSupabaseAdmin()
      const logEntry = {
        content_type: contentType,
        ai_model: 'Falconsai/nsfw_image_detection',
        ai_result: result.raw || {},
        flagged: result.flagged,
        action_taken: result.flagged ? 'flagged_for_review' : 'none',
      }
      if (userId) logEntry.user_id = userId
      const { error: insertErr } = await adminClient.from('ai_moderation_logs').insert(logEntry)
      if (insertErr) {
        console.error('AI Image log DB insert error:', insertErr.message, insertErr.details)
      } else {
        console.log('AI Image log saved (flagged:', result.flagged, ', confidence:', result.confidence?.toFixed(3), ')')
      }
    } catch (logErr) {
      // Don't fail the request if logging fails
      console.error('AI Image log insert error:', logErr.message)
    }

    return NextResponse.json({
      flagged: result.flagged,
      label: result.label,
      confidence: result.confidence,
    })
  } catch (err) {
    console.error('POST /api/ai/moderate-image error:', err)
    // Fail-open: return not-flagged so the user isn't blocked
    return NextResponse.json({
      flagged: false,
      label: 'error',
      confidence: 0,
    })
  }
}
