"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
            <a
              href="/history"
              className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 backdrop-blur transition-all hover:border-violet-500/50 hover:text-violet-300"
            >
              히스토리
            </a>
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
      <Features />

      {/* 갤러리 버튼 — How it works 위 */}
      <div className="px-6 pb-4 pt-2">
        <a
          href="/gallery"
          className="flex w-full items-center justify-center gap-3 rounded-2xl border border-violet-500/30 bg-gradient-to-r from-violet-500/10 to-cyan-500/10 py-4 text-base font-semibold text-white transition-all hover:border-violet-500/60 hover:from-violet-500/20 hover:to-cyan-500/20 hover:shadow-lg hover:shadow-violet-500/10"
        >
          <svg className="h-5 w-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
          갤러리 구경하러가기
          <svg className="h-4 w-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </a>
      </div>

      <HowItWorks />

      {showAuth && (
        <AuthModal
          onClose={() => { setShowAuth(false); setPendingTool(null); }}
          onSuccess={handleAuthSuccess}
        />
      )}

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
