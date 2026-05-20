import { NextRequest, NextResponse } from "next/server";
import OpenAI, { toFile } from "openai";

export async function POST(req: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const formData = await req.formData();
    const imageFile = formData.get("image") as File | null;
    const prompt = formData.get("prompt") as string | null;

    if (!imageFile || !prompt) {
      return NextResponse.json(
        { error: "이미지와 프롬프트가 필요합니다." },
        { status: 400 }
      );
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
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
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "이미지 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
