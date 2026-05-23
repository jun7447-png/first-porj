"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getUserHistory, getUserProfile } from "@/lib/supabase-history";

type HistoryItem = {
  id: string;
  tool_type: string;
  tool_name: string;
  image_url: string;
  prompt_summary: string;
  created_at: string;
};

type Profile = {
  email: string;
  total_generated: number;
  created_at: string;
};

export default function HistoryPage() {
  const router = useRouter();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
    });

    Promise.all([getUserHistory(), getUserProfile()]).then(([hist, prof]) => {
      setHistory(hist as HistoryItem[]);
      setProfile(prof as Profile | null);
      setLoading(false);
    });
  }, [router]);

  const download = (url: string, idx: number) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `generated-${idx + 1}.png`;
    a.click();
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

      {/* 라이트박스 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative" style={{ maxWidth: 800, width: "100%" }} onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 hover:bg-zinc-700 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img src={lightboxUrl} alt="확대보기" className="w-full rounded-2xl border border-zinc-700 shadow-2xl" />
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-zinc-300">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          메인으로
        </Link>
        <h1 className="text-lg font-bold text-white">이미지 생성 히스토리</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          My History
        </span>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* 사용자 정보 카드 */}
        {profile && (
          <div className="mb-8 flex items-center gap-6 rounded-2xl border border-zinc-800 bg-zinc-900/40 px-6 py-5">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-500/20 text-xl">
              👤
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{profile.email}</p>
              <p className="text-xs text-zinc-500">
                가입일: {new Date(profile.created_at).toLocaleDateString("ko-KR")}
              </p>
            </div>
            <div className="ml-auto text-right">
              <p className="text-2xl font-bold text-violet-400">{history.length}</p>
              <p className="text-xs text-zinc-500">총 생성 이미지</p>
            </div>
          </div>
        )}

        {/* 히스토리 그리드 */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <span className="text-4xl opacity-30">🖼️</span>
            <p className="mt-4 text-sm text-zinc-500">아직 생성된 이미지가 없습니다.</p>
            <Link
              href="/"
              className="mt-4 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105"
            >
              이미지 생성 시작하기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {history.map((item, idx) => (
              <div key={item.id} className="flex flex-col gap-2">
                {/* 이미지 카드 */}
                <div
                  className="relative aspect-square cursor-pointer overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 transition-all hover:border-violet-500/50"
                  onClick={() => setLightboxUrl(item.image_url)}
                >
                  <img
                    src={item.image_url}
                    alt={item.tool_name}
                    className="h-full w-full object-contain"
                  />
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                    <div className="flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                      </svg>
                      <span className="text-xs text-white">확대</span>
                    </div>
                  </div>
                  {/* 도구 배지 */}
                  <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-violet-300 backdrop-blur-sm">
                    {item.tool_name}
                  </div>
                </div>

                {/* 날짜 + 다운로드 */}
                <div className="flex items-center justify-between px-1">
                  <p className="text-xs text-zinc-500">
                    {new Date(item.created_at).toLocaleDateString("ko-KR", {
                      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
                    })}
                  </p>
                  <button
                    onClick={() => download(item.image_url, idx)}
                    className="text-xs text-zinc-600 transition-colors hover:text-violet-400"
                  >
                    ↓ 저장
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
