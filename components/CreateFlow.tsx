"use client";

import { useState } from "react";
import UploadStep from "./UploadStep";
import GenerateResults from "./GenerateResults";

interface CreateFlowProps {
  onClose: () => void;
}

type Step = "upload" | "generate";

export default function CreateFlow({ onClose }: CreateFlowProps) {
  const [step, setStep] = useState<Step>("upload");
  const [files, setFiles] = useState<File[]>([]);

  const handleConfirm = (uploaded: File[]) => {
    setFiles(uploaded);
    setStep("generate");
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative my-8 w-full max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
        {/* 닫기 버튼 */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-all hover:bg-zinc-800 hover:text-white"
          aria-label="닫기"
        >
          ✕
        </button>

        {step === "upload" && <UploadStep onConfirm={handleConfirm} />}
        {step === "generate" && (
          <GenerateResults
            files={files}
            onReset={() => {
              setFiles([]);
              setStep("upload");
            }}
          />
        )}
      </div>
    </div>
  );
}
