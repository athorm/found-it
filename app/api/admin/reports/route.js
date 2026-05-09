import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

// Admin Supabase client — bypasses RLS
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// GET /api/admin/reports — fetch all reports with context
export async function GET(req) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Verify admin
  const token = auth.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Fetch all reports with reporter + reported user profiles
  const { data: reports, error } = await supabaseAdmin
    .from("reports")
    .select(`
      id, reason, status, admin_notes, created_at, reviewed_at, chat_id,
      reporter:reporter_id ( id, full_name, student_number, avatar_url ),
      reported_user:reported_user_id ( id, full_name, student_number, avatar_url, is_banned ),
      reviewer:reviewed_by ( id, full_name )
    `)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Attach recent messages from the reported chat for context
  const enriched = await Promise.all(
    (reports || []).map(async (report) => {
      if (!report.chat_id) return { ...report, chatMessages: [] };
      const { data: messages } = await supabaseAdmin
        .from("messages")
        .select("id, content, sender_id, created_at")
        .eq("chat_id", report.chat_id)
        .order("created_at", { ascending: false })
        .limit(20);
      return { ...report, chatMessages: (messages || []).reverse() };
    })
  );

  return NextResponse.json({ reports: enriched });
}

// PATCH /api/admin/reports — update report status (valid/dismissed) and optionally ban user
export async function PATCH(req) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = auth.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { reportId, status, adminNotes, banUser, banReason } = await req.json();
  if (!reportId || !status) {
    return NextResponse.json({ error: "Missing reportId or status" }, { status: 400 });
  }

  // Determine the actual status to store — 'valid_ban' distinguishes valid+banned from valid-only
  const resolvedStatus = (status === 'valid' && banUser) ? 'valid_ban' : status;

  // Update the report record
  const { error: updateErr } = await supabaseAdmin
    .from("reports")
    .update({
      status: resolvedStatus,
      admin_notes: adminNotes || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  // If banning, update the reported user's profile
  if (resolvedStatus === "valid_ban") {
    const { data: report } = await supabaseAdmin
      .from("reports")
      .select("reported_user_id")
      .eq("id", reportId)
      .maybeSingle();

    if (report?.reported_user_id) {
      await supabaseAdmin
        .from("profiles")
        .update({
          is_banned: true,
          ban_reason: banReason || "Violated community guidelines.",
          banned_at: new Date().toISOString(),
        })
        .eq("id", report.reported_user_id);
    }
  }

  return NextResponse.json({ success: true });
}

// DELETE /api/admin/reports — permanently delete report(s)
// Supports single (?id=xxx) or batch (body: { ids: [...] })
export async function DELETE(req) {
  const auth = req.headers.get("authorization");
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = auth.replace("Bearer ", "");
  const { data: { user }, error: authErr } = await supabaseAdmin.auth.getUser(token);
  if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Support single via query param or batch via body
  const { searchParams } = new URL(req.url);
  const singleId = searchParams.get('id');

  let ids = [];
  if (singleId) {
    ids = [singleId];
  } else {
    try {
      const body = await req.json();
      ids = body.ids || [];
    } catch { /* no body */ }
  }

  if (ids.length === 0) {
    return NextResponse.json({ error: "Missing report ID(s)" }, { status: 400 });
  }

  const { error: deleteErr } = await supabaseAdmin
    .from("reports")
    .delete()
    .in("id", ids);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  return NextResponse.json({ success: true, deleted: ids.length });
}
