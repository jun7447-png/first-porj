"use client";

interface HeroProps {
  onStart: () => void;
}

export default function Hero({ onStart }: HeroProps) {
  return (
    <section className="relative flex flex-col items-center justify-center min-h-screen px-6 text-center overflow-hidden">
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
        <button className="rounded-xl border border-zinc-700 bg-zinc-900 px-8 py-3.5 text-base font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white">
          데모 보기
        </button>
      </div>

      {/* 모형 이미지 */}
      <div className="mt-20 w-full max-w-4xl">
        <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/60 p-1 shadow-2xl shadow-black/50 backdrop-blur">
          <div className="flex items-center gap-1.5 px-4 py-3 border-b border-zinc-800">
            <span className="h-3 w-3 rounded-full bg-red-500/70" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/70" />
            <span className="h-3 w-3 rounded-full bg-green-500/70" />
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 sm:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="aspect-square rounded-xl bg-gradient-to-br from-zinc-800 to-zinc-900 border border-zinc-700/50 flex items-center justify-center"
              >
                <span className="text-3xl opacity-30">📷</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center py-4 gap-3">
            <div className="h-px w-16 bg-gradient-to-r from-transparent to-violet-500/50" />
            <span className="text-xs text-zinc-500">AI 처리 중…</span>
            <div className="h-px w-16 bg-gradient-to-l from-transparent to-cyan-500/50" />
          </div>
          <div className="grid grid-cols-2 gap-4 p-6 pt-0">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="aspect-video rounded-xl bg-gradient-to-br from-violet-900/40 to-cyan-900/20 border border-violet-700/30 flex items-center justify-center"
              >
                <span className="text-2xl opacity-50">🖼️</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
