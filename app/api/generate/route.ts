import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

/** UTF-8 한글 등 멀티바이트 문자가 포함된 body를 안전하게 전송 */
function jsonBody(obj: unknown): Blob {
  return new Blob([JSON.stringify(obj)], { type: "application/json" });
}

function openRouterHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
    "HTTP-Referer":
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://first-porj.vercel.app",
    "X-Title": "SnapPage",
    "Content-Type": "application/json",
  };
}

/** Pollinations.ai 무료 이미지 생성 (API 키 불필요) */
async function generateWithPollinations(prompt: string): Promise<string> {
  const safePrompt = prompt.slice(0, 1500);
  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(50000) });
  if (!res.ok) throw new Error(`Pollinations 오류: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/**
 * 한글 포함 프롬프트를 안전하게 처리하는 UTF-8 멀티파트 바디 생성
 *
 * 배경:
 *   Node.js undici(fetch 구현체)의 FormData는 문자열 값을 ByteString으로
 *   검증한다. 한글(non-Latin1) 문자가 있으면 "character at index N has
 *   a value > 255" 오류가 발생한다.
 *
 * 해결:
 *   FormData 대신 Buffer를 직접 구성하여 프롬프트를 UTF-8 바이트로 인코딩.
 *   undici는 Buffer body에 대해 ByteString 검증을 수행하지 않는다.
 */
function buildMultipartBody(
  imageBuffer: Buffer,
  imageMime: string,
  imageFilename: string,
  prompt: string,
  model = "gpt-image-1",
  size = "1024x1024"
): { body: Blob; contentType: string } {
  const boundary = `SnapPage${Date.now()}${Math.random().toString(36).slice(2)}`;
  const encoder = new TextEncoder();

  const parts: Buffer[] = [
    // ── image ──────────────────────────────────────────────────────────────
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="image"; filename="${imageFilename}"\r\n` +
        `Content-Type: ${imageMime}\r\n\r\n`
    ),
    imageBuffer,
    // ── prompt (UTF-8 바이트) ──────────────────────────────────────────────
    Buffer.from(`\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n`),
    Buffer.from(encoder.encode(prompt)),
    // ── model ──────────────────────────────────────────────────────────────
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\n${model}`
    ),
    // ── n ──────────────────────────────────────────────────────────────────
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`
    ),
    // ── size ───────────────────────────────────────────────────────────────
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n${size}`
    ),
    // ── 종료 ───────────────────────────────────────────────────────────────
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];

  return {
    body: new Blob([Buffer.concat(parts)], { type: "application/octet-stream" }),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

/** prompt 파일의 미치환 템플릿 변수를 실제 값으로 교체 */
function resolvePromptVariables(prompt: string): string {
  return prompt
    .replace(/\[LANGUAGE\]/g, "Korean")
    .replace(/\[OBJECT_CATEGORY\]/g, "product")
    .replace(/\[OBJECT_VIEW\]/g, "best view for the product")
    .replace(/\[OBJECT_STATE\]/g, "most useful state")
    .replace(/\[INFOGRAPHIC_GOAL\]/g, "HOW_TO_USE")
    .replace(/\[\{argument[^\}]*\}\]/g, "")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;

    // base64 인코딩 프롬프트 우선 사용 (ByteString 오류 방지 목적)
    // 클라이언트가 한글을 UTF-8 → base64 변환해 전송, 서버에서 역변환
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

    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const hasOpenAI = !!process.env.OPENAI_API_KEY;

    if (!hasOpenRouter && !hasOpenAI) {
      return NextResponse.json({ fallback: true });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── OpenAI gpt-image-1 ────────────────────────────────────────────────
    if (hasOpenAI) {
      // 1. 템플릿 변수 치환 (prompt5.txt 등)
      const resolvedPrompt = resolvePromptVariables(prompt);

      // 2. 파일명 ASCII 정규화
      const safeName =
        imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.png";

      // 3. UTF-8 멀티파트 바디 직접 구성 → 한글 포함 프롬프트 안전 전송
      const { body, contentType } = buildMultipartBody(
        buffer,
        imageFile.type || "image/png",
        safeName,
        resolvedPrompt
      );

      const oaRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
          "Content-Type": contentType,
        },
        body,
      });

      if (!oaRes.ok) {
        const errText = await oaRes.text();
        return NextResponse.json(
          { error: `이미지 생성 실패 (${oaRes.status}): ${errText.slice(0, 400)}` },
          { status: 500 }
        );
      }

      const oaData = await oaRes.json();
      const b64 = oaData.data?.[0]?.b64_json as string | undefined;

      if (b64) {
        return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
      }

      // b64_json 없으면 url 시도
      const remoteUrl = oaData.data?.[0]?.url as string | undefined;
      if (remoteUrl) {
        const fetched = await fetch(remoteUrl);
        const imgBuf = Buffer.from(await fetched.arrayBuffer());
        const imgMime = fetched.headers.get("content-type") ?? "image/png";
        return NextResponse.json({
          imageUrl: `data:${imgMime};base64,${imgBuf.toString("base64")}`,
        });
      }

      return NextResponse.json(
        { error: "이미지 데이터를 받지 못했습니다." },
        { status: 500 }
      );
    }

    // ── OpenRouter: GPT-4o Vision 분석 → Pollinations.ai 이미지 생성 ────────
    if (hasOpenRouter) {
      let productDescription = "";
      try {
        const base64 = buffer.toString("base64");
        const mimeType = imageFile.type || "image/jpeg";

        const visionRes = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: openRouterHeaders(),
            body: jsonBody({
              model: "openai/gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image_url",
                      image_url: { url: `data:${mimeType};base64,${base64}` },
                    },
                    {
                      type: "text",
                      text: "Describe this product precisely for AI image generation: shape, color, material, texture, and key features. Keep it to 2-3 sentences in English.",
                    },
                  ],
                },
              ],
              max_tokens: 200,
            }),
          }
        );

        if (visionRes.ok) {
          const visionData = await visionRes.json();
          productDescription =
            visionData.choices?.[0]?.message?.content?.trim() ?? "";
        }
      } catch {
        // 분석 실패 시 원본 프롬프트만으로 계속 진행
      }

      const truncatedPrompt =
        prompt.length > 1000 ? prompt.slice(0, 1000) + "..." : prompt;
      const finalPrompt = productDescription
        ? `${productDescription}. ${truncatedPrompt}`
        : truncatedPrompt;

      try {
        const imageUrl = await generateWithPollinations(finalPrompt);
        return NextResponse.json({ imageUrl });
      } catch (err) {
        const errMsg =
          err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }
    }

    return NextResponse.json({ fallback: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
