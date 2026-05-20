"use client";

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center px-6 pt-32 pb-24 text-center overflow-hidden">
      {/* 배경 글로우 */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-violet-600/20 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-cyan-500/10 blur-3xl" />
      </div>

      {/* 배지 */}
      <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
        <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
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
        배경 제거 → 레이아웃 구성 → 텍스트 배치까지, AI가 30초 만에 처리합니다.
        복잡한 편집 프로그램 없이 바로 사용 가능한 이미지를 얻으세요.
      </p>

      {/* CTA */}
      <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
        <button
          onClick={onStart}
          className="group relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:scale-105"
        >
          지금 시작하기 →
          <span className="absolute inset-0 -z-10 bg-gradient-to-r from-violet-500 to-cyan-400 opacity-0 transition-opacity group-hover:opacity-100" />
        </button>
      </div>
    </section>
  );
}
