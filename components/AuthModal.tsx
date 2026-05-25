"use client";

import { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type Mode = "login" | "signup" | "verify";

const RESEND_COOLDOWN = 60;

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 이메일 인증 완료 감지 — 모달이 열려 있는 동안 폴링
  useEffect(() => {
    if (mode !== "verify") return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN") {
        onSuccess();
      }
    });

    return () => subscription.unsubscribe();
  }, [mode, onSuccess]);

  // 재발송 카운트다운
  useEffect(() => {
    if (resendCooldown <= 0) return;
    timerRef.current = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [resendCooldown]);

  const switchMode = (next: "login" | "signup") => {
    setMode(next);
    setError("");
    setPasswordConfirm("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "signup" && password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setError(
          error.message === "Invalid login credentials"
            ? "이메일 또는 비밀번호가 올바르지 않습니다."
            : error.message === "Email not confirmed"
            ? "이메일 인증이 완료되지 않았습니다. 받은 편지함을 확인해 주세요."
            : error.message
        );
      } else {
        onSuccess();
      }
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
      });
      if (error) {
        setError(
          error.message === "User already registered"
            ? "이미 가입된 이메일입니다. 로그인을 시도해 주세요."
            : error.message
        );
      } else if (!data.user || (data.user.identities && data.user.identities.length === 0)) {
        // 이미 가입된 이메일 — Supabase는 에러 없이 빈 identities 반환
        setError("이미 가입된 이메일입니다. 로그인을 시도해 주세요.");
      } else {
        setMode("verify");
        setResendCooldown(RESEND_COOLDOWN);
      }
    }

    setLoading(false);
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      },
    });
    if (error) {
      setError(error.message);
    } else {
      setResendCooldown(RESEND_COOLDOWN);
    }
  };


  // ── 이메일 인증 대기 화면 ──────────────────────────────────────────────────
  if (mode === "verify") {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
          <button
            onClick={onClose}
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
            aria-label="닫기"
          >
            ✕
          </button>

          {/* 아이콘 */}
          <div className="mb-6 flex flex-col items-center text-center">
            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-violet-500/30 bg-violet-500/10">
              <svg className="h-9 w-9 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0-9.75 6.75L2.25 6.75" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-white">인증 이메일을 발송했습니다</h2>
            <p className="mt-2 text-sm text-zinc-400">
              <span className="font-medium text-violet-300">{email}</span>으로<br />
              인증 링크를 보냈습니다.
            </p>
          </div>

          {/* 안내 단계 */}
          <ol className="mb-6 space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4 text-sm text-zinc-400">
            {[
              "받은 편지함에서 SnapPage 인증 메일을 확인하세요.",
              "메일 내 [이메일 인증하기] 버튼을 클릭하세요.",
              "인증이 완료되면 자동으로 로그인됩니다.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-400">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>

          <p className="mb-4 text-center text-xs text-zinc-600">
            스팸 폴더도 확인해 보세요.
          </p>

          {error && (
            <p className="mb-4 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          {/* 재발송 버튼 */}
          <button
            onClick={handleResend}
            disabled={resendCooldown > 0}
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 py-3 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {resendCooldown > 0
              ? `재발송 (${resendCooldown}초 후 가능)`
              : "인증 이메일 재발송"}
          </button>

          <button
            onClick={() => switchMode("login")}
            className="mt-3 w-full py-2 text-sm text-zinc-600 transition-all hover:text-zinc-400"
          >
            ← 로그인으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  // ── 로그인 / 회원가입 화면 ────────────────────────────────────────────────
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
          aria-label="닫기"
        >
          ✕
        </button>

        {/* 헤더 */}
        <div className="mb-8 text-center">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            SnapPage
          </span>
          <h2 className="mt-3 text-2xl font-bold text-white">
            {mode === "login" ? "다시 만나서 반갑습니다" : "지금 시작하세요"}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {mode === "login"
              ? "계정에 로그인하여 이미지 생성을 계속하세요"
              : "무료로 가입하고 AI 상품 이미지를 만들어 보세요"}
          </p>
        </div>

        {/* 탭 */}
        <div className="mb-6 flex rounded-xl bg-zinc-900 p-1">
          <button
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === "login" ? "bg-zinc-700 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            로그인
          </button>
          <button
            onClick={() => switchMode("signup")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
              mode === "signup" ? "bg-zinc-700 text-white shadow" : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            회원가입
          </button>
        </div>

        {/* 폼 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">이메일</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-zinc-400">비밀번호</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8자 이상"
              className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          {mode === "signup" && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-zinc-400">비밀번호 확인</label>
              <input
                type="password"
                required
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="비밀번호를 다시 입력해 주세요"
                className={`w-full rounded-xl border bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:ring-2 focus:ring-violet-500/20 ${
                  passwordConfirm && password !== passwordConfirm
                    ? "border-red-500 focus:border-red-500"
                    : "border-zinc-700 focus:border-violet-500"
                }`}
              />
              {passwordConfirm && password !== passwordConfirm && (
                <p className="mt-1.5 text-xs text-red-400">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>
          )}

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "처리 중..." : mode === "login" ? "로그인" : "회원가입"}
          </button>
        </form>
      </div>
    </div>
  );
}
