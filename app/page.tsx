"use client";

import { useState } from "react";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import HowItWorks from "@/components/HowItWorks";
import CreateFlow from "@/components/CreateFlow";

export default function Home() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <main className="min-h-screen bg-[#09090b] text-white">
      <Hero onStart={() => setShowCreate(true)} />
      <Features />
      <HowItWorks onStart={() => setShowCreate(true)} />
      {showCreate && <CreateFlow onClose={() => setShowCreate(false)} />}
      <footer className="border-t border-zinc-800 py-8 text-center text-sm text-zinc-600">
        © 2025 SnapPage. All rights reserved.
      </footer>
    </main>
  );
}
