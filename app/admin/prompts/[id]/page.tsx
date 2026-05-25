"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { TOOLS } from "@/lib/tools-config";

export default function AdminPromptPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const tool = TOOLS.find((t) => t.type === id);

  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [fromDb, setFromDb] = useState(false);
  const [accessToken, setAccessToken] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setMessage(null);
    fetch(`/api/admin/prompts/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setContent(data.content ?? "");
        setFromDb(data.fromDb ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const handleSave = async () => {
    if (!content.trim() || !accessToken) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch(`/api/admin/prompts/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ content }),
    });

    const data = await res.json();
    setSaving(false);
    if (data.ok) {
      setMessage({ text: "저장되었습니다.", ok: true });
      setFromDb(true);
    } else {
      setMessage({ text: data.error ?? "저장에 실패했습니다.", ok: false });
    }
  };

  if (!tool) {
    return <div className="p-8 text-zinc-500">존재하지 않는 도구입니다.</div>;
  }

  return (
    <div className="p-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">
            {tool.emoji} {tool.name}
          </h1>
          <p className="mt-1 text-xs text-zinc-500">
            {fromDb
              ? "DB에 저장된 프롬프트"
              : "파일에서 불러옴 — 저장하면 DB에 기록됩니다"}
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || loading}
          className="rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition-all hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
      </div>

      {/* 저장 결과 메시지 */}
      {message && (
        <p
          className={`mb-4 rounded-xl border px-4 py-2.5 text-sm ${
            message.ok
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : "border-red-500/30 bg-red-500/10 text-red-400"
          }`}
        >
          {message.text}
        </p>
      )}

      {/* 프롬프트 텍스트 에리어 */}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-zinc-500">
          <div className="h-4 w-4 animate-spin rounded-full border border-zinc-600 border-t-violet-400" />
          불러오는 중...
        </div>
      ) : (
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={28}
          spellCheck={false}
          className="w-full resize-y rounded-2xl border border-zinc-700 bg-zinc-900/60 px-5 py-4 font-mono text-sm leading-relaxed text-zinc-300 outline-none transition-all focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
        />
      )}
    </div>
  );
}
