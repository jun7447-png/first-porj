import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL = "jun7447@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 비ASCII 문자를 HTML 숫자 엔티티로 변환 — 인코딩 독립적
function toNcr(str: string): string {
  return Array.from(str)
    .map((c) => {
      const code = c.codePointAt(0)!;
      return code > 127 ? `&#${code};` : c;
    })
    .join("");
}

function safe(str: string): string {
  return toNcr(escapeHtml(str));
}

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "모든 항목을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
    }

    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: "입력 길이를 초과했습니다." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "이메일 서비스가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const safeName    = safe(name);
    const safeEmail   = escapeHtml(email);   // 이메일은 NCR 불필요
    const safeSubject = safe(subject);
    const safeMessage = safe(message).replace(/\n/g, "<br/>");

    await resend.emails.send({
      from: "SnapPage Contact <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `[SnapPage] ${subject}`,
      html: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head>
<body style="margin:0;padding:0;background:#09090b;">
<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#09090b;color:#fff;border-radius:12px;">
  <h2 style="color:#a78bfa;margin-bottom:24px;">SnapPage &#49352; &#47928;&#51032;&#44032; &#46020;&#52856;&#54588;&#49845;&#45768;&#45796;</h2>
  <table style="width:100%;border-collapse:collapse;">
    <tr>
      <td style="padding:10px 0;color:#71717a;width:80px;">&#51060;&#47492;</td>
      <td style="padding:10px 0;color:#f4f4f5;">${safeName}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#71717a;">&#51060;&#47700;&#51068;</td>
      <td style="padding:10px 0;color:#f4f4f5;"><a href="mailto:${safeEmail}" style="color:#67e8f9;">${safeEmail}</a></td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#71717a;">&#51228;&#47785;</td>
      <td style="padding:10px 0;color:#f4f4f5;">${safeSubject}</td>
    </tr>
  </table>
  <hr style="border:none;border-top:1px solid #27272a;margin:20px 0;">
  <p style="color:#71717a;margin-bottom:8px;">&#45236;&#50857;</p>
  <p style="color:#f4f4f5;line-height:1.7;">${safeMessage}</p>
  <hr style="border:none;border-top:1px solid #27272a;margin:20px 0;">
  <p style="color:#52525b;font-size:12px;">&#51060; &#47700;&#51068;&#51008; SnapPage &#47928;&#51032; &#54392;&#51012; &#53685;&#54644; &#48156;&#49569;&#46104;&#50632;&#49845;&#45768;&#45796;.</p>
</div>
</body>
</html>`,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "전송에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
