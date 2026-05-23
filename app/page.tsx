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
