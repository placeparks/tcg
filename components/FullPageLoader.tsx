// components/FullPageLoader.tsx
"use client";

import { Loader2 } from "lucide-react";

interface Props {
  /** centre-screen message, e.g. “Loading marketplace…” */
  message?: string;
  /** size of the spinning icon */
  iconSize?: number;
}

/**
 * Full-viewport neon loader used across Cardify pages.
 * Drop it anywhere:  {loading && <FullPageLoader message="Loading…" />}
 */
export default function FullPageLoader({
  message = "Loading…",
  iconSize = 48,
}: Props) {
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* --- animated background blobs ----------------------------------- */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
        <div
          className="absolute w-64 h-64 bg-pink-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute w-80 h-80 bg-blue-500/20 rounded-full blur-3xl top-3/4 left-1/2 animate-pulse"
          style={{ animationDelay: "4s" }}
        />
      </div>

      {/* --- centred loader --------------------------------------------- */}
      <div className="relative z-10 flex flex-col items-center justify-center h-screen">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full blur-xl opacity-50 animate-pulse" />
          <div
            className="absolute inset-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full blur-lg opacity-30 animate-pulse"
            style={{ animationDelay: "0.5s" }}
          />
          <div className="relative bg-black/50 backdrop-blur-xl border-2 border-purple-500/50 rounded-full p-8">
            <Loader2 className="animate-spin text-purple-400" size={iconSize} />
          </div>
        </div>

        <p className="mt-6 text-xl text-gray-300 font-medium">{message}</p>

        <div className="mt-4 flex items-center space-x-2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" />
          <div
            className="w-2 h-2 bg-pink-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.1s" }}
          />
          <div
            className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
            style={{ animationDelay: "0.2s" }}
          />
        </div>
      </div>
    </div>
  );
}
