import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseAdmin } from '@/lib/supabaseAdmin'

/**
 * GET /api/admin/ai-logs
 * Fetch all AI moderation logs (admin only).
 */
export async function GET(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check admin
    const adminDb = getSupabaseAdmin()
    const { data: profile } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    // Fetch logs with user info
    const { data: logs, error } = await adminDb
      .from('ai_moderation_logs')
      .select('*, user:profiles!ai_moderation_logs_user_id_fkey(id, full_name, student_number, avatar_url, is_banned), reviewer:profiles!ai_moderation_logs_reviewed_by_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) throw error
    return NextResponse.json({ logs: logs || [] })
  } catch (err) {
    console.error('AI logs fetch error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/ai-logs
 * Admin reviews an AI moderation log entry.
 */
export async function PATCH(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminDb = getSupabaseAdmin()
    const { data: profile } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { logId, decision } = await request.json()
    if (!logId || !decision) return NextResponse.json({ error: 'Missing logId or decision' }, { status: 400 })

    const { error } = await adminDb
      .from('ai_moderation_logs')
      .update({
        admin_reviewed: true,
        admin_decision: decision,
        reviewed_by: user.id,
      })
      .eq('id', logId)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('AI log review error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

/**
 * DELETE /api/admin/ai-logs
 * Batch delete AI moderation log entries.
 */
export async function DELETE(request) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const token = authHeader.replace('Bearer ', '')
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    )
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const adminDb = getSupabaseAdmin()
    const { data: profile } = await adminDb
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ids } = await request.json()
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'Missing or empty ids array' }, { status: 400 })
    }

    const { error } = await adminDb
      .from('ai_moderation_logs')
      .delete()
      .in('id', ids)

    if (error) throw error
    return NextResponse.json({ success: true, deleted: ids.length })
  } catch (err) {
    console.error('AI log delete error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
