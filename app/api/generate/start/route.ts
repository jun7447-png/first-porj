import { NextRequest, NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { SupabaseClient } from "@supabase/supabase-js";
import { generateWithOpenAI, IMAGE_MODEL_ERROR } from "@/lib/image-generator";
import { getSupabaseAdmin } from "@/lib/supabase-server";
import { IMAGE_GENERATION_POINT_COST } from "@/lib/points-config";
import fs from "fs";
import path from "path";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    // JWT에서 userId 추출 (포인트 시스템용)
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    let userId: string | null = null;

    const supabase = getSupabaseAdmin();

    if (token) {
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id ?? null;
    }

    // 포인트 잔액 확인 (userId가 있는 경우만)
    if (userId) {
      const { data: wallet } = await supabase
        .from("point_wallet")
        .select("balance")
        .eq("user_id", userId)
        .single();

      const balance = wallet?.balance ?? 0;
      if (balance < IMAGE_GENERATION_POINT_COST) {
        return NextResponse.json(
          { error: "INSUFFICIENT_POINTS", balance },
          { status: 402 }
        );
      }
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const modelImageFile = formData.get("model_image") as File | null;

    const promptB64 = formData.get("prompt_b64") as string | null;
    const promptRaw = formData.get("prompt") as string | null;
    const userEmail = (formData.get("user_email") as string | null) ?? "";
    const toolType = (formData.get("tool_type") as string | null) ?? null;
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

    const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
    const MAX_SIZE_MB = 10;
    if (!ALLOWED_TYPES.includes(imageFile.type)) {
      return NextResponse.json({ error: "JPG, PNG, WEBP 형식만 지원합니다." }, { status: 400 });
    }
    if (imageFile.size > MAX_SIZE_MB * 1024 * 1024) {
      return NextResponse.json({ error: `이미지는 ${MAX_SIZE_MB}MB 이하여야 합니다.` }, { status: 400 });
    }
    if (prompt.length > 8000) {
      return NextResponse.json({ error: "프롬프트가 너무 깁니다." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ fallback: true });
    }

    // formData에서 userId 재사용 (토큰 없는 경우 폴백)
    if (!userId) {
      const formUserId = formData.get("user_id") as string | null;
      if (formUserId) userId = formUserId;
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = imageFile.type || "image/jpeg";
    const fileName = imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.jpg";

    // 두 번째 이미지(모델샷): 업로드 없으면 model1.png 자동 사용
    let buffer2: Buffer | undefined;
    let mimeType2: string | undefined;
    let fileName2: string | undefined;

    if (toolType === "6") {
      if (modelImageFile) {
        const bytes2 = await modelImageFile.arrayBuffer();
        buffer2 = Buffer.from(bytes2);
        mimeType2 = modelImageFile.type || "image/jpeg";
        fileName2 = modelImageFile.name.replace(/[^\x00-\x7F]/g, "") || "model.jpg";
      } else {
        const defaultPath = path.join(process.cwd(), "prompt", "model1.png");
        buffer2 = fs.readFileSync(defaultPath);
        mimeType2 = "image/png";
        fileName2 = "model1.png";
      }
    }

    const { data: job, error: insertErr } = await supabase
      .from("image_jobs")
      .insert({ status: "pending", user_email: userEmail || null, user_id: userId || null, tool_type: toolType })
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

    waitUntil(processJob(jobId, buffer, mimeType, fileName, prompt, buffer2, mimeType2, fileName2, userId ?? undefined));

    return NextResponse.json({ jobId });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "요청 처리 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

async function uploadBase64ToStorage(
  supabase: SupabaseClient,
  jobId: string,
  dataUrl: string
): Promise<string> {
  const mimeMatch = dataUrl.match(/^data:(image\/\w+);base64,/);
  const mime = mimeMatch?.[1] ?? "image/jpeg";
  const ext = mime === "image/png" ? "png" : mime === "image/webp" ? "webp" : "jpg";
  const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  const imageBuffer = Buffer.from(base64, "base64");
  const storagePath = `public/${jobId}.${ext}`;

  const { error } = await supabase.storage
    .from("generated-images")
    .upload(storagePath, imageBuffer, { contentType: mime, upsert: false });

  if (error) throw error;

  const { data } = supabase.storage
    .from("generated-images")
    .getPublicUrl(storagePath);

  return data.publicUrl;
}

async function processJob(
  jobId: string,
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  prompt: string,
  buffer2?: Buffer,
  mimeType2?: string,
  fileName2?: string,
  userId?: string
) {
  const supabase = getSupabaseAdmin();
  try {
    await supabase
      .from("image_jobs")
      .update({ status: "processing" })
      .eq("id", jobId);

    const imageResult = await generateWithOpenAI(
      buffer, mimeType, fileName, prompt,
      buffer2, mimeType2, fileName2
    );

    const imageUrl = imageResult.startsWith("data:")
      ? await uploadBase64ToStorage(supabase, jobId, imageResult)
      : imageResult;

    await supabase
      .from("image_jobs")
      .update({ status: "done", image_url: imageUrl })
      .eq("id", jobId);

    // 이미지 정상 생성 완료 후에만 포인트 차감
    if (userId) {
      await supabase.rpc("deduct_points", {
        p_user_id: userId,
        p_amount: IMAGE_GENERATION_POINT_COST,
      });
    }
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : IMAGE_MODEL_ERROR;
    await supabase
      .from("image_jobs")
      .update({ status: "error", error_text: errMsg })
      .eq("id", jobId);
    // 실패 시 포인트 차감 없음
  }
}
