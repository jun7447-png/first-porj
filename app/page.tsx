"use client";

import { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import CreateFlow from "@/components/CreateFlow";
import AuthModal from "@/components/AuthModal";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const [showCreate, setShowCreate] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
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

  const handleStart = () => {
    if (user) {
      setShowCreate(true);
    } else {
      setShowAuth(true);
    }
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    setShowCreate(true);
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
            onClick={() => setShowAuth(true)}
            className="rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 backdrop-blur transition-all hover:border-zinc-500 hover:text-white"
          >
            로그인 / 회원가입
          </button>
        )}
      </div>

      <Hero onStart={handleStart} />
      <Features />
      <HowItWorks onStart={handleStart} />

      {showCreate && <CreateFlow onClose={() => setShowCreate(false)} />}
      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={handleAuthSuccess}
        />
      )}

      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        © 2025 SnapPage. All rights reserved.
      </footer>
    </main>
  );
}
