import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE

let adminClient = null
if (supabaseUrl && supabaseServiceRoleKey) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey)
} else {
    console.error('Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL.')
}

export function getSupabaseAdmin() {
    if (!adminClient) {
        throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL is not configured.')
    }
    return adminClient
}
