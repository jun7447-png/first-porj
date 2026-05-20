import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://first-porj.vercel.app";

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

    // API 키 없으면 Canvas 폴백
    if (!hasOpenRouter && !hasOpenAI) {
      return NextResponse.json({ fallback: true });
    }

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // ── OpenRouter: GPT-4o Vision 분석 → DALL-E 3 생성 ──────────────────────
    if (hasOpenRouter) {
      const openrouter = new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: process.env.OPENROUTER_API_KEY,
        defaultHeaders: {
          "HTTP-Referer": SITE_URL,
          "X-Title": "SnapPage",
        },
      });

      // Step 1: 업로드된 제품 이미지 분석
      const base64 = buffer.toString("base64");
      const mimeType = imageFile.type || "image/jpeg";

      const analysis = await openrouter.chat.completions.create({
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
      });

      const productDescription =
        analysis.choices[0]?.message?.content?.trim() ?? "";

      // Step 2: DALL-E 3로 이미지 생성
      // DALL-E 3 프롬프트 한도(4000자) 맞춰 자르기
      const truncatedPrompt =
        prompt.length > 2500 ? prompt.slice(0, 2500) + "..." : prompt;
      const finalPrompt =
        `[제품 정보] ${productDescription}\n\n${truncatedPrompt}`.slice(0, 4000);

      const imageResponse = await openrouter.images.generate({
        model: "openai/dall-e-3",
        prompt: finalPrompt,
        n: 1,
        size: "1024x1024",
      });

      const remoteUrl = imageResponse.data?.[0]?.url;
      if (!remoteUrl) {
        return NextResponse.json(
          { error: "이미지 URL을 받지 못했습니다." },
          { status: 500 }
        );
      }

      // DALL-E URL은 만료되므로 base64로 변환하여 반환
      const imgRes = await fetch(remoteUrl);
      const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
      const imgBase64 = imgBuffer.toString("base64");
      const imgMime = imgRes.headers.get("content-type") ?? "image/png";

      return NextResponse.json({
        imageUrl: `data:${imgMime};base64,${imgBase64}`,
      });
    }

    // ── OpenAI 직접 연결: gpt-image-1 ────────────────────────────────────────
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
