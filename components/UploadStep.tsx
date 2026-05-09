"use client";

import { useState, useCallback, useRef } from "react";

interface UploadStepProps {
  onConfirm: (files: File[]) => void;
}

export default function UploadStep({ onConfirm }: UploadStepProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const arr = Array.from(incoming).filter((f) => f.type.startsWith("image/"));
    if (!arr.length) return;
    setFiles((prev) => [...prev, ...arr]);
    arr.forEach((f) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        setPreviews((prev) => [...prev, e.target?.result as string]);
      reader.readAsDataURL(f);
    });
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const removeFile = (idx: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="p-8 sm:p-10">
      {/* 헤더 */}
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-bold text-white">제품 사진 선택</h2>
        <p className="mt-2 text-zinc-400">
          상품 이미지를 1장 이상 업로드하면 5가지 디자인 템플릿으로 생성합니다
        </p>
      </div>

      {/* 드롭존 */}
      <div
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-14 text-center transition-all ${
          isDragging
            ? "border-violet-500 bg-violet-500/10"
            : "border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/40"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => e.target.files && addFiles(e.target.files)}
        />
        <div className="mb-4 text-5xl">📷</div>
        <p className="text-lg font-medium text-white">
          사진을 드래그하거나 클릭해서 선택
        </p>
        <p className="mt-1.5 text-sm text-zinc-500">
          JPG, PNG, WEBP · 여러 장 선택 가능
        </p>
      </div>

      {/* 미리보기 */}
      {previews.length > 0 && (
        <div className="mt-6">
          <p className="mb-3 text-sm font-medium text-zinc-400">
            {previews.length}장 선택됨
          </p>
          <div className="flex flex-wrap gap-3">
            {previews.map((src, i) => (
              <div key={i} className="group relative">
                <img
                  src={src}
                  className="h-20 w-20 rounded-xl object-cover border border-zinc-700"
                  alt=""
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(i);
                  }}
                  className="absolute -right-2 -top-2 hidden h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-xs group-hover:flex"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 안내 */}
      <div className="mt-6 rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
        <p className="text-xs text-zinc-500">
          <span className="text-violet-400">✦</span> 첫 번째 사진이 모든 템플릿의 메인 이미지로 사용됩니다.
          밝은 배경이나 제품이 선명하게 나온 사진을 먼저 올리면 더 좋은 결과가 나옵니다.
        </p>
      </div>

      {/* CTA */}
      <div className="mt-8 flex justify-end">
        <button
          disabled={files.length === 0}
          onClick={() => onConfirm(files)}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-105 hover:shadow-violet-500/35 disabled:cursor-not-allowed disabled:opacity-40"
        >
          상품 이미지 생성 시작 →
        </button>
      </div>
    </div>
  );
}
