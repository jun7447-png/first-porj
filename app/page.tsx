"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // 이메일 인증 링크가 루트로 잘못 리다이렉트된 경우 콜백 페이지로 이동
    const hash = window.location.hash;
    if (hash.includes("access_token")) {
      router.replace(`/auth/callback${hash}`);
      return;
    }

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
      window.dispatchEvent(new Event("openLoginModal"));
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
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

      {/* 문의하기 섹션 */}
      <section className="border-t border-zinc-800 px-6 py-16 text-center">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-cyan-400">Contact</p>
        <h2 className="text-3xl font-bold text-white">문의하기</h2>
        <p className="mx-auto mt-4 max-w-md text-zinc-400">
          궁금한 점이나 제안 사항이 있으신가요?
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
