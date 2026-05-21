import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

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
  // 프롬프트를 1500자로 제한 (URL 길이 제한)
  const safePrompt = prompt.slice(0, 1500);
  const seed = Math.floor(Math.random() * 99999);
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(safePrompt)}?width=1024&height=1024&nologo=true&enhance=true&seed=${seed}`;

  const res = await fetch(url, { signal: AbortSignal.timeout(50000) });
  if (!res.ok) throw new Error(`Pollinations 오류: ${res.status}`);

  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;

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

    // ── OpenRouter: GPT-4o Vision 분석 → Pollinations.ai 이미지 생성 ────────
    if (hasOpenRouter) {
      // Step 1: GPT-4o로 제품 이미지 분석 (실패해도 계속 진행)
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

      // Step 2: 최종 프롬프트 조합
      const truncatedPrompt =
        prompt.length > 1000 ? prompt.slice(0, 1000) + "..." : prompt;

      const finalPrompt = productDescription
        ? `${productDescription}. ${truncatedPrompt}`
        : truncatedPrompt;

      // Step 3: Pollinations.ai로 이미지 생성 (무료, API 키 불필요)
      try {
        const imageUrl = await generateWithPollinations(finalPrompt);
        return NextResponse.json({ imageUrl });
      } catch (pollinationsErr) {
        const errMsg =
          pollinationsErr instanceof Error
            ? pollinationsErr.message
            : "이미지 생성에 실패했습니다.";
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }
    }

    // ── OpenAI 직접 연결 (폴백) ───────────────────────────────────────────────
    if (hasOpenAI) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const safeName =
        imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.png";
      const file = await toFile(buffer, safeName, {
        type: imageFile.type || "image/png",
      });
      const response = await openai.images.edit({
        model: "gpt-image-1",
        image: file,
        prompt,
        n: 1,
        size: "1024x1024",
      });
      const b64 = response.data?.[0]?.b64_json;
      return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
    }

    return NextResponse.json({ fallback: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
