import React from 'react';
import { Button } from '@/components/ui/button';
import { Play, ArrowRight } from 'lucide-react';

export default function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/cyberpunk-city.png" 
          alt="" 
          className="w-full h-full object-cover object-center opacity-30"
        />
      </div>
      
      {/* Background Ambience - Simplified to blend with Global Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#030014]/70 to-[#030014] z-0 pointer-events-none" />
      
      <div className="container mx-auto px-4 relative z-10 grid lg:grid-cols-2 gap-12 items-center md:px-24">
        
        {/* Text Content */}
        <div className="space-y-8 text-center lg:text-left pt-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-neon-blue/30 bg-neon-blue/10 text-neon-blue text-xs font-display tracking-widest uppercase animate-pulse-slow backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-neon-blue animate-ping" />
            Ecosystem Live
          </div>
          
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-black leading-tight uppercase text-white drop-shadow-2xl">
            <div className="pt-2">THE NEXT</div>
            <div className="relative py-2 block">
              <span 
                className="text-white inline-block relative"
                style={{ 
                  filter: 'drop-shadow(0 0 30px rgba(0,243,255,1)) drop-shadow(0 0 60px rgba(0,243,255,0.7)) drop-shadow(3px 3px 10px rgba(0,0,0,1))',
                  background: 'linear-gradient(to right, #b026ff, #f472b6, #b026ff)',
                  backgroundSize: '200% auto',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  animation: 'text-shimmer 2.5s ease-out infinite alternate'
                }}
              >
                EVOLUTION
              </span>
            </div>
            <div className="pt-2">OF TCG</div>
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl max-w-xl mx-auto lg:mx-0 font-sans font-medium leading-relaxed border-l-4 border-neon-purple/50 pl-6 bg-black/20 backdrop-blur-sm p-4 rounded-r-lg">
            Launch your collection on <span className="text-white font-bold">cardify.club</span> and trade on <span className="text-neon-blue font-bold">TCGMeta</span>. 
            The premier hub for physical-backed assets, ERC1155 collectibles, and digital booster packs.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center gap-6 justify-center lg:justify-start pt-4">
            <Button variant="primary" glow className="w-full sm:w-auto text-lg px-10">
              <Play className="w-5 h-5 fill-current" /> Start Collecting
            </Button>
            <Button variant="outline" className="w-full sm:w-auto text-lg px-10 text-black">
              Explore Market <ArrowRight className="w-5 h-5" />
            </Button>
          </div>

        </div>

        {/* Visuals - Robots */}
        <div className="relative h-[600px] hidden lg:block perspective-1000">
            {/* Robot 1 */}
            <div className="absolute top-10 left-10 w-80 h-[500px] glass-panel border border-neon-purple/30 rounded-xl p-2 transform -rotate-6 animate-float z-10 shadow-[0_0_50px_rgba(176,38,255,0.2)]" style={{ animationDuration: '4s', animationDelay: '0s' }}>
                <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-900">
                    <img src="/card4.webp" alt="Cyber Warrior" className="w-full h-full object-cover opacity-80 mix-blend-screen hover:mix-blend-normal transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neon-purple/80 via-transparent to-transparent" />
                    
                </div>
                {/* Hologram effects */}
                <div className="absolute -inset-1 bg-neon-purple/20 blur-xl -z-10" />
            </div>

             {/* Robot 2 */}
             <div className="absolute top-24 right-4 w-80 h-[500px] glass-panel border border-neon-blue/30 rounded-xl p-2 transform rotate-6 animate-float z-0 shadow-[0_0_50px_rgba(0,243,255,0.2)]" style={{ animationDuration: '4s', animationDelay: '2s' }}>
                <div className="relative w-full h-full overflow-hidden rounded-lg bg-gray-900">
                    <img src="/card5.webp" alt="Void Stalker" className="w-full h-full object-cover opacity-80 mix-blend-screen hover:mix-blend-normal transition-all duration-500" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neon-blue/80 via-transparent to-transparent" />
               
                </div>
                <div className="absolute -inset-1 bg-neon-blue/20 blur-xl -z-10" />
            </div>

            {/* Particles/Orbs */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-neon-purple/20 rounded-full blur-[100px] -z-20 animate-pulse-slow" />
        </div>
      </div>
    </section>
  );
}