"use client"
import React, { useEffect } from 'react';
import Hero from '@/components/Hero';
import CollectionShowcase from '@/components/CollectionShowcase';
import Marketplace from '@/components/Marketplace';
import LoreSection from '@/components/LoreSection';
import ChatBot from '@/components/ChatBot';

const GlobalBackground = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden bg-[#030014]">
      {/* 1. Deep Space Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#030014] via-[#090518] to-[#030014]" />

      {/* 2. Drifting Ambient Blobs */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-neon-purple/20 rounded-full blur-[120px] animate-blob-bounce mix-blend-screen opacity-40" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[800px] h-[800px] bg-neon-blue/10 rounded-full blur-[120px] animate-blob-bounce mix-blend-screen opacity-40" style={{ animationDelay: '5s' }} />
      <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] bg-indigo-900/30 rounded-full blur-[100px] animate-pulse-slow mix-blend-screen" />

      {/* 3. Moving Perspective Grid */}
      <div className="absolute inset-0 perspective-1000">
        <div className="absolute inset-0 bg-cyber-grid animate-grid-flow opacity-20 transform origin-top rotate-x-60 scale-y-150" />
      </div>

      {/* 4. Texture Overlay (Scanlines & Noise) */}
      <div className="absolute inset-0 scanlines opacity-30 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay pointer-events-none" />
    </div>
  );
};

function App() {
  // Smooth scroll behavior for anchor links
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = 'auto';
    };
  }, []);

  return (
    <div className="min-h-screen text-white selection:bg-neon-purple selection:text-white relative">
      <GlobalBackground />
      <main className="relative z-10">
        <Hero />
        <div className="md:px-24">
          <CollectionShowcase />
          <LoreSection />
        </div>
      </main>
      <ChatBot />
    </div>
  );
}

export default App;
