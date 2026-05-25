import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { MIN_CHARGE_AMOUNT } from "@/lib/points-config";

export async function POST(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) {
    return NextResponse.json({ error: "인증 필요" }, { status: 401 });
  }

  const supabase = getSupabaseAdmin();

  // 관리자 인증
  const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !user) {
    return NextResponse.json({ error: "인증 실패" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const body = await req.json();
  const { targetUserId, amount, targetEmail } = body as {
    targetUserId: string;
    amount: number;
    targetEmail: string;
  };

  if (!targetUserId || !amount) {
    return NextResponse.json({ error: "필수 파라미터 누락" }, { status: 400 });
  }

  if (amount < MIN_CHARGE_AMOUNT) {
    return NextResponse.json(
      { error: `최소 충전 포인트는 ${MIN_CHARGE_AMOUNT.toLocaleString()}P입니다.` },
      { status: 400 }
    );
  }

  const { data: newBalance, error: rpcErr } = await supabase.rpc("admin_charge_points", {
    p_target_user_id: targetUserId,
    p_amount: amount,
    p_admin_id: user.id,
  });

  if (rpcErr) {
    return NextResponse.json({ error: rpcErr.message }, { status: 500 });
  }

  const message = `${targetEmail}님에게 ${amount.toLocaleString()}P 충전되었습니다. 현재 잔액: ${(newBalance as number).toLocaleString()}P`;

  return NextResponse.json({ newBalance, message });
}
