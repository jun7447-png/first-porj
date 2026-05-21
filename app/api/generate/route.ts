import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

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

    // ── OpenAI DALL-E 3 ──────────────────────────────────────────────────────
    if (hasOpenAI) {
      const resolvedPrompt = resolvePromptVariables(prompt);

      // Step 1: GPT-4o Vision으로 제품 이미지 분석
      // (DALL-E 3은 참조 이미지를 직접 받지 않으므로 텍스트 설명으로 대체)
      let productDescription = "";
      try {
        const base64 = buffer.toString("base64");
        const mimeType = imageFile.type || "image/jpeg";

        // OpenRouter 또는 OpenAI 직접으로 GPT-4o 비전 호출
        const visionEndpoint = hasOpenRouter
          ? "https://openrouter.ai/api/v1/chat/completions"
          : "https://api.openai.com/v1/chat/completions";
        const visionHeaders = hasOpenRouter
          ? openRouterHeaders()
          : openAIHeaders();
        const visionModel = hasOpenRouter ? "openai/gpt-4o" : "gpt-4o";

        const visionRes = await fetch(visionEndpoint, {
          method: "POST",
          headers: visionHeaders,
          body: jsonBody({
            model: visionModel,
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
                    text: "Describe this product precisely for DALL-E 3 image generation. Include: exact shape, color, material, texture, size impression, and key distinguishing features. Be specific and detailed. 3-4 sentences in English only.",
                  },
                ],
              },
            ],
            max_tokens: 300,
          }),
        });

        if (visionRes.ok) {
          const visionData = await visionRes.json();
          productDescription =
            visionData.choices?.[0]?.message?.content?.trim() ?? "";
        }
      } catch {
        // 분석 실패 시 프롬프트만으로 계속 진행
      }

      // Step 2: 최종 프롬프트 구성 (DALL-E 3 한도 4000자)
      const truncatedPrompt =
        resolvedPrompt.length > 2000
          ? resolvedPrompt.slice(0, 2000) + "..."
          : resolvedPrompt;

      const finalPrompt = (
        productDescription
          ? `Product description: ${productDescription}\n\n${truncatedPrompt}`
          : truncatedPrompt
      ).slice(0, 4000);

      // Step 3: DALL-E 3 이미지 생성
      // jsonBody()로 Blob 전송 → ByteString 검증 없이 한글 포함 안전 처리
      const dalleRes = await fetch(
        "https://api.openai.com/v1/images/generations",
        {
          method: "POST",
          headers: openAIHeaders(),
          body: jsonBody({
            model: "gpt-image-2",
            prompt: finalPrompt,
            n: 1,
            size: "1024x1024",
            quality: "standard",
            response_format: "b64_json",
          }),
        }
      );

      if (!dalleRes.ok) {
        const errText = await dalleRes.text();
        return NextResponse.json(
          { error: `DALL-E 3 생성 실패 (${dalleRes.status}): ${errText.slice(0, 400)}` },
          { status: 500 }
        );
      }

      const dalleData = await dalleRes.json();
      const b64 = dalleData.data?.[0]?.b64_json as string | undefined;

      if (b64) {
        return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
      }

      // b64_json 없으면 url 시도
      const remoteUrl = dalleData.data?.[0]?.url as string | undefined;
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
