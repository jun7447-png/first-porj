import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const ADMIN_EMAIL = "wish2me@wish2me.com";

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json();

    if (!name || !email || !subject || !message) {
      return NextResponse.json(
        { error: "모든 항목을 입력해 주세요." },
        { status: 400 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        { error: "이메일 서비스가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    await resend.emails.send({
      from: "SnapPage 문의 <onboarding@resend.dev>",
      to: ADMIN_EMAIL,
      replyTo: email,
      subject: `[SnapPage 문의] ${subject}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background: #09090b; color: #fff; border-radius: 12px;">
          <h2 style="color: #a78bfa; margin-bottom: 24px;">SnapPage 새 문의가 도착했습니다</h2>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; color: #71717a; width: 80px;">이름</td>
              <td style="padding: 10px 0; color: #f4f4f5;">${name}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #71717a;">이메일</td>
              <td style="padding: 10px 0; color: #f4f4f5;"><a href="mailto:${email}" style="color: #67e8f9;">${email}</a></td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #71717a;">제목</td>
              <td style="padding: 10px 0; color: #f4f4f5;">${subject}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #27272a; margin: 20px 0;" />
          <p style="color: #71717a; margin-bottom: 8px;">내용</p>
          <p style="color: #f4f4f5; white-space: pre-line; line-height: 1.7;">${message}</p>
          <hr style="border: none; border-top: 1px solid #27272a; margin: 20px 0;" />
          <p style="color: #52525b; font-size: 12px;">이 메일은 SnapPage 문의 폼을 통해 발송되었습니다.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "전송에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
