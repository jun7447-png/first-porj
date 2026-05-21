"use client";

import { TOOLS } from "@/lib/tools-config";

interface HeroProps {
  onStart: (toolType: string) => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-32 text-center">
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

      {/* 5개 도구 버튼 그리드 */}
      <div className="mt-12 grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {TOOLS.map((tool) => (
          <button
            key={tool.type}
            onClick={() => onStart(tool.type)}
            className="group flex flex-col items-center gap-2.5 rounded-2xl border border-zinc-800 bg-zinc-900/60 px-4 py-5 text-center transition-all hover:border-violet-500/50 hover:bg-zinc-800/80 hover:shadow-lg hover:shadow-violet-500/10"
          >
            <span className="text-3xl transition-transform group-hover:scale-110">
              {tool.emoji}
            </span>
            <span className="text-sm font-semibold leading-tight text-white">
              {tool.shortName}
            </span>
            <span className="text-xs leading-snug text-zinc-500">
              {tool.description}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
