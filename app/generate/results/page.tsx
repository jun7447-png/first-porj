"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GenerateResults from "@/components/GenerateResults";
import { imageStore } from "@/lib/image-store";

export default function GenerateResultsPage() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = imageStore.get();
    if (!stored.length) {
      // 직접 URL 접근 시 업로드 페이지로 리다이렉트
      router.replace("/generate");
      return;
    }
    setFiles(stored);
    setReady(true);
  }, [router]);

  const handleReset = () => {
    imageStore.clear();
    router.push("/generate");
  };

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/4 top-1/4 h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-1/4 top-1/2 h-[300px] w-[300px] rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      <div className="mx-auto max-w-6xl px-4 pb-16 pt-6">
        <GenerateResults files={files} onReset={handleReset} />
      </div>

      <footer className="border-t border-zinc-800 py-6 text-center text-sm text-zinc-600">
        © 2026 SnapPage. All rights reserved.
        <span className="mx-3">·</span>
        <a href="/contact" className="transition-colors hover:text-zinc-400">
          wish2me@wish2me.com
        </a>
      </footer>
    </main>
  );
}
