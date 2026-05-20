"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { TEMPLATE_LIST } from "@/lib/templates";
import { generateCanvasImage } from "@/lib/canvas-templates";

interface GenerateResultsProps {
  files: File[];
  onReset: () => void;
}

type CardState = {
  imageUrl: string | null;
  loading: boolean;
  error: string | null;
  isCanvas: boolean;
};

type ErrorAlert = {
  visible: boolean;
  templateName: string;
  message: string;
  resolve: (() => void) | null;
};

export default function GenerateResults({ files, onReset }: GenerateResultsProps) {
  const [prompts, setPrompts] = useState<string[]>([]);
  const [cards, setCards] = useState<CardState[]>(
    TEMPLATE_LIST.map(() => ({ imageUrl: null, loading: false, error: null, isCanvas: false }))
  );
  const [alert, setAlert] = useState<ErrorAlert>({
    visible: false,
    templateName: "",
    message: "",
    resolve: null,
  });
  const initializedRef = useRef(false);

  // 프롬프트 파일 로드
  useEffect(() => {
    fetch("/api/prompts")
      .then((r) => r.json())
      .then((data) => {
        if (data.prompts) setPrompts(data.prompts);
      })
      .catch(() => {
        setPrompts(TEMPLATE_LIST.map(() => ""));
      });
  }, []);

  /** 이미지 1장 생성 — 성공 시 null, 실패 시 오류 메시지 반환 */
  const generateImage = useCallback(
    async (index: number, promptText: string): Promise<string | null> => {
      if (!files[0]) return null;

      setCards((prev) =>
        prev.map((c, i) => (i === index ? { ...c, loading: true, error: null } : c))
      );

      const formData = new FormData();
      formData.append("image", files[0]);
      formData.append("prompt", promptText);

      try {
        const res = await fetch("/api/generate", { method: "POST", body: formData });
        const data = await res.json();

        // API 키 없음 → Canvas 폴백
        if (data.fallback) {
          const canvasUrl = await generateCanvasImage(index, files[0]);
          setCards((prev) =>
            prev.map((c, i) =>
              i === index ? { ...c, loading: false, imageUrl: canvasUrl, isCanvas: true } : c
            )
          );
          return null;
        }

        if (data.error) {
          setCards((prev) =>
            prev.map((c, i) => (i === index ? { ...c, loading: false, error: data.error } : c))
          );
          return data.error as string;
        }

        setCards((prev) =>
          prev.map((c, i) =>
            i === index ? { ...c, loading: false, imageUrl: data.imageUrl, isCanvas: false } : c
          )
        );
        return null;
      } catch (e) {
        const msg = e instanceof Error ? e.message : "서버 연결에 실패했습니다.";
        setCards((prev) =>
          prev.map((c, i) => (i === index ? { ...c, loading: false, error: msg } : c))
        );
        return msg;
      }
    },
    [files]
  );

  /** 오류 알럿 표시 후 사용자가 닫을 때까지 대기 */
  const showErrorAlert = (templateName: string, message: string): Promise<void> =>
    new Promise((resolve) => {
      setAlert({ visible: true, templateName, message, resolve });
    });

  const dismissAlert = () => {
    setAlert((prev) => {
      prev.resolve?.();
      return { visible: false, templateName: "", message: "", resolve: null };
    });
  };

  /** 프롬프트 로드 완료 시 순차 자동 생성 */
  useEffect(() => {
    if (prompts.length === 0 || initializedRef.current) return;
    initializedRef.current = true;

    (async () => {
      for (let i = 0; i < TEMPLATE_LIST.length; i++) {
        const error = await generateImage(i, prompts[i]);
        if (error) {
          await showErrorAlert(TEMPLATE_LIST[i].name, error);
          // 알럿 닫은 후 다음 템플릿으로 계속 진행
        }
      }
    })();
  }, [prompts, generateImage]);

  /** 수동 재실행 */
  const handleRerun = async (index: number, promptText: string) => {
    const error = await generateImage(index, promptText);
    if (error) {
      await showErrorAlert(TEMPLATE_LIST[index].name, error);
    }
  };

  const updatePrompt = (index: number, value: string) => {
    setPrompts((prev) => prev.map((p, i) => (i === index ? value : p)));
  };

  const downloadOne = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.png`;
    a.click();
  };

  const downloadAll = () => {
    cards.forEach((card, i) => {
      if (card.imageUrl)
        setTimeout(() => downloadOne(card.imageUrl!, TEMPLATE_LIST[i].name), i * 200);
    });
  };

  const doneCount = cards.filter((c) => c.imageUrl).length;
  const allDone = doneCount === TEMPLATE_LIST.length;
  const activeIndex = cards.findIndex((c) => c.loading);

  return (
    <>
      {/* ── 오류 알럿 모달 ──────────────────────────────────────────────────── */}
      {alert.visible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-red-500/30 bg-zinc-950 shadow-2xl">
            {/* 헤더 */}
            <div className="flex items-center gap-3 border-b border-zinc-800 px-6 py-4">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-500/15">
                <svg
                  className="h-5 w-5 text-red-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-white">이미지 생성 오류</p>
                <p className="text-xs text-zinc-500">
                  [{alert.templateName}] 처리 중 오류가 발생했습니다
                </p>
              </div>
            </div>

            {/* 오류 코드 */}
            <div className="px-6 py-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">
                오류 코드 / 내용
              </p>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
                <pre className="whitespace-pre-wrap break-all font-mono text-xs leading-relaxed text-red-300">
                  {alert.message}
                </pre>
              </div>
              <p className="mt-3 text-xs text-zinc-600">
                오류를 확인한 후 계속 진행하거나 처음으로 돌아가서 다시 시도하세요.
              </p>
            </div>

            {/* 버튼 */}
            <div className="flex justify-end gap-3 border-t border-zinc-800 px-6 py-4">
              <button
                onClick={onReset}
                className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
              >
                처음으로
              </button>
              <button
                onClick={dismissAlert}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:scale-105"
              >
                계속 진행 →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 결과 본문 ────────────────────────────────────────────────────────── */}
      <div className="p-6 sm:p-8">
        {/* 헤더 */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {allDone ? "생성 완료! 🎉" : "상품 이미지 생성 중..."}
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              {allDone
                ? "모든 이미지가 완성되었습니다. 프롬프트를 수정하고 재실행할 수 있습니다."
                : activeIndex >= 0
                ? `${activeIndex + 1}번 템플릿 생성 중… (${doneCount + 1} / ${TEMPLATE_LIST.length})`
                : `${doneCount} / ${TEMPLATE_LIST.length} 완료`}
            </p>
          </div>
          <div className="flex gap-2">
            {allDone && (
              <button
                onClick={downloadAll}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
              >
                전체 다운로드
              </button>
            )}
            <button
              onClick={onReset}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-5 py-2.5 text-sm font-medium text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              ← 처음으로
            </button>
          </div>
        </div>

        {/* 진행 바 */}
        {!allDone && (
          <div className="mb-6 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
              style={{ width: `${(doneCount / TEMPLATE_LIST.length) * 100}%` }}
            />
          </div>
        )}

        {/* 결과 카드 목록 */}
        <div className="space-y-5">
          {TEMPLATE_LIST.map((t, i) => {
            const card = cards[i];
            const prompt = prompts[i] ?? "";

            return (
              <div
                key={t.id}
                className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 sm:flex-row sm:gap-6"
              >
                {/* 이미지 영역 */}
                <div className="flex shrink-0 flex-col gap-2 sm:w-56">
                  <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-zinc-700 bg-zinc-900">
                    {card.imageUrl ? (
                      <img src={card.imageUrl} alt={t.name} className="h-full w-full object-cover" />
                    ) : card.error ? (
                      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
                        <svg
                          className="h-8 w-8 text-red-500/50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                          />
                        </svg>
                        <span className="text-xs text-red-400">생성 실패</span>
                      </div>
                    ) : (
                      <div className="flex h-full flex-col items-center justify-center gap-2">
                        {card.loading ? (
                          <>
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-600 border-t-violet-400" />
                            <span className="text-xs text-zinc-500">생성 중…</span>
                          </>
                        ) : (
                          <>
                            <span className="text-2xl opacity-20">🖼️</span>
                            <span className="text-xs text-zinc-700">대기 중</span>
                          </>
                        )}
                      </div>
                    )}
                    {card.imageUrl && (
                      <div
                        className={`absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs backdrop-blur-sm ${
                          card.isCanvas ? "text-amber-400" : "text-green-400"
                        }`}
                      >
                        {card.isCanvas ? "Canvas 미리보기" : "✓ AI 생성"}
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">{t.name}</p>
                    <p className="text-xs text-zinc-500">{t.description}</p>
                  </div>
                  {card.imageUrl && (
                    <button
                      onClick={() => downloadOne(card.imageUrl!, t.name)}
                      className="rounded-lg border border-zinc-700 py-1.5 text-xs text-zinc-400 transition-all hover:border-violet-500/50 hover:text-violet-300"
                    >
                      다운로드
                    </button>
                  )}
                </div>

                {/* 프롬프트 편집 */}
                <div className="flex flex-1 flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium uppercase tracking-widest text-zinc-500">
                      프롬프트 {i + 1}
                    </label>
                    {card.imageUrl && (
                      <span className="text-xs text-zinc-600">수정 후 재실행 가능</span>
                    )}
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => updatePrompt(i, e.target.value)}
                    rows={8}
                    className="flex-1 resize-none rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-xs leading-relaxed text-zinc-300 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    placeholder="프롬프트를 입력하세요..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={() => handleRerun(i, prompt)}
                      disabled={card.loading || !prompt.trim()}
                      className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-105 hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {card.loading ? (
                        <>
                          <span className="h-3.5 w-3.5 animate-spin rounded-full border border-white/40 border-t-white" />
                          생성 중...
                        </>
                      ) : (
                        "재실행 →"
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
