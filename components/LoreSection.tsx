import React from 'react';
import SectionHeader from './SectionHeader';
import { Cpu, Globe, Shield, Zap, Box, Layers } from 'lucide-react';

const LoreSection: React.FC = () => {
  return (
    <section id="lore" className="py-24 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-neon-purple/5 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-neon-blue/5 rounded-full blur-3xl pointer-events-none" />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          <div className="space-y-8">
            <SectionHeader title="The Ecosystem" subtitle="How It Works" />
            
            <div className="space-y-6">
              <div className="glass-panel p-6 rounded-xl border-l-4 border-neon-purple hover:bg-white/5 transition-colors">
                <h4 className="font-display font-bold text-xl text-white mb-2 flex items-center gap-3">
                    <Zap className="text-neon-purple" /> Phase 1: The Forge
                </h4>
                <p className="text-gray-400 leading-relaxed font-sans">
                  Creators launch their visions on <span className="text-white font-bold">Cardify.club</span>. 
                  Using our no-code tools, artists mint high-quality collections that bridge physical value with digital scarcity.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl border-l-4 border-neon-blue hover:bg-white/5 transition-colors">
                <h4 className="font-display font-bold text-xl text-white mb-2 flex items-center gap-3">
                    <Layers className="text-neon-blue" /> Phase 2: The Bridge
                </h4>
                <p className="text-gray-400 leading-relaxed font-sans">
                  Physical assets are authenticated, graded, and vaulted. 
                  A "Phygital" NFT is minted on TCGMeta, representing absolute ownership. Burn the NFT to redeem the physical slab worldwide.
                </p>
              </div>

              <div className="glass-panel p-6 rounded-xl border-l-4 border-neon-pink hover:bg-white/5 transition-colors">
                <h4 className="font-display font-bold text-xl text-white mb-2 flex items-center gap-3">
                    <Box className="text-neon-pink" /> Phase 3: The Exchange
                </h4>
                <p className="text-gray-400 leading-relaxed font-sans">
                  The TCGMeta marketplace opens. Collectors trade ERC1155 items, crack open mystery Booster Packs for rare pulls, and build their ultimate deck.
                </p>
              </div>
            </div>
          </div>

          {/* Lore Visual */}
          <div className="relative h-[600px] rounded-2xl overflow-hidden border border-white/10 group">
             <img 
               src="/hero-battle.jpg" 
               alt="TCG Ecosystem" 
               className="hidden md:block w-full h-full object-cover object-center transition-transform duration-[10s] group-hover:scale-110" 
             />
             <img 
               src="/mobile-bg.png" 
               alt="TCG Ecosystem" 
               className="md:hidden w-full h-full object-cover object-center transition-transform duration-[10s] group-hover:scale-110" 
             />
             <div className="absolute inset-0 bg-gradient-to-t from-gray-950 via-gray-950/20 to-transparent" />
             
             {/* Overlay Text */}
             <div className="absolute bottom-10 left-10 max-w-sm">
                <div className="text-neon-blue font-mono text-xs mb-2">SYSTEM STATUS: ONLINE</div>
                <p className="text-white text-lg font-display uppercase font-bold leading-tight">
                    "Cardify initiates the asset. TCGMeta liberates it."
                </p>
             </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LoreSection;