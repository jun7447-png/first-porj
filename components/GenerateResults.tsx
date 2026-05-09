"use client";

import { useEffect, useRef, useState } from "react";
import { generateAllTemplates, TEMPLATE_LIST } from "@/lib/templates";

interface GenerateResultsProps {
  files: File[];
  onReset: () => void;
}

export default function GenerateResults({ files, onReset }: GenerateResultsProps) {
  const [results, setResults] = useState<(string | null)[]>(
    Array(TEMPLATE_LIST.length).fill(null)
  );
  const [generatingIdx, setGeneratingIdx] = useState(0);
  const [done, setDone] = useState(false);
  const cancelled = useRef(false);

  useEffect(() => {
    cancelled.current = false;
    generateAllTemplates(files, (i, url) => {
      if (cancelled.current) return;
      setResults((prev) => {
        const next = [...prev];
        next[i] = url;
        return next;
      });
      setGeneratingIdx(i + 1);
      if (i === TEMPLATE_LIST.length - 1) setDone(true);
    });
    return () => { cancelled.current = true; };
  }, [files]);

  const downloadOne = (url: string, name: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${name}.jpg`;
    a.click();
  };

  const downloadAll = () => {
    results.forEach((url, i) => {
      if (url) setTimeout(() => downloadOne(url, TEMPLATE_LIST[i].name), i * 200);
    });
  };

  const doneCount = results.filter(Boolean).length;

  return (
    <div className="p-8 sm:p-10">
      {/* 헤더 */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">
            {done ? "생성 완료! 🎉" : "상품 이미지 생성 중..."}
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {done
              ? `5가지 디자인 템플릿이 모두 완성되었습니다`
              : `${doneCount} / ${TEMPLATE_LIST.length} 생성 중`}
          </p>
        </div>
        <div className="flex gap-2">
          {done && (
            <button
              onClick={downloadAll}
              className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105"
            >
              전체 다운로드 (5장)
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
      {!done && (
        <div className="mb-8 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 transition-all duration-700"
            style={{ width: `${(doneCount / TEMPLATE_LIST.length) * 100}%` }}
          />
        </div>
      )}

      {/* 카드 그리드 */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {TEMPLATE_LIST.map((t, i) => (
          <div key={t.id} className="flex flex-col gap-2">
            {/* 이미지 카드 */}
            <div className="relative aspect-square overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900">
              {results[i] ? (
                <img
                  src={results[i]!}
                  alt={t.name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-2">
                  {i === generatingIdx ? (
                    <>
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
                      <span className="text-xs text-zinc-500">생성 중…</span>
                    </>
                  ) : (
                    <>
                      <span className="text-2xl opacity-15">🖼️</span>
                      <span className="text-xs text-zinc-700">대기 중</span>
                    </>
                  )}
                </div>
              )}

              {/* 완성 뱃지 */}
              {results[i] && (
                <div className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-xs text-green-400 backdrop-blur-sm">
                  ✓ 완성
                </div>
              )}
            </div>

            {/* 템플릿 이름 */}
            <p className="text-center text-xs font-medium text-zinc-300">{t.name}</p>
            <p className="text-center text-xs text-zinc-600 leading-tight">{t.description}</p>

            {/* 다운로드 버튼 */}
            {results[i] ? (
              <button
                onClick={() => downloadOne(results[i]!, t.name)}
                className="rounded-lg border border-zinc-700 bg-zinc-900 py-1.5 text-xs text-zinc-400 transition-all hover:border-violet-500/50 hover:text-violet-300"
              >
                다운로드
              </button>
            ) : (
              <div className="rounded-lg border border-zinc-800 py-1.5 text-center text-xs text-zinc-700">
                —
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
