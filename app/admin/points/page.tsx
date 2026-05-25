"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ADMIN_CHARGE_OPTIONS, MIN_CHARGE_AMOUNT } from "@/lib/points-config";

interface UserRow {
  no: number;
  id: string;
  email: string;
  balance: number;
  createdAt: string;
  isAdmin: boolean;
}

interface ChargeTarget {
  id: string;
  email: string;
  balance: number;
}

export default function AdminPointsPage() {
  const router = useRouter();
  const [accessToken, setAccessToken] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [loading, setLoading] = useState(true);

  // 충전 모달
  const [chargeTarget, setChargeTarget] = useState<ChargeTarget | null>(null);
  const [chargeAmount, setChargeAmount] = useState<number>(5000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [chargeLoading, setChargeLoading] = useState(false);
  const [chargeMessage, setChargeMessage] = useState("");

  const PAGE_SIZE = 20;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const fetchUsers = async (token: string, p: number, s: string) => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(p) });
    if (s) params.set("search", s);

    const res = await fetch(`/api/admin/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.status === 403) {
      router.replace("/");
      return;
    }

    const data = await res.json();
    setUsers(data.users ?? []);
    setTotal(data.total ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.replace("/"); return; }
      setAccessToken(session.access_token);
      await fetchUsers(session.access_token, 1, "");
    });
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
    if (accessToken) fetchUsers(accessToken, 1, searchInput);
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    if (accessToken) fetchUsers(accessToken, newPage, search);
  };

  const openChargeModal = (user: UserRow) => {
    setChargeTarget({ id: user.id, email: user.email, balance: user.balance });
    setChargeAmount(5000);
    setCustomAmount("");
    setIsCustom(false);
    setChargeMessage("");
  };

  const closeChargeModal = () => {
    setChargeTarget(null);
    setChargeMessage("");
  };

  const handleCharge = async () => {
    if (!chargeTarget || !accessToken) return;

    const amount = isCustom ? parseInt(customAmount, 10) : chargeAmount;
    if (!amount || amount < MIN_CHARGE_AMOUNT) {
      alert(`최소 충전 포인트는 ${MIN_CHARGE_AMOUNT.toLocaleString()}P입니다.`);
      return;
    }

    setChargeLoading(true);
    setChargeMessage("");

    const res = await fetch("/api/admin/charge", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        targetUserId: chargeTarget.id,
        targetEmail: chargeTarget.email,
        amount,
      }),
    });

    const data = await res.json();
    setChargeLoading(false);

    if (data.error) {
      alert(data.error);
      return;
    }

    setChargeMessage(data.message);
    // 목록에서 해당 사용자 잔액 즉시 갱신
    setUsers((prev) =>
      prev.map((u) =>
        u.id === chargeTarget.id ? { ...u, balance: data.newBalance } : u
      )
    );
    setChargeTarget((prev) => prev ? { ...prev, balance: data.newBalance } : null);
  };

  return (
    <div className="p-6 text-white">
      <div className="mx-auto max-w-6xl">
        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">포인트 관리</h1>
          <p className="mt-1 text-sm text-zinc-500">전체 사용자 포인트 현황 및 충전</p>
        </div>

        {/* 검색 */}
        <form onSubmit={handleSearch} className="mb-4 flex gap-2">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="이메일 또는 사용자 ID로 검색"
            className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500"
          >
            검색
          </button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearch("");
                setPage(1);
                if (accessToken) fetchUsers(accessToken, 1, "");
              }}
              className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-400 transition-colors hover:text-white"
            >
              초기화
            </button>
          )}
        </form>

        {/* 통계 */}
        <p className="mb-3 text-sm text-zinc-500">
          전체 사용자: <span className="text-white">{total.toLocaleString()}명</span>
          {search && <span className="ml-2 text-violet-400">(검색: &quot;{search}&quot;)</span>}
        </p>

        {/* 테이블 */}
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900">
                <th className="px-4 py-3 text-left font-medium text-zinc-400">번호</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">이메일</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">사용자 ID</th>
                <th className="px-4 py-3 text-right font-medium text-zinc-400">현재 포인트</th>
                <th className="px-4 py-3 text-left font-medium text-zinc-400">가입일</th>
                <th className="px-4 py-3 text-center font-medium text-zinc-400">충전</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    불러오는 중...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-600">
                    사용자가 없습니다.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30">
                    <td className="px-4 py-3 text-zinc-500">{user.no}</td>
                    <td className="px-4 py-3 text-white">
                      {user.email}
                      {user.isAdmin && (
                        <span className="ml-2 rounded-full bg-violet-500/20 px-2 py-0.5 text-xs text-violet-400">
                          관리자
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                      {user.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-violet-300">
                      {user.balance.toLocaleString()}P
                    </td>
                    <td className="px-4 py-3 text-zinc-500">
                      {new Date(user.createdAt).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openChargeModal(user)}
                        className="rounded-lg bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-400 transition-colors hover:bg-emerald-600/40"
                      >
                        충전
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page <= 1}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
            >
              ← 이전
            </button>
            <span className="text-sm text-zinc-500">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page >= totalPages}
              className="rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-400 transition-colors hover:border-zinc-500 hover:text-white disabled:opacity-40"
            >
              다음 →
            </button>
          </div>
        )}
      </div>

      {/* 충전 모달 */}

      {chargeTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={closeChargeModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={closeChargeModal}
              className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            <h2 className="mb-4 text-lg font-bold text-white">포인트 충전</h2>

            <div className="mb-4 rounded-xl bg-zinc-800 p-4 text-sm">
              <p className="text-zinc-400">대상: <span className="text-white">{chargeTarget.email}</span></p>
              <p className="text-zinc-400">
                현재 잔액:{" "}
                <span className="text-violet-300">{chargeTarget.balance.toLocaleString()}P</span>
              </p>
            </div>

            <p className="mb-2 text-sm font-medium text-zinc-300">충전 포인트 선택</p>
            <div className="mb-3 grid grid-cols-3 gap-2">
              {ADMIN_CHARGE_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  onClick={() => { setChargeAmount(opt); setIsCustom(false); setCustomAmount(""); }}
                  className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                    !isCustom && chargeAmount === opt
                      ? "border-violet-500 bg-violet-500/20 text-violet-300"
                      : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                  }`}
                >
                  {opt.toLocaleString()}P
                </button>
              ))}
              <button
                onClick={() => { setIsCustom(true); setChargeAmount(0); }}
                className={`rounded-lg border py-2 text-sm font-medium transition-colors ${
                  isCustom
                    ? "border-violet-500 bg-violet-500/20 text-violet-300"
                    : "border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-white"
                }`}
              >
                직접입력
              </button>
            </div>

            {isCustom && (
              <div className="mb-3">
                <input
                  type="number"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`최소 ${MIN_CHARGE_AMOUNT.toLocaleString()}P`}
                  min={MIN_CHARGE_AMOUNT}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-white placeholder-zinc-500 outline-none focus:border-violet-500"
                />
              </div>
            )}

            {chargeMessage && (
              <div className="mb-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-400">
                {chargeMessage}
              </div>
            )}

            <button
              onClick={handleCharge}
              disabled={chargeLoading}
              className="w-full rounded-xl bg-emerald-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-60"
            >
              {chargeLoading ? "충전 중..." : "충전 실행"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
