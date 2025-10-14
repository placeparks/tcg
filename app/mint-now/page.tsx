"use client";

import { Suspense } from "react";
import { Sparkles } from "lucide-react";
import MintCollections from "@/components/MintCollections";
import FullPageLoader from "@/components/FullPageLoader";
import useEnsureBaseSepolia from "@/hooks/useEnsureNetwork";

function Inner() {
  useEnsureBaseSepolia();

  return (
    <div className="min-h-screen bg-black">
      <div className="relative z-10">
        <MintCollections />
      </div>

      {/* Background Effects */}
      <div className="fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -inset-[100%] opacity-50">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-500/30 rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-pink-500/20 rounded-full blur-[90px]" />
          <div className="absolute bottom-1/3 left-1/3 w-[400px] h-[400px] bg-blue-500/20 rounded-full blur-[100px]" />
        </div>
      </div>
    </div>
  );
}

export default function MintNowPage() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading collections..." />}>
      <Inner />
    </Suspense>
  );
}
