"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { TOOLS } from "@/lib/tools-config";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);
  const [promptOpen, setPromptOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", session.user.id)
        .single();
      if (!profile?.is_admin) { router.replace("/"); return; }
      setChecked(true);
    });
  }, [router]);

  // Prompt 서브메뉴가 활성 경로일 때 자동 펼침
  useEffect(() => {
    if (pathname?.startsWith("/admin/prompts")) setPromptOpen(true);
  }, [pathname]);

  if (!checked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#09090b]">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
      </div>
    );
  }

  const isActive = (p: string) => pathname === p || pathname?.startsWith(p + "/");

  const menuItem = (href: string, label: string) => (
    <Link
      href={href}
      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
        isActive(href)
          ? "bg-violet-500/15 text-violet-300 font-medium"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <div className="flex min-h-full">
      {/* 사이드바 */}
      <nav className="fixed left-0 top-[52px] bottom-0 w-[220px] overflow-y-auto border-r border-zinc-800 bg-zinc-950 p-4">
        <p className="mb-4 text-xs font-semibold uppercase tracking-widest text-zinc-500">
          관리자
        </p>

        <ul className="space-y-1">
          {/* 1. 포인트관리 */}
          <li>{menuItem("/admin/points", "💰 포인트관리")}</li>

          {/* 2. Prompt관리 (토글) */}
          <li>
            <button
              onClick={() => setPromptOpen((v) => !v)}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                pathname?.startsWith("/admin/prompts")
                  ? "text-violet-300"
                  : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
              }`}
            >
              <span>📝 Prompt관리</span>
              <span className="text-xs text-zinc-600">{promptOpen ? "▾" : "▸"}</span>
            </button>

            {promptOpen && (
              <ul className="mt-1 space-y-0.5 pl-2">
                {TOOLS.map((tool, idx) => (
                  <li key={tool.type}>
                    <Link
                      href={`/admin/prompts/${tool.type}`}
                      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors ${
                        pathname === `/admin/prompts/${tool.type}`
                          ? "bg-violet-500/15 text-violet-300 font-medium"
                          : "text-zinc-500 hover:bg-zinc-800 hover:text-white"
                      }`}
                    >
                      <span className="w-4 shrink-0 text-zinc-600">{idx + 1}.</span>
                      {tool.emoji} {tool.shortName}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* 3. 갤러리관리 */}
          <li>{menuItem("/admin/gallery", "🖼️ 갤러리관리")}</li>
        </ul>
      </nav>

      {/* 본문 */}
      <main className="ml-[220px] min-h-full flex-1 bg-[#09090b] text-white">
        {children}
      </main>
    </div>
  );
}
