"use client";

import { useState, useEffect } from "react";
import { TOOLS } from "@/lib/tools-config";

// Tailwind purge 대응: 완전한 클래스 문자열만 사용 (동적 조합 금지)
const GRID_COLS: Record<number, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 sm:grid-cols-3",
  4: "grid-cols-2 sm:grid-cols-4",
  5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
  6: "grid-cols-2 sm:grid-cols-3",
  7: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  8: "grid-cols-2 sm:grid-cols-4",
};

interface HeroProps {
  onStart: (toolType: string) => void;
}

export default function Hero({ onStart }: HeroProps) {
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/preview-images")
      .then((r) => r.json())
      .then((data) => { if (data.previews) setPreviews(data.previews); })
      .catch(() => {});
  }, []);

  const gridClass = GRID_COLS[TOOLS.length] ?? "grid-cols-2 sm:grid-cols-3";

  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center">
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
              alt="결과 이미지 확대보기"
              className="w-full rounded-2xl border border-zinc-700 shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* 배경 글로우 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-1/3 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* 배지 */}
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
        AI 기반 상품 이미지 생성
      </span>

      {/* 헤드라인 */}
      <h1 className="max-w-3xl text-5xl font-bold tracking-tight text-white sm:text-6xl lg:text-7xl">
        제품 사진 몇 장으로
        <br />
        <span className="bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
          상품 페이지를 완성하세요
        </span>
      </h1>

      <p className="mt-6 max-w-xl text-lg text-zinc-400">
        배경 제거 → 컨셉 연출 → 클로즈업 강조까지, AI가 30초 만에 처리합니다.
        원하는 스타일을 선택하고 바로 시작해 보세요.
      </p>

      {/* 도구 카드 그리드 */}
      <div className={`mt-12 grid w-full max-w-4xl gap-3 ${gridClass}`}>
        {TOOLS.map((tool) => {
          const thumbUrl = previews[tool.type];
          return (
            <button
              key={tool.type}
              onClick={() => onStart(tool.type)}
              className="group flex flex-col items-center gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 pb-4 pt-5 text-center transition-all hover:border-violet-500/50 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-violet-500/10"
            >
              {/* 텍스트 영역 */}
              <span className="text-3xl transition-transform group-hover:scale-110">
                {tool.emoji}
              </span>
              <span className="text-sm font-semibold leading-tight text-white">
                {tool.shortName}
              </span>
              <span className="text-xs leading-snug text-zinc-500">
                {tool.description}
              </span>

              {/* 썸네일 영역 */}
              <div
                className="mt-1 w-full overflow-hidden rounded-xl"
                style={{ aspectRatio: "1 / 1" }}
                onClick={(e) => {
                  if (thumbUrl) {
                    e.stopPropagation();
                    setLightboxUrl(thumbUrl);
                  }
                }}
              >
                {thumbUrl ? (
                  <img
                    src={thumbUrl}
                    alt={`${tool.shortName} 결과 샘플`}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center rounded-xl border border-dashed border-zinc-700 bg-zinc-800/40">
                    <span className="text-xs text-zinc-600">샘플 없음</span>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
