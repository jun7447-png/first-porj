"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [showAuth, setShowAuth] = useState(false);
  const [pendingTool, setPendingTool] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleStart = (toolType: string) => {
    if (user) {
      router.push(`/tools/${toolType}`);
    } else {
      setPendingTool(toolType);
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    router.push(`/tools/${pendingTool ?? "1"}`);
    setPendingTool(null);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 상단 고정 인증 버튼 */}
      <div className="fixed right-4 top-4 z-40 flex items-center gap-3">
        {user ? (
          <>
            <span className="hidden max-w-[160px] truncate text-sm text-zinc-400 sm:inline">
              {user.email}
            </span>
            <button
              onClick={handleLogout}
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 backdrop-blur transition-all hover:border-zinc-500 hover:text-white"
            >
              로그아웃
            </button>
          </>
        ) : (
          <button
            onClick={() => { setPendingTool("1"); setShowAuth(true); }}
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 backdrop-blur transition-all hover:border-zinc-500 hover:text-white"
          >
            로그인 / 회원가입
          </button>
        )}
      </div>

      <Hero onStart={handleStart} />

      {/* 갤러리 버튼 — Features 위, 가로 전체 */}
      <div className="px-6 pb-6">
        <Link
          href="/gallery"
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/60 py-4 text-sm font-medium text-zinc-300 transition-all hover:border-violet-500/50 hover:bg-zinc-800 hover:text-white hover:shadow-lg hover:shadow-violet-500/10"
        >
          <span>🖼️</span>
          갤러리 보기
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </div>

      <Features />
      <HowItWorks />

      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setPendingTool(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}

      {/* 문의하기 섹션 */}
      <section className="border-t border-zinc-800 px-6 py-16 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-cyan-400">Contact</p>
        <h2 className="text-3xl font-bold text-white">문의하기</h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          궁금한 점이나 제안 사항이 있으신가요? 언제든지 편하게 연락주세요.
        </p>
        <Link
          href="/contact"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.03] hover:shadow-violet-500/35"
        >
          문의 보내기
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </section>

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        © 2026 SnapPage. All rights reserved.
        <span className="mx-3">·</span>
        <a href="/contact" className="transition-colors hover:text-zinc-400">
          wish2me@wish2me.com
        </a>
      </footer>
    </main>
  );
}
