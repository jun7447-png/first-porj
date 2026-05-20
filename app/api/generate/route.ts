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

    // ── OpenRouter: GPT-4o Vision → DALL-E 3 ─────────────────────────────────
    if (hasOpenRouter) {
      // Step 1: 제품 이미지 분석 (실패해도 계속 진행)
      let productDescription = "";
      try {
        const base64 = buffer.toString("base64");
        const mimeType = imageFile.type || "image/jpeg";

        const visionRes = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: openRouterHeaders(),
            // body를 Blob으로 전송 → 멀티바이트 문자 안전 처리
            body: jsonBody({
              model: "openai/gpt-4o",
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "image_url",
                      image_url: {
                        url: `data:${mimeType};base64,${base64}`,
                      },
                    },
                    {
                      type: "text",
                      // 내부 지시문은 영어로 → ByteString 오류 방지
                      text: "Describe this product precisely for AI image generation: shape, color, material, texture, and key features. Keep it to 2-3 sentences.",
                    },
                  ],
                },
              ],
              max_tokens: 250,
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

      // Step 2: DALL-E 3 이미지 생성
      const truncatedPrompt =
        prompt.length > 2500 ? prompt.slice(0, 2500) + "..." : prompt;

      const finalPrompt = (
        productDescription
          ? `Product: ${productDescription}\n\n${truncatedPrompt}`
          : truncatedPrompt
      ).slice(0, 4000);

      const imageRes = await fetch(
        "https://openrouter.ai/api/v1/images/generations",
        {
          method: "POST",
          headers: openRouterHeaders(),
          body: jsonBody({
            model: "openai/dall-e-3",
            prompt: finalPrompt,
            n: 1,
            size: "1024x1024",
            response_format: "b64_json",
          }),
        }
      );

      if (!imageRes.ok) {
        const errBody = await imageRes.text();
        return NextResponse.json(
          { error: `이미지 생성 실패 (${imageRes.status}): ${errBody}` },
          { status: 500 }
        );
      }

      const imageData = await imageRes.json();
      const b64 = imageData.data?.[0]?.b64_json as string | undefined;

      if (b64) {
        return NextResponse.json({ imageUrl: `data:image/png;base64,${b64}` });
      }

      // b64_json 없으면 url로 재시도
      const remoteUrl = imageData.data?.[0]?.url as string | undefined;
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

    // ── OpenAI 직접 연결 (폴백) ───────────────────────────────────────────────
    if (hasOpenAI) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      // 파일명 ASCII로 정규화 → Content-Disposition 헤더 오류 방지
      const safeName = imageFile.name.replace(/[^\x00-\x7F]/g, "") || "image.png";
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
