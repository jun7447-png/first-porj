import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { createClient } from "@supabase/supabase-js";
import { generateWithOpenAI } from "@/lib/image-generator";

export const maxDuration = 300;

// 서버 측 Supabase 클라이언트 (서비스 컨텍스트)
function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    // base64 디코딩 (한글 프롬프트 ByteString 우회)
    const promptB64 = formData.get("prompt_b64") as string | null;
    const promptRaw = formData.get("prompt") as string | null;
    const prompt: string | null = promptB64
      ? new TextDecoder("utf-8").decode(
          Uint8Array.from(atob(promptB64), (c) => c.charCodeAt(0))
        )
      : promptRaw;

    if (!imageFile || !prompt) {
      return NextResponse.json(
        { error: "이미지와 프롬프트가 필요합니다." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ fallback: true });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = imageFile.type || "image/jpeg";
    const fileName =
      imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.jpg";

    // Supabase에 job 레코드 생성
    const supabase = getSupabase();
    const { data: job, error: insertErr } = await supabase
      .from("image_jobs")
      .insert({ status: "pending" })
      .select("id")
      .single();

    if (insertErr || !job) {
      const isTableMissing =
        insertErr?.message?.includes("image_jobs") ||
        insertErr?.message?.includes("schema cache") ||
        insertErr?.code === "42P01";

      const errMsg = isTableMissing
        ? "Supabase image_jobs 테이블이 없습니다. 대시보드 SQL Editor에서 테이블을 먼저 생성해 주세요."
        : "작업 생성 실패: " + (insertErr?.message ?? "unknown");

      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const jobId = job.id as string;

    // waitUntil: 응답 반환 후 백그라운드에서 계속 실행
    waitUntil(processJob(jobId, buffer, mimeType, fileName, prompt));

    // 즉시 jobId 반환 → 클라이언트는 폴링 시작
    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "요청 처리 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function processJob(
  jobId: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  prompt: string
) {
  const supabase = getSupabase();
  try {
    await supabase
      .from("image_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    const imageUrl = await generateWithOpenAI(buffer, mimeType, fileName, prompt);

    await supabase
      .from("image_jobs")
      .update({ status: "done", image_url: imageUrl })
      .eq("id", jobId);
  } catch (e) {
    const errorText = e instanceof Error ? e.message : "이미지 생성 실패";
    await supabase
      .from("image_jobs")
      .update({ status: "error", error_text: errorText })
      .eq("id", jobId);
  }
}
