"use client";

import { useState } from "react";

interface GalleryImage {
  id: string;
  image_url: string;
  created_at: string;
  user_email: string | null;
}

interface Props {
  images: GalleryImage[];
  totalSlots: number;
}

function emailPrefix(email: string | null): string {
  if (!email) return "익명";
  return email.split("@")[0];
}

export default function GalleryGrid({ images, totalSlots }: Props) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const slots: (GalleryImage | null)[] = [
    ...images,
    ...Array(Math.max(0, totalSlots - images.length)).fill(null),
  ];

  return (
    <>
      {/* 라이트박스 */}
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

      {/* 그리드 */}
      <div className="grid grid-cols-4 gap-4">
        {slots.map((item, idx) =>
          item ? (
            <div key={item.id} className="flex flex-col gap-1.5">
              <button
                onClick={() => setLightboxImage(item.image_url)}
                className="group overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900 transition-all hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/10"
              >
                <div className="relative aspect-square overflow-hidden">
                  <img
                    src={item.image_url}
                    alt="생성된 이미지"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                </div>
              </button>
              <p className="truncate px-1 text-center text-xs text-zinc-500">
                {emailPrefix(item.user_email)}
              </p>
            </div>
          ) : (
            <div key={`empty-${idx}`} className="flex flex-col gap-1.5">
              <div className="aspect-square rounded-xl border border-dashed border-zinc-800 bg-zinc-900/40" />
              <p className="text-center text-xs text-zinc-800">—</p>
            </div>
          )
        )}
      </div>

      <p className="mt-6 text-center text-xs text-zinc-700">
        {images.length} / {totalSlots}
      </p>
    </>
  );
}
