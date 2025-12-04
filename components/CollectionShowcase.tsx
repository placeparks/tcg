import React from 'react';
import Link from 'next/link';
import TiltCard from '@/components/ui/TiltCard';
import SectionHeader from '@/components/SectionHeader';
import { Box, Layers, Disc } from 'lucide-react';
import { CollectionType } from '../types';

const CollectionShowcase: React.FC = () => {
  const collections = [
    {
      type: CollectionType.PHYSICAL,
      title: "Physical Backed",
      desc: "Authentic graded slabs held in our secure vault. Redeem the NFT to receive the physical card worldwide.",
      icon: <Layers className="w-8 h-8 text-neon-blue" />,
      // Metallic/Glass cyber texture for physical feel
      image: "/card-dragon.png",
      color: "border-neon-blue",
      glow: "rgba(0, 243, 255, 0.4)"
    },
    {
      type: CollectionType.ERC1155,
      title: "ERC1155 Collection",
      desc: "Digital-only collections powered by the ERC1155 standard. Launch on Cardify.club and trade efficiently.",
      icon: <Disc className="w-8 h-8 text-neon-purple" />,
      // Abstract digital art/glitch
      image: "/card3.jpg",
      color: "border-neon-purple",
      glow: "rgba(176, 38, 255, 0.4)"
    },
    {
      type: CollectionType.BOOSTER,
      title: "Pack Series",
      desc: "Unseal mystery packs containing 5 randomized assets. Experience the thrill of the pull digitally.",
      icon: <Box className="w-8 h-8 text-neon-pink" />,
      // Neon cube/box for the pack look
      image: "/bursting-pack.jpg",
      color: "border-neon-pink",
      glow: "rgba(255, 0, 255, 0.4)"
    }
  ];

  return (
    <section id="collections" className="py-24 relative container mx-auto px-4">
      <SectionHeader title="Collection Portal" subtitle="Explore Collection Types" centered />

      <div className="grid md:grid-cols-3 gap-8">
        {collections.map((col, idx) => {
          // Map CollectionType to URL filter type
          const typeFilter = col.type === CollectionType.PHYSICAL ? 'single' 
            : col.type === CollectionType.ERC1155 ? 'erc1155' 
            : 'pack';
          
          return (
            <Link key={idx} href={`/collection?type=${typeFilter}`}>
              <TiltCard className="group relative h-[550px] cursor-pointer" glowColor={col.glow}>
                <div className={`absolute inset-0 border ${col.color} bg-gray-900 rounded-xl overflow-hidden`}>
              {/* Background Image */}
              <img 
                src={col.image} 
                alt={col.title} 
                className="w-full h-full object-cover opacity-50 group-hover:opacity-60 transition-all duration-700 scale-100 group-hover:scale-110" 
              />
              {/* Gradient Overlays for depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/90" />
              
              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 z-20">
                <div className="mb-6 p-4 bg-white/5 backdrop-blur-xl rounded-xl w-fit border border-white/10 group-hover:border-white/40 transition-colors shadow-lg">
                  {col.icon}
                </div>
                
                <h3 className="font-display text-3xl font-bold mb-3 text-white group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-400 transition-all">
                    {col.title}
                </h3>
                
                <p className="text-gray-400 text-base font-medium leading-relaxed mb-8 border-l-2 border-white/20 pl-4 group-hover:border-white/60 transition-colors">
                  {col.desc}
                </p>
                
                <div className="flex items-center gap-3 text-xs font-display font-bold text-neon-blue uppercase tracking-[0.2em] group-hover:tracking-[0.3em] transition-all">
                  View Collections <span className="text-xl">→</span>
                </div>
              </div>

              {/* Decorative Tech Lines */}
              <div className="absolute top-6 right-6 w-24 h-[1px] bg-gradient-to-l from-white/50 to-transparent" />
              <div className="absolute top-6 right-6 w-[1px] h-24 bg-gradient-to-b from-white/50 to-transparent" />
              
              {/* Hover effect glow line */}
              <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700 bg-gradient-to-r from-transparent via-white to-transparent`} />
            </div>
          </TiltCard>
            </Link>
          );
        })}
      </div>
    </section>
  );
};

export default CollectionShowcase;