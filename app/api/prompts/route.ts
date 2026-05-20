import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const prompts = Array.from({ length: 5 }, (_, i) => {
      const filePath = path.join(process.cwd(), "prompt", `prompt${i + 1}.txt`);
      return fs.readFileSync(filePath, "utf-8").trim();
    });
    return NextResponse.json({ prompts });
  } catch {
    return NextResponse.json(
      { error: "프롬프트 파일을 읽을 수 없습니다." },
      { status: 500 }
    );
  }
}
