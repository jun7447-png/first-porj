import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data: dbPrompts } = await supabase
      .from("prompts")
      .select("tool_index, content")
      .order("tool_index");

    const dbMap: Record<number, string> = {};
    (dbPrompts ?? []).forEach((p) => { dbMap[p.tool_index] = p.content; });

    const prompts = Array.from({ length: 6 }, (_, i) => {
      const toolIndex = i + 1;
      if (dbMap[toolIndex]) return dbMap[toolIndex];
      try {
        const filePath = path.join(process.cwd(), "prompt", `prompt${toolIndex}.txt`);
        return fs.readFileSync(filePath, "utf-8").trim();
      } catch {
        return "";
      }
    });

    return NextResponse.json({ prompts });
  } catch {
    return NextResponse.json(
      { error: "프롬프트를 불러올 수 없습니다." },
      { status: 500 }
    );
  }
}
