import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { productName } = await req.json();

    if (!productName?.trim()) {
      return NextResponse.json({ error: "제품명을 입력해 주세요." }, { status: 400 });
    }
    if (productName.length > 100) {
      return NextResponse.json({ error: "제품명은 100자 이하로 입력해 주세요." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    // Blob으로 감싸서 undici ByteString 검증 우회 (한글 포함 body 안전 전송)
    const requestBody = new Blob(
      [
        JSON.stringify({
          model: "gpt-4o",
          messages: [
            {
              role: "system",
              content:
                "You are a Korean SNS marketing and trend analysis expert. Generate emotional and purchase-inducing Korean marketing copy reflecting 2025 consumer trends.",
            },
            {
              role: "user",
              // 제품명만 한글 포함 — 나머지 지시문은 영어로 ByteString 오류 방지
              content:
                `Analyze the following product and generate Korean marketing copy for SNS/online shopping trends.\n\nProduct name: ${productName}\n\nRespond ONLY with this JSON (no explanation):\n{\n  "title": "Impactful product title (10-20 chars, Korean)",\n  "features": "Core product features and benefits (2-3 sentences, Korean)",\n  "hook": "Purchase-inducing hook phrase (15-30 chars, Korean)",\n  "comment": "Empathetic emotional comment (1-2 sentences, Korean)"\n}`,
            },
          ],
          temperature: 0.85,
          max_tokens: 600,
        }),
      ],
      { type: "application/json" }
    );

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: requestBody,
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `ChatGPT 오류 (${res.status}): ${errText.slice(0, 200)}` },
        { status: 500 }
      );
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content?.trim() ?? "";

    // JSON 코드블록 제거 후 파싱
    const jsonStr = content.replace(/^```json?\s*/i, "").replace(/```\s*$/, "").trim();
    const parsed = JSON.parse(jsonStr);

    return NextResponse.json({
      title:    parsed.title    ?? "",
      features: parsed.features ?? "",
      hook:     parsed.hook     ?? "",
      comment:  parsed.comment  ?? "",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "문구 생성 실패";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
