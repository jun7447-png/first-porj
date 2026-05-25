import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";

const PAGE_SIZE = 20;

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;

  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) return null;
  return user;
}

export async function GET(req: NextRequest) {
  const adminUser = await getAdminUser(req);
  if (!adminUser) {
    return NextResponse.json({ error: "권한 없음" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const search = (searchParams.get("search") ?? "").trim();

  const supabase = getSupabaseAdmin();
  const offset = (page - 1) * PAGE_SIZE;

  // 검색 조건 구성
  let query = supabase
    .from("profiles")
    .select("id, email, created_at, is_admin", { count: "exact" });

  if (search) {
    query = query.or(`email.ilike.%${search}%,id::text.ilike.%${search}%`);
  }

  const { data: profiles, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // point_wallet 잔액 조인
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: wallets } = await supabase
    .from("point_wallet")
    .select("user_id, balance")
    .in("user_id", userIds.length > 0 ? userIds : ["00000000-0000-0000-0000-000000000000"]);

  const walletMap = Object.fromEntries(
    (wallets ?? []).map((w) => [w.user_id, w.balance])
  );

  const users = (profiles ?? []).map((p, idx) => ({
    no: offset + idx + 1,
    id: p.id,
    email: p.email,
    balance: walletMap[p.id] ?? 0,
    createdAt: p.created_at,
    isAdmin: p.is_admin,
  }));

  return NextResponse.json({ users, total: count ?? 0, page, pageSize: PAGE_SIZE });
}
