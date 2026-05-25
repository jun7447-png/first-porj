import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("point_wallet")
    .select("balance")
    .eq("user_id", user.id)
    .single();

  if (error) {
    // 지갑이 없는 경우 0 반환
    return NextResponse.json({ balance: 0 });
  }

  return NextResponse.json({ balance: data.balance });
}
