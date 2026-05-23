import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

const ADMIN_EMAIL = "jun7447@gmail.com";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// HTML 특수문자 이스케이프
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// 비ASCII 문자를 HTML 숫자 엔티티로 변환 (인코딩 완전 독립)
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
      return NextResponse.json({ error: "모든 항목을 입력해 주세요." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "올바른 이메일 주소를 입력해 주세요." }, { status: 400 });
    }
    if (name.length > 100 || subject.length > 200 || message.length > 5000) {
      return NextResponse.json({ error: "입력 길이를 초과했습니다." }, { status: 400 });
    }
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json({ error: "이메일 서비스가 설정되지 않았습니다." }, { status: 500 });
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const safeName    = safe(name);
    const safeEmail   = escapeHtml(email);
    const safeSubject = safe(subject);
    const safeMessage = safe(message).replace(/\n/g, "<br>");

    // 정적 한글도 NCR로 미리 변환
    const html = [
      "<!DOCTYPE html>",
      '<html><head>',
      '<meta charset="UTF-8">',
      '<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">',
      "</head>",
      '<body style="margin:0;padding:0;background:#f4f4f5;">',
      '<div style="font-family:Arial,sans-serif;max-width:600px;margin:24px auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #e4e4e7;">',
      // "SnapPage 새 문의가 도착했습니다"
      '<h2 style="color:#7c3aed;margin:0 0 24px;">SnapPage &#49352; &#47928;&#51032;&#44032; &#46020;&#52856;&#54588;&#49845;&#45768;&#45796;</h2>',
      '<table style="width:100%;border-collapse:collapse;margin-bottom:20px;">',
      '<tr style="border-bottom:1px solid #f4f4f5;">',
      // "이름"
      `<td style="padding:10px 0;color:#71717a;width:70px;font-size:14px;">&#51060;&#47492;</td>`,
      `<td style="padding:10px 0;color:#18181b;font-size:14px;">${safeName}</td>`,
      "</tr>",
      '<tr style="border-bottom:1px solid #f4f4f5;">',
      // "이메일"
      `<td style="padding:10px 0;color:#71717a;font-size:14px;">&#51060;&#47700;&#51068;</td>`,
      `<td style="padding:10px 0;font-size:14px;"><a href="mailto:${safeEmail}" style="color:#7c3aed;">${safeEmail}</a></td>`,
      "</tr>",
      "<tr>",
      // "제목"
      `<td style="padding:10px 0;color:#71717a;font-size:14px;">&#51228;&#47785;</td>`,
      `<td style="padding:10px 0;color:#18181b;font-size:14px;">${safeSubject}</td>`,
      "</tr>",
      "</table>",
      '<div style="background:#f9f9fb;border-radius:8px;padding:16px;">',
      // "내용"
      '<p style="margin:0 0 8px;color:#71717a;font-size:13px;">&#45236;&#50857;</p>',
      `<p style="margin:0;color:#18181b;font-size:14px;line-height:1.8;">${safeMessage}</p>`,
      "</div>",
      // "이 메일은 SnapPage 문의 폼을 통해 발송되었습니다."
      '<p style="margin:24px 0 0;color:#a1a1aa;font-size:12px;">&#51060; &#47700;&#51068;&#51008; SnapPage &#47928;&#51032; &#54392;&#51012; &#53685;&#54644; &#48156;&#49569;&#46104;&#50632;&#49845;&#45768;&#45796;.</p>',
      "</div></body></html>",
    ].join("\n");

    await transporter.sendMail({
      from: `"SnapPage" <${process.env.GMAIL_USER}>`,
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `[SnapPage] ${subject}`,
      textEncoding: "base64",
      html,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "전송에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
