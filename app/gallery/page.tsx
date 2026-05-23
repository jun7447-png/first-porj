"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type GalleryItem = {
  id: string;
  user_id: string;
  tool_name: string;
  image_url: string;
  created_at: string;
};

export default function GalleryPage() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.items ?? []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const shortId = (uid: string) => uid.slice(0, 8).toUpperCase();

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute right-1/4 bottom-1/4 h-[300px] w-[300px] rounded-full bg-cyan-500/8 blur-3xl" />
      </div>

      {/* 라이트박스 */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxUrl(null)}
        >
          <div
            className="relative"
            style={{ maxWidth: 800, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-lg transition-all hover:bg-zinc-700 hover:text-white"
              aria-label="닫기"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={lightboxUrl}
              alt="갤러리 이미지"
              className="w-full rounded-2xl border border-zinc-700 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 헤더 */}
      <header className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium text-white transition-colors hover:text-zinc-300"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          메인으로
        </Link>
        <span className="text-lg font-bold text-white">AI 이미지 갤러리</span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          최신 생성 이미지
        </span>
      </header>

      {/* 본문 */}
      <div className="px-6 py-10">
        {/* 타이틀 */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-violet-400">Gallery</p>
          <h1 className="text-3xl font-bold text-white">
            AI가 만든 상품 이미지 모음
          </h1>
          <p className="mt-3 text-zinc-400">
            SnapPage 사용자들이 생성한 최신 AI 상품 이미지 {items.length > 0 ? `(${items.length}개)` : ""}
          </p>
        </div>

        {/* 로딩 */}
        {loading ? (
          <div className="flex justify-center py-24">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <span className="text-5xl opacity-20">🖼️</span>
            <p className="mt-4 text-zinc-500">아직 생성된 이미지가 없습니다.</p>
            <Link
              href="/"
              className="mt-6 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-3 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
            >
              첫 번째 이미지 만들기 →
            </Link>
          </div>
        ) : (
          /* 5열 그리드 */
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {items.map((item) => (
              <div key={item.id} className="flex flex-col items-center gap-2">
                {/* 썸네일 */}
                <div
                  className="group relative cursor-pointer overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900 transition-all hover:border-violet-500/60 hover:shadow-lg hover:shadow-violet-500/10"
                  style={{ width: 200, height: 200 }}
                  onClick={() => setLightboxUrl(item.image_url)}
                >
                  <img
                    src={item.image_url}
                    alt={item.tool_name}
                    className="h-full w-full object-contain transition-opacity group-hover:opacity-90"
                  />
                  {/* 호버 오버레이 */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex items-center gap-1.5 rounded-xl bg-black/60 px-3 py-1.5 backdrop-blur-sm">
                      <svg className="h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                      </svg>
                      <span className="text-xs text-white">확대</span>
                    </div>
                  </div>
                  {/* 도구 배지 */}
                  <div className="absolute left-1.5 top-1.5 rounded-full bg-black/60 px-2 py-0.5 text-xs text-violet-300 backdrop-blur-sm">
                    {item.tool_name ?? "AI생성"}
                  </div>
                </div>

                {/* 사용자 ID + 날짜 */}
                <div className="w-full text-center" style={{ maxWidth: 200 }}>
                  <p className="truncate text-xs font-mono font-semibold text-zinc-300">
                    ID: {shortId(item.user_id)}
                  </p>
                  <p className="text-xs text-zinc-600">
                    {new Date(item.created_at).toLocaleDateString("ko-KR", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 푸터 */}
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
