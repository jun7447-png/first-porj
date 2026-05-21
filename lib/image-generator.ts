/** prompt 파일의 미치환 템플릿 변수를 실제 값으로 교체 */
export function resolvePromptVariables(prompt: string): string {
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

/**
 * gpt-image-1 images/edits 호출 (UTF-8 멀티파트 직접 구성)
 * 반환: imageUrl (OpenAI 임시 URL 또는 data:URL)
 */
export async function generateWithOpenAI(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  prompt: string
): Promise<string> {
  const resolved = resolvePromptVariables(prompt);
  const boundary = `SnapPage${Date.now()}${Math.random().toString(36).slice(2)}`;
  const encoder = new TextEncoder();

  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="image"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n`
    ),
    Buffer.from(encoder.encode(resolved)),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-1`
    ),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`
    ),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\n1024x1024`
    ),
    Buffer.from(`\r\n--${boundary}--\r\n`),
  ];

  const body = new Blob([Buffer.concat(parts)], { type: "application/octet-stream" });

  const res = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY!}`,
      "Content-Type": `multipart/form-data; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`이미지 생성 실패 (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = await res.json();
  const url = data.data?.[0]?.url as string | undefined;
  if (url) return url;

  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (b64) return `data:image/png;base64,${b64}`;

  throw new Error("이미지 데이터를 받지 못했습니다.");
}
