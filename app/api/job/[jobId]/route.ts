import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data, error } = await supabase
    .from("image_jobs")
    .select("status, image_url, error_text")
    .eq("id", jobId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "작업을 찾을 수 없습니다." },
      { status: 404 }
    );
  }

  return NextResponse.json({
    status: data.status,           // pending | processing | done | error
    imageUrl: data.image_url,
    error: data.error_text,
  });
}
