import { createClient } from "@supabase/supabase-js";
import Link from "next/link";
import GalleryGrid from "@/components/GalleryGrid";

// 30초마다 재검증 (ISR 캐시)
export const revalidate = 30;

const TOTAL_SLOTS = 40;

async function fetchGalleryImages() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase
    .from("image_jobs")
    .select("id, image_url, created_at, user_email")
    .eq("status", "done")
    .not("image_url", "is", null)
    .not("image_url", "like", "data:%")
    .order("created_at", { ascending: false })
    .limit(40);

  return data ?? [];
}

export default async function GalleryPage() {
  const images = await fetchGalleryImages();

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
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
        <h1 className="text-xl font-bold text-white">갤러리</h1>
        <div className="w-24" />
      </header>

      {/* 본문 */}
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-medium uppercase tracking-widest text-cyan-400">Gallery</p>
          <h2 className="text-3xl font-bold text-white">AI 생성 이미지</h2>
          <p className="mt-3 text-zinc-400">SnapPage로 생성된 최신 상품 이미지 모음입니다.</p>
        </div>

        <GalleryGrid images={images} totalSlots={TOTAL_SLOTS} />
      </div>
    </main>
  );
}
