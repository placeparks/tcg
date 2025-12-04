"use client";

import React, { Suspense, useState, useEffect } from "react";
import { 
  Cpu, 
  Wifi, 
  Zap, 
  Activity, 
  Database, 
  Server, 
  Code, 
  Globe 
} from "lucide-react";
import MintCollections from "@/components/MintCollections";
import FullPageLoader from "@/components/FullPageLoader";
import useEnsureBaseSepolia from "@/hooks/useEnsureNetwork";
import SectionHeader from "@/components/SectionHeader";
import TiltCard from "@/components/ui/TiltCard";

// Mock System Metrics for the UI
const SYSTEM_METRICS = [
  { label: "NETWORK", value: "BASE", icon: <Globe className="w-3 h-3 text-neon-blue" />, status: "active" },
  { label: "MINT ENGINE", value: "ONLINE", icon: <Cpu className="w-3 h-3 text-neon-purple" />, status: "active" },
  { label: "GAS STATUS", value: "OPTIMAL", icon: <Zap className="w-3 h-3 text-green-400" />, status: "good" },
  { label: "LATENCY", value: "24ms", icon: <Activity className="w-3 h-3 text-neon-blue" />, status: "good" },
];

function Inner() {
  useEnsureBaseSepolia();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen pt-24 pb-12 relative overflow-hidden md:px-20">
      {/* 1. Global Background Effects (Local Override/Enhancement) */}
      <div className="fixed inset-0 bg-cyber-grid opacity-20 pointer-events-none z-0" />
      <div className="fixed top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent z-50 opacity-50" />
      
      {/* 2. Floating Ambient Orbs */}
      <div className="fixed top-1/4 left-1/4 w-[500px] h-[500px] bg-neon-purple/10 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse-slow" />
      <div className="fixed bottom-1/4 right-1/4 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px] -z-10 pointer-events-none animate-pulse-slow" style={{ animationDelay: "2s" }} />

      <div className="container mx-auto px-4 relative z-10">
        
        {/* 3. Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <SectionHeader title="Genesis Forge" subtitle="Asset Creation" />
          
          {/* Holographic Status Bar */}
          <TiltCard className="hidden md:block" glowColor="rgba(176, 38, 255, 0.2)">
            <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-xl p-1 flex divide-x divide-white/10">
              {SYSTEM_METRICS.map((metric, idx) => (
                <div key={idx} className="px-6 py-2 flex items-center gap-3">
                  <div className={`p-1.5 rounded-md bg-white/5 border border-white/5 ${
                    metric.status === 'active' ? 'text-neon-purple shadow-[0_0_10px_rgba(176,38,255,0.2)]' : 
                    metric.status === 'good' ? 'text-neon-blue' : 'text-gray-400'
                  }`}>
                    {metric.icon}
                  </div>
                  <div>
                    <div className="text-[9px] text-gray-500 font-mono font-bold uppercase tracking-widest leading-none mb-1">
                      {metric.label}
                    </div>
                    <div className="text-white font-display font-bold text-sm tracking-wide leading-none">
                      {metric.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </TiltCard>
        </div>

        {/* 4. Main Terminal Area */}
        <div className="grid lg:grid-cols-12 gap-8">
          
          {/* Left: Sidebar / Info */}
          <div className="lg:col-span-3 space-y-6">
            <div className="glass-panel p-6 rounded-xl border-l-4 border-neon-purple relative overflow-hidden group">
               <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
               <h3 className="text-white font-display font-bold text-lg mb-4 flex items-center gap-2">
                 <Server className="w-5 h-5 text-neon-purple" /> 
                 Protocol V.4.0
               </h3>
               <p className="text-gray-400 text-sm leading-relaxed font-sans mb-4">
                 You are accessing the TCGMeta secure minting layer. Assets forged here are instantly verified on the Base Sepolia network and indexed by the Cardify Oracle.
               </p>
               <div className="flex gap-2 text-xs font-mono text-neon-blue">
                  <span className="animate-pulse">●</span> Awaiting Input...
               </div>
            </div>

            <div className="p-4 border border-white/10 rounded-xl bg-white/5">
               <div className="flex justify-between items-center mb-2">
                 <span className="text-xs text-gray-500 font-bold uppercase">Contract Load</span>
                 <span className="text-xs text-neon-purple font-mono">34%</span>
               </div>
               <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                 <div className="h-full bg-neon-purple w-[34%] shadow-[0_0_10px_rgba(176,38,255,0.5)]" />
               </div>
               
               <div className="flex justify-between items-center mt-4 mb-2">
                 <span className="text-xs text-gray-500 font-bold uppercase">Node Stability</span>
                 <span className="text-xs text-green-400 font-mono">99.9%</span>
               </div>
               <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                 <div className="h-full bg-green-400 w-[99%]" />
               </div>
            </div>
          </div>

          {/* Right: The Mint Collections Component Wrapper */}
          <div className="lg:col-span-9">
            <div className={`transition-all duration-700 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
              
              {/* Decorative Top Bar for the 'Terminal' Window */}
              <div className="h-8 bg-white/5 border-t border-x border-white/10 rounded-t-xl flex items-center px-4 justify-between backdrop-blur-sm">
                 <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/50" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/50" />
                 </div>
                 <div className="text-[10px] font-mono text-gray-500 flex items-center gap-2">
                    <Code className="w-3 h-3" /> MINT_INTERFACE.EXE
                 </div>
              </div>

              {/* Main Content Area */}
              <div className="bg-black/40 border border-white/10 rounded-b-xl p-1 shadow-2xl backdrop-blur-sm min-h-[500px] relative">
                 {/* This wraps your existing MintCollections component */}
                 <div className="relative z-10 p-6">
                    <MintCollections />
                 </div>

                 {/* Decorative Grid Overlay inside the terminal */}
                 <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none rounded-b-xl" />
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default function MintPage() {
  return (
    <Suspense fallback={<FullPageLoader message="Initializing Genesis Forge..." />}>
      <Inner />
    </Suspense>
  );
}
