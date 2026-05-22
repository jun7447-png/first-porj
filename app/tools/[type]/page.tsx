"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getToolByType } from "@/lib/tools-config";

export default function ToolPage() {
  const router = useRouter();
  const params = useParams();
  const type = typeof params.type === "string" ? params.type : "";
  const tool = getToolByType(type);

  const [file, setFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); // 확대보기 대상
  const [imageHistory, setImageHistory] = useState<string[]>([]); // 이전 생성 결과 (세션 임시)
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // /tools/4 전용: 강조문구 입력 (프롬프트 비노출)
  const isT4 = type === "4";
  const [t4Phrase, setT4Phrase] = useState("올해의 인기 Pick"); // 예시 기본값

  // prompt4.txt 선택 반영 문구 30개
  const T4_PHRASES = [
    "Best 리뷰 추천 제품!",
    "누적 판매 1위, 이유가 있습니다",
    "평점 4.9점이 증명하는 퀄리티",
    "실제 구매자 극찬 아이템!",
    "한 번 쓰면 정착하게 되는 템",
    "SNS에서 난리 난 바로 그 화제작",
    "지인 추천으로 가장 많이 사는 제품",
    "이달의 완소템! 놓치지 마세요",
    "품절 임박! 수량 얼마 남지 않았어요",
    "역대급 특가, 오늘 마감!",
    "한정 수량 / 재입고 완료!",
    "망설이면 배송만 늦어질 뿐",
    "지금 사야 가장 저렴한 혜택",
    "아직도 고민 중? 곧 품절됩니다",
    "삶의 질 수직 상승 치트키",
    "나를 위한 가장 완벽한 선택",
    "매일 쓰고 싶은 일상 필수가전/템",
    "한 번 맛보면 헤어 나올 수 없는 만족감",
    "돈값 하는 진짜 꿀템 등장",
    "당신의 일상을 더 특별하게",
    "소소하지만 확실한 행복(소확행) 메이커",
    "선물용으로도 실패 없는 만족도 100%",
    "지금 바로 확인해 보세요!",
    "클릭할 수밖에 없는 역대급 퀄리티",
    "안 사면 무조건 손해 보는 템",
    "드디어 찾았다, 인생 아이템!",
    "이건 꼭 소장해야 해",
    "첫 눈에 반할 수밖에 없는 비주얼",
    "MD가 강력 추천하는 히든 템",
    "요즘 가장 핫한 트렌드 아이템",
  ];

  // /tools/5 전용 구조화 입력 상태
  const isT5 = type === "5";
  const [t5Product, setT5Product] = useState("");          // 제품명
  const [t5Title, setT5Title] = useState("");              // 타이틀
  const [t5Features, setT5Features] = useState("");        // 제품특징
  const [t5Hook, setT5Hook] = useState("");                // 후킹 문구
  const [t5Comment, setT5Comment] = useState("");          // 감성코멘트
  const [t5CopyLoading, setT5CopyLoading] = useState(false);   // 문구 생성 중
  const [t5CopyDone, setT5CopyDone] = useState(false);         // 최초 생성 여부

  // 인증 체크 + 기본 프롬프트 로드
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/");
    });

    if (!tool) { router.replace("/"); return; }

    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => {
        if (data.prompts?.[tool.promptIndex]) {
          setPrompt(data.prompts[tool.promptIndex]);
        }
      })
      .catch(() => {});
  }, [tool, router]);

  // 파일 선택 처리
  const handleFile = (f: File) => {
    if (!f.type.startsWith("image/")) return;
    setFile(f);
    setResultImage(null);
    setImageHistory([]); // 새 이미지 업로드 시 히스토리 초기화
    setError("");
    const reader = new FileReader();
    reader.onload = (e) => setUploadPreview(e.target?.result as string);
    reader.readAsDataURL(f);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  // 이미지 생성
  /** 가로 1200px 기준 리사이즈 + JPEG 85% 압축 */
  const compressImage = (src: File, maxWidth = 1200): Promise<File> =>
    new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(src);
      img.onload = () => {
        URL.revokeObjectURL(url);
        let { naturalWidth: w, naturalHeight: h } = img;
        if (w > maxWidth) { h = Math.round((h / w) * maxWidth); w = maxWidth; }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        canvas.toBlob(
          (blob) => resolve(new File([blob!], "image.jpg", { type: "image/jpeg" })),
          "image/jpeg", 0.85
        );
      };
      img.src = url;
    });

  /** 폴링: 완료될 때까지 3초마다 /api/job/[jobId] 조회 */
  const pollJob = async (jobId: string): Promise<string> => {
    const MAX = 100; // 최대 5분 (3s × 100)
    for (let i = 0; i < MAX; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const res = await fetch(`/api/job/${jobId}`);
      const data = await res.json();
      if (data.status === "done")   return data.imageUrl as string;
      if (data.status === "error")  throw new Error(data.error ?? "생성 실패");
      // pending | processing → 계속 폴링
    }
    throw new Error("이미지 생성 시간 초과 (5분)");
  };

  const generate = async () => {
    // 도구별 최종 프롬프트 조합
    // tool4: 핵심 지시문(고정) + 사용자 강조문구만 교체 적용
    //        → prompt 상태(전체 파일 내용) 사용 안 함 — 30개 목록·예시 제외
    // tool5: prompt5.txt(숨김) + 구조화 필드
    // 나머지: 기본 textarea 프롬프트
    const T4_BASE =
      "타이포그래피가 이미지 상하좌우 정중앙에 배치 크게 강조되어 적용.\n" +
      `타이포그래피 문구는 아래 1개의 문구로만 적용: "${t4Phrase}"\n` +
      "해당 글자 라인의 불투명도60%의 흰색 띠 적용.\n" +
      "업로드 이미지는 변형없이 배경이미지로만 사용.\n" +
      "The product is not a design reference; it is the final product that must be preserved exactly.";

    const activePrompt = isT4
      ? T4_BASE
      : isT5
      ? `${prompt}\n\n제품명: "${t5Product}"\n타이틀: "${t5Title}"\n제품특징: "${t5Features}"\n후킹 문구: "${t5Hook}"\n감성 코멘트: "${t5Comment}"`
      : prompt;

    if (!file || !activePrompt.trim()) return;
    setLoading(true);
    setError("");

    try {
      // 1. 가로 1800px 리사이징 (해상도·왜곡 균형점)
      const compressed = await compressImage(file, 1800);
      const safeFile = new File([compressed], "image.jpg", { type: "image/jpeg" });

      // 2. 한글 프롬프트 base64 인코딩 (ByteString 오류 방지)
      const enc = new TextEncoder();
      const promptBytes = enc.encode(activePrompt);
      let bin = "";
      for (const b of promptBytes) bin += String.fromCharCode(b);
      const promptB64 = btoa(bin);

      const formData = new FormData();
      formData.append("image", safeFile);
      formData.append("prompt_b64", promptB64);

      // 3. 비동기 작업 시작 → jobId 즉시 반환
      const startRes = await fetch("/api/generate/start", {
        method: "POST",
        body: formData,
      });

      const contentType = startRes.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        const text = await startRes.text();
        throw new Error(`서버 오류 (${startRes.status}): ${text.slice(0, 120)}`);
      }

      const startData = await startRes.json();

      if (startData.fallback) {
        const { generateCanvasImage } = await import("@/lib/canvas-templates");
        const canvasUrl = await generateCanvasImage(tool!.promptIndex, file);
        setResultImage(canvasUrl);
        return;
      }
      if (startData.error) throw new Error(startData.error as string);

      const { jobId } = startData as { jobId: string };

      // 4. 폴링으로 완료 대기
      const imageUrl = await pollJob(jobId);
      // 기존 결과가 있으면 히스토리에 추가 후 새 결과로 교체
      setResultImage((prev) => {
        if (prev) setImageHistory((h) => [prev, ...h]);
        return imageUrl;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "생성 실패. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  };

  if (!tool) return null;

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      {/* 라이트박스 — 현재 결과 및 히스토리 공용 */}
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
        <span className="flex items-center gap-2 text-2xl font-bold text-white" style={{ marginTop: 50, marginBottom: 50 }}>
          <span className="text-3xl">{tool.emoji}</span>
          {tool.name}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs text-violet-300">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
          AI 이미지 생성
        </span>
      </header>

      {/* 본문 */}
      <div className="py-4">
        <div className="flex flex-col items-center lg:flex-row lg:justify-center lg:items-stretch" style={{ gap: 50 }}>

          {/* ── 좌측: 업로드 + 결과 (300px 고정) ─────────────────── */}
          <div className="flex flex-col gap-4" style={{ width: 300, flexShrink: 0 }}>

            {/* 업로드 박스 */}
            <div>
              <p className="mb-2 text-sm font-semibold text-white">
                원본 이미지
              </p>
              <div
                className={`relative cursor-pointer overflow-hidden rounded-2xl border-2 transition-all ${
                  isDragging
                    ? "border-violet-500 bg-violet-500/10"
                    : uploadPreview
                    ? "border-zinc-700"
                    : "border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/30"
                }`}
              style={{ width: 300, height: 300 }}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={onDrop}
                onClick={() => !uploadPreview && inputRef.current?.click()}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
                />
                {uploadPreview ? (
                  <>
                    <img
                      src={uploadPreview}
                      alt="업로드 이미지"
                      className="h-full w-full object-contain"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setUploadPreview(null);
                        setResultImage(null);
                      }}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition-all hover:bg-black/80"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                      className="absolute bottom-2 right-2 rounded-lg bg-black/60 px-3 py-1 text-xs text-zinc-300 backdrop-blur-sm transition-all hover:bg-black/80"
                    >
                      변경
                    </button>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-zinc-700 bg-zinc-800/50">
                      <svg className="h-6 w-6 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-zinc-300">이미지를 드래그하거나 클릭</p>
                      <p className="mt-1 text-xs text-zinc-600">JPG, PNG, WEBP 지원</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 결과 이미지 박스 */}
            <div>
              <p className="mb-2 text-sm font-semibold text-white">
                생성 결과
              </p>
              <div
                className={`relative overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 ${
                  resultImage ? "cursor-pointer" : ""
                }`}
              style={{ width: 300, height: 300 }}
                onClick={() => resultImage && setLightboxImage(resultImage)}
              >
                {resultImage ? (
                  <>
                    <img
                      src={resultImage}
                      alt="생성 결과"
                      className="h-full w-full object-contain transition-opacity hover:opacity-90"
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                      <div className="flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2 backdrop-blur-sm">
                        <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                        </svg>
                        <span className="text-sm text-white">확대보기</span>
                      </div>
                    </div>
                    <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-green-400 backdrop-blur-sm">
                      ✓ AI 생성
                    </div>
                  </>
                ) : loading ? (
                  <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
                    <p className="text-sm text-zinc-500">AI 생성 중…</p>
                    <p className="text-xs text-zinc-700">백그라운드 처리 중입니다<br/>잠시 기다려 주세요 (30~90초)</p>
                  </div>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center">
                    <span className="text-4xl opacity-15">🖼️</span>
                    <p className="text-xs text-zinc-700">
                      {file ? "AI이미지생성 버튼을 클릭하세요" : "이미지를 먼저 업로드하세요"}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* 오류 메시지 */}
            {error && (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* 버튼 — 이미지 박스(300px)와 동일 너비 */}
            <div className="flex gap-3" style={{ width: 300 }}>
              <button
                onClick={generate}
                disabled={!file || loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    생성 중...
                  </>
                ) : (
                  <>
                    <span>{tool.emoji}</span>
                    AI이미지생성
                  </>
                )}
              </button>
              <button
                onClick={generate}
                disabled={!resultImage || loading}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02] hover:shadow-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                다시생성
              </button>
            </div>

            {/* 이전 생성 결과 히스토리 (세션 임시저장) */}
            {imageHistory.length > 0 && (
              <div className="flex flex-col gap-3 mt-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                  이전 생성 결과 ({imageHistory.length}개)
                </p>
                {imageHistory.map((imgUrl, idx) => (
                  <div key={idx} className="flex flex-col gap-2">
                    <div
                      className="relative cursor-pointer overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900"
                      style={{ width: 300, height: 300 }}
                      onClick={() => setLightboxImage(imgUrl)}
                    >
                      <img
                        src={imgUrl}
                        alt={`이전 결과 ${idx + 1}`}
                        className="h-full w-full object-contain transition-opacity hover:opacity-90"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity hover:opacity-100">
                        <div className="flex items-center gap-2 rounded-xl bg-black/60 px-4 py-2 backdrop-blur-sm">
                          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />
                          </svg>
                          <span className="text-sm text-white">확대보기</span>
                        </div>
                      </div>
                      <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-zinc-400 backdrop-blur-sm">
                        {idx + 1}번째 이전
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const a = document.createElement("a");
                        a.href = imgUrl;
                        a.download = `result-prev-${idx + 1}.png`;
                        a.click();
                      }}
                      className="rounded-lg border border-zinc-700 py-1.5 text-xs text-zinc-400 transition-all hover:border-violet-500/50 hover:text-violet-300"
                      style={{ width: 300 }}
                    >
                      다운로드
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 우측: 프롬프트 (500px 고정, 좌측 컬럼 높이에 맞춤) ─── */}
          <div className="flex flex-col gap-3" style={{ width: 500, flexShrink: 0, minHeight: 0 }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">
                {isT4
                  ? "강조문구 입력"
                  : isT5
                  ? "제품명 입력(이미지 생성 문구 자동 생성)"
                  : "프롬프트"}
              </p>
              {!isT4 && !isT5 && <span className="text-xs text-white">직접 수정 가능</span>}
            </div>

            {isT4 ? (
              /* ── /tools/4 전용: 강조문구 입력 (이미지 프롬프트 비노출) ── */
              <div className="flex flex-1 flex-col gap-4">
                {/* 강조문구 입력 */}
                <div className="flex flex-col gap-2">
                  <input
                    type="text"
                    value={t4Phrase}
                    onChange={(e) => setT4Phrase(e.target.value)}
                    placeholder="예: 올해의 인기 Pick"
                    className="w-full rounded-xl border border-violet-500/50 bg-zinc-800 px-4 py-3 text-base font-semibold text-white placeholder-zinc-500 outline-none transition-all focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20"
                  />
                  <p className="text-xs text-zinc-500">
                    예시: "올해의 인기 Pick" · "지금 바로 구매" · "베스트 셀러" · "한정 특가"
                  </p>
                </div>

                {/* 안내 박스 */}
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-5 flex flex-col gap-3">
                  <p className="text-sm font-semibold text-white">적용 방식</p>
                  <ul className="space-y-2 text-sm text-zinc-400">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-violet-400">①</span>
                      입력한 강조문구가 제품 이미지 <strong className="text-white">정중앙에 크게</strong> 배치됩니다.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-violet-400">②</span>
                      문구 라인에 <strong className="text-white">흰색 반투명 띠(불투명도 60%)</strong>가 적용됩니다.
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-violet-400">③</span>
                      제품 원본 이미지는 그대로 유지됩니다.
                    </li>
                  </ul>
                </div>

                {/* 선택 반영 문구 30개 */}
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-semibold text-white">선택 반영 문구</p>
                  <p className="text-xs text-white">문구를 클릭하면 강조문구 입력란에 바로 반영됩니다. 직접수정도 가능합니다.</p>
                  <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60">
                    {T4_PHRASES.map((phrase, idx) => (
                      <button
                        key={idx}
                        onClick={() => setT4Phrase(phrase)}
                        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors hover:bg-violet-500/10 hover:text-violet-300 ${
                          t4Phrase === phrase
                            ? "bg-violet-500/15 text-violet-300 font-medium"
                            : "text-zinc-300"
                        } ${idx !== T4_PHRASES.length - 1 ? "border-b border-zinc-800" : ""}`}
                      >
                        <span className="w-6 shrink-0 text-xs text-zinc-600">{idx + 1}.</span>
                        {phrase}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-300">
                  💡 강조문구를 직접 수정하거나 목록에서 선택 후 AI이미지생성 버튼을 클릭하세요.
                </p>
              </div>
            ) : isT5 ? (
              /* ── /tools/5 전용: 제품명 입력 → ChatGPT 자동 생성 ── */
              <div className="flex flex-1 flex-col gap-4 overflow-y-auto">

                {/* 제품명 입력 + 문구 다시생성 버튼 */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={t5Product}
                    onChange={(e) => setT5Product(e.target.value)}
                    placeholder="제품명을 입력하세요 (예: 무선 청소기)"
                    className="flex-1 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                  />
                  <button
                    onClick={async () => {
                      if (!t5Product.trim()) return;
                      setT5CopyLoading(true);
                      try {
                        const res = await fetch("/api/generate-copy", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ productName: t5Product }),
                        });
                        const data = await res.json();
                        if (data.error) { setError(data.error); return; }
                        setT5Title(data.title ?? "");
                        setT5Features(data.features ?? "");
                        setT5Hook(data.hook ?? "");
                        setT5Comment(data.comment ?? "");
                        setT5CopyDone(true);
                      } catch (e) {
                        setError(e instanceof Error ? e.message : "문구 생성 실패");
                      } finally {
                        setT5CopyLoading(false);
                      }
                    }}
                    disabled={!t5Product.trim() || t5CopyLoading}
                    className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:scale-105 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {t5CopyLoading ? (
                      <><span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/40 border-t-white" />생성 중...</>
                    ) : t5CopyDone ? (
                      <>↺ 다시생성</>
                    ) : (
                      <>✦ 생성</>
                    )}
                  </button>
                </div>

                {/* 도움말 */}
                <p className="rounded-xl border border-violet-500/20 bg-violet-500/5 px-4 py-2.5 text-xs text-violet-300">
                  💡 해당 내용은 제품에 맞게 수정해서 이미지를 생성하세요.
                </p>

                {/* 박스 1: 타이틀 + 제품특징 */}
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-400">타이틀</label>
                    <input
                      type="text"
                      value={t5Title}
                      onChange={(e) => setT5Title(e.target.value)}
                      placeholder="ChatGPT가 자동 생성합니다"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-400">제품 특징</label>
                    <textarea
                      value={t5Features}
                      onChange={(e) => setT5Features(e.target.value)}
                      placeholder="ChatGPT가 자동 생성합니다"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>

                {/* 박스 2: 후킹 문구 + 감성코멘트 */}
                <div className="rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 flex flex-col gap-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-400">후킹 문구</label>
                    <input
                      type="text"
                      value={t5Hook}
                      onChange={(e) => setT5Hook(e.target.value)}
                      placeholder="ChatGPT가 자동 생성합니다"
                      className="w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-widest text-zinc-400">감성 코멘트</label>
                    <textarea
                      value={t5Comment}
                      onChange={(e) => setT5Comment(e.target.value)}
                      placeholder="ChatGPT가 자동 생성합니다"
                      rows={3}
                      className="w-full resize-none rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm text-white placeholder-zinc-600 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* ── 일반 도구: 기존 단일 textarea ── */
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="이미지 생성 프롬프트를 입력하세요..."
                className="w-full flex-1 resize-none rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 text-sm leading-relaxed text-zinc-300 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                style={{ width: 500, overflowY: "auto" }}
              />
            )}

            <p className="text-xs text-white">
              ✦ 프롬프트를 수정한 뒤 AI이미지생성 버튼을 눌러 새로운 결과를 확인하세요.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
