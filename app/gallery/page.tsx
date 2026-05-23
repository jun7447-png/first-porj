"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface GalleryImage {
  id: string;
  image_url: string;
  created_at: string;
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((data) => setImages(data.images ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 라이트박스 */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setLightboxImage(null)}
        >
          <div
            className="relative"
            style={{ maxWidth: 800, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setLightboxImage(null)}
              className="absolute -right-3 -top-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-zinc-300 shadow-lg transition-all hover:bg-zinc-700 hover:text-white"
              aria-label="닫기"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <img
              src={lightboxImage}
              alt="이미지 확대보기"
              className="w-full rounded-2xl border border-zinc-700 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 배경 글로우 */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-1/4 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-violet-600/10 blur-3xl" />
      </div>

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
        <h1 className="text-xl font-bold text-white">갤러리</h1>
        <div className="w-24" />
      </header>

      {/* 갤러리 본문 */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-cyan-400">Gallery</p>
          <h2 className="text-3xl font-bold text-white">AI 생성 이미지</h2>
          <p className="mt-3 text-zinc-400">SnapPage로 생성된 상품 이미지 모음입니다.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
          </div>
        ) : images.length === 0 ? (
          <div className="py-24 text-center text-zinc-500">
            아직 생성된 이미지가 없습니다.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((img) => (
              <button
                key={img.id}
                onClick={() => setLightboxImage(img.image_url)}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={img.image_url}
                    alt="생성된 이미지"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
