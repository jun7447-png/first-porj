"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface GalleryImage {
  id: string;
  image_url: string;
  created_at: string;
  user_email: string | null;
  is_active: boolean | null;
}

export default function AdminGalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  const fetchImages = useCallback(async (token: string) => {
    setLoading(true);
    const res = await fetch("/api/admin/gallery", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setImages(data.images ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setAccessToken(session.access_token);
        fetchImages(session.access_token);
      }
    });
  }, [fetchImages]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(images.map((img) => img.id)));
  const clearSelect = () => setSelected(new Set());

  const handleToggle = async (isActive: boolean) => {
    if (!selected.size || !accessToken) return;
    setUpdating(true);

    await fetch("/api/admin/gallery/toggle", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ ids: Array.from(selected), is_active: isActive }),
    });

    setSelected(new Set());
    await fetchImages(accessToken);
    setUpdating(false);
  };

  const activeCount = images.filter((img) => img.is_active !== false).length;
  const inactiveCount = images.length - activeCount;

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white">🖼️ 갤러리 관리</h1>
          <p className="mt-1 text-xs text-zinc-500">
            전체 {images.length}개 · 활성 {activeCount}개 · 비활성 {inactiveCount}개
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={selectAll}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white"
          >
            전체선택
          </button>
          <button
            onClick={clearSelect}
            disabled={!selected.size}
            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
          >
            선택해제
          </button>
          <button
            onClick={() => handleToggle(true)}
            disabled={!selected.size || updating}
            className="rounded-xl border border-emerald-600/40 bg-emerald-600/10 px-4 py-1.5 text-sm font-medium text-emerald-400 transition-colors hover:bg-emerald-600/20 disabled:opacity-40"
          >
            {updating ? "처리 중..." : `선택 활성 (${selected.size})`}
          </button>
          <button
            onClick={() => handleToggle(false)}
            disabled={!selected.size || updating}
            className="rounded-xl border border-red-600/40 bg-red-600/10 px-4 py-1.5 text-sm font-medium text-red-400 transition-colors hover:bg-red-600/20 disabled:opacity-40"
          >
            {updating ? "처리 중..." : `선택 비활성 (${selected.size})`}
          </button>
        </div>
      </div>

      {/* 이미지 그리드 */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="h-4 w-4 animate-spin rounded-full border border-zinc-600 border-t-violet-400" />
          불러오는 중...
        </div>
      ) : images.length === 0 ? (
        <p className="text-sm text-zinc-600">생성된 이미지가 없습니다.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((img) => {
            const isSelected = selected.has(img.id);
            const isActive = img.is_active !== false;

            return (
              <div
                key={img.id}
                onClick={() => toggleSelect(img.id)}
                className={`relative cursor-pointer overflow-hidden rounded-xl border-2 transition-all ${
                  isSelected
                    ? "border-violet-500 shadow-lg shadow-violet-500/20"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              >
                <img
                  src={img.image_url}
                  alt=""
                  className={`aspect-square w-full object-contain bg-zinc-900 transition-opacity ${
                    isActive ? "" : "opacity-40"
                  }`}
                />

                {/* 체크박스 */}
                <div
                  className={`absolute left-2 top-2 flex h-5 w-5 items-center justify-center rounded border-2 transition-colors ${
                    isSelected
                      ? "border-violet-500 bg-violet-500"
                      : "border-zinc-400 bg-black/50"
                  }`}
                >
                  {isSelected && (
                    <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>

                {/* 활성/비활성 배지 */}
                <div
                  className={`absolute right-2 top-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-500/80 text-white"
                      : "bg-red-500/80 text-white"
                  }`}
                >
                  {isActive ? "활성" : "비활성"}
                </div>

                {/* 유저 이메일 */}
                <div className="absolute bottom-0 left-0 right-0 truncate bg-black/70 px-2 py-1 text-xs text-zinc-300">
                  {img.user_email?.split("@")[0] ?? "unknown"}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
