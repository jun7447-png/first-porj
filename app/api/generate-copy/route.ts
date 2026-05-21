import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { productName } = await req.json();

    if (!productName?.trim()) {
      return NextResponse.json({ error: "제품명을 입력해 주세요." }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: "OPENAI_API_KEY가 설정되지 않았습니다." }, { status: 500 });
    }

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content:
              "당신은 SNS 마케팅·트렌드 분석 전문가입니다. 2025년 최신 소비 트렌드를 반영하여 제품에 맞는 감성적이고 구매욕을 자극하는 한국어 마케팅 문구를 생성합니다.",
          },
          {
            role: "user",
            content: `다음 제품명을 분석하고 최신 SNS/온라인 쇼핑몰 트렌드에 맞는 마케팅 문구를 생성해 주세요.

제품명: ${productName}

아래 JSON 형식으로만 응답하세요 (설명 없이 JSON만):
{
  "title": "임팩트 있는 제품 타이틀 (10~20자, 한국어)",
  "features": "제품의 핵심 특징과 차별화 장점 (2~3문장, 한국어)",
  "hook": "구매 욕구를 자극하는 후킹 문구 (15~30자, 한국어)",
  "comment": "공감과 감성을 이끄는 코멘트 (1~2문장, 한국어)"
}`,
          },
        ],
        temperature: 0.85,
        max_tokens: 600,
      }),
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
