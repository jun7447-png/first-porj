"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import AuthModal from "@/components/AuthModal";
import type { User } from "@supabase/supabase-js";

export default function TopBar() {
  const [user, setUser] = useState<User | null>(null);
  const [pointBalance, setPointBalance] = useState<number | null>(null);
  const [accessToken, setAccessToken] = useState("");
  const [showAuth, setShowAuth] = useState(false);

  const fetchBalance = (token: string) => {
    fetch("/api/points/balance", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => setPointBalance(typeof d.balance === "number" ? d.balance : null))
      .catch(() => {});
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session) {
        setAccessToken(session.access_token);
        fetchBalance(session.access_token);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session) {
        setAccessToken(session.access_token);
        fetchBalance(session.access_token);
      } else {
        setPointBalance(null);
        setAccessToken("");
      }
    });

    // 이미지 생성 완료 후 포인트 갱신 이벤트
    const onRefresh = () => {
      if (accessToken) fetchBalance(accessToken);
    };
    // 로그인 모달 열기 이벤트 (다른 페이지에서 dispatch)
    const onOpen = () => setShowAuth(true);

    window.addEventListener("pointsRefresh", onRefresh);
    window.addEventListener("openLoginModal", onOpen);
    return () => {
      subscription.unsubscribe();
      window.removeEventListener("pointsRefresh", onRefresh);
      window.removeEventListener("openLoginModal", onOpen);
    };
  }, [accessToken]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const btnClass =
    "rounded-lg border border-zinc-700 bg-zinc-900/80 px-4 py-2 text-sm text-zinc-300 backdrop-blur transition-all hover:border-zinc-500 hover:text-white";

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-50 flex h-[52px] items-center justify-between border-b border-zinc-800 bg-zinc-950/90 px-4 backdrop-blur">
        {/* 좌측: 로고 */}
        <Link href="/" className="text-sm font-semibold text-white hover:text-zinc-300">
          SnapPage
        </Link>

        {/* 우측: 유저 정보 */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="hidden text-sm text-zinc-400 sm:inline">
                {user.email}
                {pointBalance !== null && (
                  <span className="ml-2 text-violet-300">
                    | 포인트: {pointBalance.toLocaleString()}P
                  </span>
                )}
              </span>
              {user.email === "wish2me@wish2me.com" && (
                <Link href="/admin/points" className={btnClass}>
                  관리자페이지
                </Link>
              )}
              <button onClick={handleLogout} className={btnClass}>
                로그아웃
              </button>
            </>
          ) : (
            <button onClick={() => setShowAuth(true)} className={btnClass}>
              로그인 / 회원가입
            </button>
          )}
        </div>
      </div>

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onSuccess={() => setShowAuth(false)}
        />
      )}
    </>
  );
}
