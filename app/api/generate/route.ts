import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 300; // Pro: 최대 300초, Hobby: 10초 고정

/** UTF-8/한글 포함 body를 Blob으로 안전하게 전송 (ByteString 검증 우회) */
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

function openAIHeaders(): HeadersInit {
  return {
    Authorization: `Bearer ${process.env.OPENAI_API_KEY ?? ""}`,
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

    // 클라이언트가 한글을 UTF-8 → base64로 변환해 전송, 서버에서 역변환
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

    const hasOpenAI = !!process.env.OPENAI_API_KEY;
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;

    if (!hasOpenAI && !hasOpenRouter) {
      return NextResponse.json({ fallback: true });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── OpenAI gpt-image-2 (images/edits — 참조 이미지 직접 사용) ─────────────
    if (hasOpenAI) {
      const resolvedPrompt = resolvePromptVariables(prompt);

      // gpt-image-2 images/edits: 업로드 이미지를 직접 참조 이미지로 전달
      // → 제품의 외형·색상·질감을 그대로 유지하면서 배경/조명만 변경 가능
      // JSON body 사용: ByteString 검증 없이 한글 포함 안전 처리
      const safeName =
        imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.png";
      const boundary = `SnapPage${Date.now()}${Math.random().toString(36).slice(2)}`;
      const encoder = new TextEncoder();

      const parts: Buffer[] = [
        Buffer.from(
          `--${boundary}\r\n` +
            `Content-Disposition: form-data; name="image"; filename="${safeName}"\r\n` +
            `Content-Type: ${imageFile.type || "image/png"}\r\n\r\n`
        ),
        buffer,
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n`
        ),
        Buffer.from(encoder.encode(resolvedPrompt)),
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1`
        ),
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`
        ),
        // 512x1024 → 처리 시간 단축 (1024x1024 대비 50% 감소)
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1024x1024`
        ),
        // URL 반환 요청 → 서버에서 이미지 다운로드 단계 생략 → 응답 시간 단축
        Buffer.from(
          `\r\n--${boundary}\r\nContent-Disposition: form-data; name="response_format"\r\n\r\nurl`
        ),
        Buffer.from(`\r\n--${boundary}--\r\n`),
      ];

      const multipartBody = new Blob(
        [Buffer.concat(parts)],
        { type: "application/octet-stream" }
      );

      const oaRes = await fetch("https://api.openai.com/v1/images/edits", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
          "Content-Type": `multipart/form-data; boundary=${boundary}`,
        },
        body: multipartBody,
      });

      if (!oaRes.ok) {
        const errText = await oaRes.text();
        return NextResponse.json(
          { error: `이미지 생성 실패 (${oaRes.status}): ${errText.slice(0, 400)}` },
          { status: 500 }
        );
      }

      const oaData = await oaRes.json();

      // URL 직접 반환 (base64 변환 없음 → 응답 크기·시간 대폭 감소)
      const imageUrl = oaData.data?.[0]?.url as string | undefined;
      if (imageUrl) {
        return NextResponse.json({ imageUrl });
      }

      // b64_json 폴백
      const b64 = oaData.data?.[0]?.b64_json as string | undefined;
      if (b64) {
        return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
      }

      return NextResponse.json(
        { error: "이미지 데이터를 받지 못했습니다." },
        { status: 500 }
      );
    }

    // ── OpenRouter only: GPT-4o Vision → Pollinations.ai ────────────────────
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
                      text: "Describe this product precisely for AI image generation: shape, color, material, texture, and key features. 2-3 sentences in English.",
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
        // 분석 실패 시 원본 프롬프트만으로 진행
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
