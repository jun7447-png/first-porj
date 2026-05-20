import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export const maxDuration = 60;

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://first-porj.vercel.app";

const OPENROUTER_HEADERS = {
  Authorization: `Bearer ${process.env.OPENROUTER_API_KEY ?? ""}`,
  "HTTP-Referer": SITE_URL,
  "X-Title": "SnapPage",
  "Content-Type": "application/json",
};

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

    // ── OpenRouter ────────────────────────────────────────────────────────────
    if (hasOpenRouter) {
      // Step 1: GPT-4o Vision으로 제품 분석 (실패해도 계속 진행)
      let productDescription = "";
      try {
        const base64 = buffer.toString("base64");
        const mimeType = imageFile.type || "image/jpeg";

        const visionRes = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: OPENROUTER_HEADERS,
            body: JSON.stringify({
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
                      text: "이 제품 이미지를 이미지 생성 AI가 재현할 수 있도록 정확히 묘사해 주세요. 형태, 색상, 소재, 질감, 주요 특징을 포함해 2~3문장으로 설명하세요.",
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
        // 분석 실패 시 빈 설명으로 계속 진행
      }

      // Step 2: DALL-E 3로 이미지 생성 (직접 fetch)
      const truncatedPrompt =
        prompt.length > 2500 ? prompt.slice(0, 2500) + "..." : prompt;
      const finalPrompt = (
        productDescription
          ? `[제품 정보] ${productDescription}\n\n${truncatedPrompt}`
          : truncatedPrompt
      ).slice(0, 4000);

      const imageRes = await fetch(
        "https://openrouter.ai/api/v1/images/generations",
        {
          method: "POST",
          headers: OPENROUTER_HEADERS,
          body: JSON.stringify({
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
          { error: `이미지 생성 실패: ${imageRes.status} ${errBody}` },
          { status: 500 }
        );
      }

      const imageData = await imageRes.json();
      const b64 = imageData.data?.[0]?.b64_json as string | undefined;

      if (!b64) {
        // b64_json 없으면 url 시도
        const url = imageData.data?.[0]?.url as string | undefined;
        if (url) {
          const fetched = await fetch(url);
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

      return NextResponse.json({
        imageUrl: `data:image/png;base64,${b64}`,
      });
    }

    // ── OpenAI 직접 연결 (폴백) ───────────────────────────────────────────────
    if (hasOpenAI) {
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const file = await toFile(buffer, imageFile.name || "image.png", {
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
      return NextResponse.json({
        imageUrl: `data:image/png;base64,${b64}`,
      });
    }

    return NextResponse.json({ fallback: true });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
