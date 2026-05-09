"use client";

const steps = [
  {
    number: "01",
    title: "제품 사진 업로드",
    description: "스마트폰으로 찍은 사진도 괜찮습니다. 여러 각도의 사진을 올릴수록 더 풍부한 결과물이 만들어집니다.",
    icon: "📤",
  },
  {
    number: "02",
    title: "AI 자동 생성",
    description: "AI가 배경을 제거하고 최적의 레이아웃을 선택합니다. 제품 특성에 맞는 분위기와 텍스트도 자동 구성됩니다.",
    icon: "🤖",
  },
  {
    number: "03",
    title: "다운로드 & 사용",
    description: "생성된 이미지를 확인하고 마음에 드는 것을 다운로드하세요. 쇼핑몰이나 SNS에 바로 업로드하면 끝입니다.",
    icon: "✅",
  },
];

interface HowItWorksProps {
  onStart: () => void;
}

export default function HowItWorks({ onStart }: HowItWorksProps) {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-cyan-400">
            How it works
          </p>
          <h2 className="text-4xl font-bold text-white">
            3단계로 끝나는 상품 이미지
          </h2>
          <p className="mt-4 text-zinc-400">
            복잡한 설정 없이 누구나 30초 안에 완성할 수 있습니다.
          </p>
        </div>

        <div className="relative">
          <div className="absolute left-1/2 top-10 hidden h-[calc(100%-5rem)] w-px -translate-x-1/2 bg-gradient-to-b from-violet-500/40 via-cyan-500/40 to-transparent lg:block" />
          <div className="grid gap-8 lg:grid-cols-3">
            {steps.map((step, idx) => (
              <div key={step.number} className="relative flex flex-col items-center text-center">
                <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900 shadow-lg">
                  <span className="text-3xl">{step.icon}</span>
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-cyan-500 text-xs font-bold text-white">
                    {idx + 1}
                  </span>
                </div>
                <div className="mb-2 text-xs font-mono font-semibold tracking-widest text-zinc-600">
                  {step.number}
                </div>
                <h3 className="mb-3 text-xl font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-relaxed text-zinc-400">{step.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 flex flex-col items-center gap-4">
          <p className="text-zinc-400">지금 바로 첫 번째 상품 이미지를 만들어 보세요.</p>
          <button
            onClick={onStart}
            className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:scale-105 hover:shadow-violet-500/40"
          >
            무료로 시작하기 →
          </button>
        </div>
      </div>
    </section>
  );
}
