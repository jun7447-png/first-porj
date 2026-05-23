import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 60;

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data, error } = await supabase.rpc("get_preview_images");

  if (error) {
    return NextResponse.json({ previews: {} });
  }

  const previews: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.tool_type && row.image_url) {
      previews[row.tool_type] = row.image_url;
    }
  }

  return NextResponse.json({ previews });
}
