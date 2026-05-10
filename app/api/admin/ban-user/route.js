import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { sendBanNotification, sendUnbanNotification } from "@/lib/mailer";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// POST /api/admin/ban-user
// Body: { targetUserId, action: 'ban' | 'unban', reason? }
export async function POST(req) {
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

  const { targetUserId, action, reason } = await req.json();
  if (!targetUserId || !action) {
    return NextResponse.json({ error: "Missing targetUserId or action" }, { status: 400 });
  }

  // Fetch target user profile for email notification
  const { data: targetUser } = await supabaseAdmin
    .from("profiles")
    .select("email, full_name")
    .eq("id", targetUserId)
    .maybeSingle();

  if (action === "ban") {
    const banReason = reason || "Violated community guidelines.";
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({
        is_banned: true,
        ban_reason: banReason,
        banned_at: new Date().toISOString(),
      })
      .eq("id", targetUserId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send ban notification email
    let emailSent = false;
    if (targetUser?.email) {
      const emailResult = await sendBanNotification(targetUser.email, targetUser.full_name, banReason);
      emailSent = emailResult?.success || false;
    }

    return NextResponse.json({ success: true, action: "banned", emailSent });
  }

  if (action === "unban") {
    const unbanReason = reason || "Unbanned by admin";
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ is_banned: false, ban_reason: null, banned_at: null })
      .eq("id", targetUserId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Send unban notification email
    let emailSent = false;
    if (targetUser?.email) {
      const emailResult = await sendUnbanNotification(targetUser.email, targetUser.full_name, unbanReason);
      emailSent = emailResult?.success || false;
    }

    return NextResponse.json({ success: true, action: "unbanned", emailSent });
  }

  return NextResponse.json({ error: "Invalid action. Use 'ban' or 'unban'." }, { status: 400 });
}
