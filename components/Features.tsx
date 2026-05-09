const features = [
  {
    icon: "📷",
    title: "사진만 올리면 끝",
    description:
      "복잡한 편집 프로그램 없이 제품 사진을 업로드하는 것만으로 작업이 시작됩니다. 누구나 바로 사용할 수 있습니다.",
    gradient: "from-violet-500/10 to-violet-500/5",
    border: "border-violet-500/20",
    iconBg: "bg-violet-500/15",
  },
  {
    icon: "⚡",
    title: "30초 만에 완성",
    description:
      "AI가 배경 제거, 레이아웃 구성, 텍스트 배치를 자동으로 처리합니다. 기다릴 시간도 없이 결과물이 완성됩니다.",
    gradient: "from-cyan-500/10 to-cyan-500/5",
    border: "border-cyan-500/20",
    iconBg: "bg-cyan-500/15",
  },
  {
    icon: "📦",
    title: "바로 사용 가능",
    description:
      "쇼핑몰, SNS, 광고에 바로 올릴 수 있는 고해상도 이미지로 출력됩니다. 추가 편집 없이 즉시 활용하세요.",
    gradient: "from-fuchsia-500/10 to-fuchsia-500/5",
    border: "border-fuchsia-500/20",
    iconBg: "bg-fuchsia-500/15",
  },
];

export default function Features() {
  return (
    <section className="px-6 py-24">
      <div className="mx-auto max-w-5xl">
        {/* 섹션 헤더 */}
        <div className="mb-16 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-widest text-violet-400">
            Features
          </p>
          <h2 className="text-4xl font-bold text-white">
            왜 SnapPage인가요?
          </h2>
          <p className="mt-4 text-zinc-400">
            전문 디자이너 없이도 프로 수준의 상품 이미지를 만들 수 있습니다.
          </p>
        </div>

        {/* 카드 그리드 */}
        <div className="grid gap-6 sm:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className={`relative rounded-2xl border ${f.border} bg-gradient-to-b ${f.gradient} p-6 transition-transform hover:-translate-y-1`}
            >
              <div className={`mb-4 inline-flex rounded-xl ${f.iconBg} p-3 text-2xl`}>
                {f.icon}
              </div>
              <h3 className="mb-2 text-lg font-semibold text-white">{f.title}</h3>
              <p className="text-sm leading-relaxed text-zinc-400">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
