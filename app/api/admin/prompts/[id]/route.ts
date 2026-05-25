import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { TOOLS } from "@/lib/tools-config";
import fs from "fs";
import path from "path";

async function getAdminUser(req: NextRequest) {
  const token = req.headers.get("Authorization")?.replace("Bearer ", "");
  if (!token) return null;
  const supabase = getSupabaseAdmin();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", user.id).single();
  if (!profile?.is_admin) return null;
  return user;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const toolIndex = parseInt(id, 10);
  if (!toolIndex || toolIndex < 1 || toolIndex > 6) {
    return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("prompts")
    .select("content")
    .eq("tool_index", toolIndex)
    .single();

  if (data) {
    return NextResponse.json({ content: data.content, fromDb: true });
  }

  // DB에 없으면 파일 fallback
  try {
    const filePath = path.join(process.cwd(), "prompt", `prompt${toolIndex}.txt`);
    const content = fs.readFileSync(filePath, "utf-8").trim();
    return NextResponse.json({ content, fromDb: false });
  } catch {
    return NextResponse.json({ content: "", fromDb: false });
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await getAdminUser(req);
  if (!adminUser) return NextResponse.json({ error: "권한 없음" }, { status: 403 });

  const { id } = await params;
  const toolIndex = parseInt(id, 10);
  if (!toolIndex || toolIndex < 1 || toolIndex > 6) {
    return NextResponse.json({ error: "잘못된 ID" }, { status: 400 });
  }

  const { content } = await req.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: "내용이 비어 있습니다." }, { status: 400 });
  }

  const tool = TOOLS.find((t) => t.type === id);
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("prompts").upsert(
    {
      tool_index: toolIndex,
      tool_name: tool?.name ?? `prompt${toolIndex}`,
      content: content.trim(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: "tool_index" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
