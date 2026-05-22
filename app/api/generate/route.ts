import { NextRequest, NextResponse } from "next/server";
import { IMAGE_MODEL_ERROR, resolvePromptVariables } from "@/lib/image-generator";

export const maxDuration = 300;

const MODEL_ALERT = IMAGE_MODEL_ERROR;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

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
      return NextResponse.json({ error: MODEL_ALERT }, { status: 500 });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const resolvedPrompt = resolvePromptVariables(prompt);

    // openai/gpt-image-2 — images/edits (참조 이미지 직접 전달)
    const safeName = imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.png";
    const boundary = `SnapPage${Date.now()}${Math.random().toString(36).slice(2)}`;
    const encoder = new TextEncoder();

    const parts: Buffer[] = [
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="image"; filename="${safeName}"\r\nContent-Type: ${imageFile.type || "image/png"}\r\n\r\n`
      ),
      buffer,
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n`),
      Buffer.from(encoder.encode(resolvedPrompt)),
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-2`),
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`),
      Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1024x1024`),
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ];

    const oaRes = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`,
      },
      body: new Blob([Buffer.concat(parts)], { type: "application/octet-stream" }),
    });

    if (!oaRes.ok) {
      return NextResponse.json({ error: MODEL_ALERT }, { status: 500 });
    }

    const oaData = await oaRes.json();
    const imageUrl =
      (oaData.data?.[0]?.url as string | undefined) ||
      (oaData.data?.[0]?.b64_json
        ? `data:image/png;base64,${oaData.data[0].b64_json}`
        : undefined);

    if (imageUrl) return NextResponse.json({ imageUrl });

    return NextResponse.json({ error: MODEL_ALERT }, { status: 500 });
  } catch {
    return NextResponse.json({ error: MODEL_ALERT }, { status: 500 });
  }
}
