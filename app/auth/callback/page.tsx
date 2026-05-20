"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Status = "loading" | "success" | "error";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("loading");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      // 해시(#) 기반 implicit flow: access_token이 URL 해시에 있는 경우
      const hash = window.location.hash.slice(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }
        setStatus("success");
        setTimeout(() => router.replace("/"), 2000);
        return;
      }

      // 쿼리(?) 기반 PKCE flow: code가 URL 파라미터에 있는 경우
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          setStatus("error");
          setErrorMessage(error.message);
          return;
        }
        setStatus("success");
        setTimeout(() => router.replace("/"), 2000);
        return;
      }

      // 인증 파라미터가 없으면 홈으로 이동
      router.replace("/");
    };

    handleCallback();
  }, [router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#09090b] text-white">
      <div className="text-center">
        {status === "loading" && (
          <>
            <div className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-violet-400" />
            <p className="text-zinc-400">이메일 인증을 처리하고 있습니다...</p>
          </>
        )}

        {status === "success" && (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10">
              <svg className="h-9 w-9 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">이메일 인증 완료!</h1>
            <p className="mt-2 text-zinc-400">
              인증이 완료되었습니다.<br />잠시 후 메인 페이지로 이동합니다.
            </p>
          </>
        )}

        {status === "error" && (
          <>
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <svg className="h-9 w-9 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">인증 실패</h1>
            <p className="mt-2 text-sm text-zinc-400">{errorMessage}</p>
            <button
              onClick={() => router.replace("/")}
              className="mt-6 rounded-xl border border-zinc-700 bg-zinc-900 px-6 py-2.5 text-sm text-zinc-300 transition-all hover:border-zinc-500 hover:text-white"
            >
              메인으로 돌아가기
            </button>
          </>
        )}
      </div>
    </main>
  );
}
