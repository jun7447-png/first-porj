"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import UploadStep from "@/components/UploadStep";
import { imageStore } from "@/lib/image-store";
import { supabase } from "@/lib/supabase";

export default function GeneratePage() {
  const router = useRouter();

  // 미로그인 시 메인으로 리다이렉트
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/");
    });
  }, [router]);

  const handleConfirm = (files: File[]) => {
    imageStore.set(files);
    router.push("/generate/results");
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/15 blur-3xl" />
      </div>

      {/* 헤더 */}
      <header className="flex items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2 text-sm text-zinc-500 transition-colors hover:text-zinc-300">
          ← 메인으로
        </Link>
        <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI 이미지 생성
        </span>
      </header>

      {/* 업로드 영역 */}
      <div className="mx-auto max-w-2xl px-4 pb-16 pt-8">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40">
          <UploadStep onConfirm={handleConfirm} />
        </div>
      </div>
    </main>
  );
}
