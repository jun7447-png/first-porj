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

/** 이미지 생성 실패 시 공통 알럿 메시지 */
export const IMAGE_MODEL_ERROR =
  "현재 Chatgpt 이미지 생성 모델이 원활하지 않습니다.잠시 후 다시 시도해 주세요!";

/** 사용 모델: openai/gpt-image-2 (images/edits, UTF-8 멀티파트 직접 구성)
 *  buffer2/mimeType2/fileName2: 두 번째 이미지 (모델샷 등에서 선택적 사용)
 */
export async function generateWithOpenAI(
  buffer: Buffer,
  mimeType: string,
  fileName: string,
  prompt: string,
  buffer2?: Buffer,
  mimeType2?: string,
  fileName2?: string
): Promise<string> {
  const resolved = resolvePromptVariables(prompt);
  const boundary = `SnapPage${Date.now()}${Math.random().toString(36).slice(2)}`;
  const encoder = new TextEncoder();

  // 이미지가 2장이면 배열 표기 image[] 사용 (단일은 image)
  const imageFieldName = buffer2 ? "image[]" : "image";

  const parts: Buffer[] = [
    Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="${imageFieldName}"; filename="${fileName}"\r\n` +
        `Content-Type: ${mimeType}\r\n\r\n`
    ),
    buffer,
  ];

  // 두 번째 이미지 (모델샷: 모델인물사진)
  if (buffer2 && mimeType2 && fileName2) {
    parts.push(
      Buffer.from(
        `\r\n--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${imageFieldName}"; filename="${fileName2}"\r\n` +
          `Content-Type: ${mimeType2}\r\n\r\n`
      ),
      buffer2
    );
  }

  parts.push(
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="prompt"\r\n\r\n`
    ),
    Buffer.from(encoder.encode(resolved)),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="model"\r\n\r\ngpt-image-2`
    ),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="n"\r\n\r\n1`
    ),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="size"\r\n\r\nauto`
    ),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="output_format"\r\n\r\njpeg`
    ),
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="output_compression"\r\n\r\n80`
    ),
    Buffer.from(`\r\n--${boundary}--\r\n`)
  );

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
    const errData = await res.json().catch(() => null);
    const detail = errData?.error?.message ?? `HTTP ${res.status}`;
    throw new Error(`OpenAI 오류: ${detail}`);
  }

  const data = await res.json();
  const url = data.data?.[0]?.url as string | undefined;
  if (url) return url;

  const b64 = data.data?.[0]?.b64_json as string | undefined;
  if (b64) return `data:image/png;base64,${b64}`;

  throw new Error(IMAGE_MODEL_ERROR);
}
