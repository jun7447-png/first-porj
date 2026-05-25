"use client";

interface Props {
  onClose: () => void;
}

export default function PointInsufficientModal({ onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-800 text-zinc-400 transition-colors hover:bg-zinc-700 hover:text-white"
          aria-label="닫기"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">포인트가 부족합니다</h2>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-zinc-400">
          포인트를 충전하셔서 다시 사용할 수 있습니다.
        </p>

        <div className="rounded-xl border border-zinc-700/60 bg-zinc-800/50 p-4 text-sm">
          <p className="mb-3 font-medium text-zinc-300">💳 충전 안내</p>
          <p className="mb-1 text-zinc-400">최소 충전 금액: <span className="text-white">5,000원</span></p>
          <div className="my-3 border-t border-zinc-700" />
          <p className="mb-1 font-medium text-zinc-300">충전 계좌</p>
          <p className="text-zinc-400">은행: <span className="text-white">기업은행</span></p>
          <p className="text-zinc-400">계좌번호: <span className="select-all text-white">7447447447</span></p>
          <p className="text-zinc-400">입금자명 / 받는 사람: <span className="text-white">박준범</span></p>
        </div>

        <p className="mt-3 text-xs text-zinc-600">
          입금 후 관리자 확인을 거쳐 포인트가 지급됩니다.
        </p>

        <button
          onClick={onClose}
          className="mt-5 w-full rounded-xl bg-violet-600 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-violet-500"
        >
          확인
        </button>
      </div>
    </div>
  );
}
