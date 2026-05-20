"use client";

import { useState } from "react";
import Link from "next/link";

type Status = "idle" | "loading" | "success" | "error";

export default function ContactPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (data.error) {
        setErrorMsg(data.error);
        setStatus("error");
      } else {
        setStatus("success");
        setForm({ name: "", email: "", subject: "", message: "" });
      }
    } catch {
      setErrorMsg("네트워크 오류가 발생했습니다. 다시 시도해 주세요.");
      setStatus("error");
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      <div className="mx-auto max-w-2xl px-6 py-20">
        {/* 뒤로 가기 */}
        <Link
          href="/"
          className="mb-10 inline-flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← 메인으로 돌아가기
        </Link>

        {/* 헤더 */}
        <div className="mb-10">
          <span className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            Contact
          </span>
          <h1 className="mt-3 text-4xl font-bold text-white">문의하기</h1>
          <p className="mt-3 text-zinc-400">
            궁금한 점이나 제안 사항을 보내주세요. 빠르게 답변드리겠습니다.
          </p>
          <a
            href="mailto:wish2me@wish2me.com"
            className="mt-2 inline-block text-sm text-violet-400 transition-colors hover:text-violet-300"
          >
            wish2me@wish2me.com
          </a>
        </div>

        {/* 성공 메시지 */}
        {status === "success" ? (
          <div className="rounded-2xl border border-green-500/20 bg-green-500/10 p-8 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
              <svg className="h-8 w-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-white">문의가 접수되었습니다!</h2>
            <p className="mt-2 text-sm text-zinc-400">
              빠른 시일 내에 <span className="text-violet-300">{form.email || "입력하신 이메일"}</span>로 답변드리겠습니다.
            </p>
            <button
              onClick={() => setStatus("idle")}
              className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              새 문의 작성
            </button>
          </div>
        ) : (
          /* 문의 폼 */
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 sm:p-8"
          >
            <div className="space-y-5">
              {/* 이름 + 이메일 */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                    이름 <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={form.name}
                    onChange={handleChange}
                    placeholder="홍길동"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                    이메일 <span className="text-violet-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    value={form.email}
                    onChange={handleChange}
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                </div>
              </div>

              {/* 제목 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                  제목 <span className="text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  name="subject"
                  required
                  value={form.subject}
                  onChange={handleChange}
                  placeholder="문의 제목을 입력해 주세요"
                  className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {/* 내용 */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-zinc-400">
                  내용 <span className="text-violet-400">*</span>
                </label>
                <textarea
                  name="message"
                  required
                  rows={6}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="문의 내용을 자세히 작성해 주세요."
                  className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                />
              </div>

              {/* 에러 메시지 */}
              {status === "error" && (
                <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {errorMsg}
                </p>
              )}

              {/* 전송 버튼 */}
              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {status === "loading" ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    전송 중...
                  </span>
                ) : (
                  "문의 보내기 →"
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 푸터 */}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        © 2026 SnapPage. All rights reserved.
      </footer>
    </main>
  );
}
