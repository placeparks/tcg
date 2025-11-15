"use client";

import { useEffect, useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface PackOpeningAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  nftMetadata: NFTMetadata[];
  packName: string;
}

// Helper function to convert IPFS URI to HTTP URL
const ipfsToHttp = (uri: string): string => {
  if (!uri) return '/cardifyN.png';
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
  }
  return uri;
};

// Rarity colors
const getRarityColor = (rarity: string) => {
  const r = rarity.toLowerCase();
  if (r.includes('common')) return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
  if (r.includes('uncommon') || r.includes('rare')) return 'bg-blue-500/20 border-blue-500/50 text-blue-300';
  if (r.includes('epic')) return 'bg-purple-500/20 border-purple-500/50 text-purple-300';
  if (r.includes('legendary')) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
  if (r.includes('mythic')) return 'bg-red-500/20 border-red-500/50 text-red-300';
  return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
};

export default function PackOpeningAnimation({ 
  isOpen, 
  onClose, 
  nftMetadata, 
  packName 
}: PackOpeningAnimationProps) {
  const [showNFTs, setShowNFTs] = useState(false);
  const [showBlast, setShowBlast] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset states when opening
      setShowBlast(true);
      setShowNFTs(false);
      
      // Blast effect delay
      const timer = setTimeout(() => {
        setShowBlast(false);
        setShowNFTs(true);
      }, 1500); // Increased delay to let animation complete
      
      return () => clearTimeout(timer);
    } else {
      // Reset when closed
      setShowNFTs(false);
      setShowBlast(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      {/* Blast Effect */}
      {showBlast && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative w-96 h-96">
            {/* Expanding circles */}
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="absolute inset-0 rounded-full border-4 border-purple-500/50"
                style={{
                  animation: `ping 0.8s ease-out ${i * 0.2}s`,
                  animationIterationCount: 2,
                }}
              />
            ))}
            
            {/* Central burst */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div 
                className="w-32 h-32 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-full blur-xl opacity-75"
                style={{
                  animation: 'pulse 1s ease-in-out 2',
                }}
              />
              <Sparkles 
                className="w-24 h-24 text-white"
                style={{
                  animation: 'spin 1s linear 2',
                }}
              />
            </div>
            
            {/* Particle effects */}
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 bg-white rounded-full"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: `rotate(${i * 18}deg) translateY(-150px)`,
                  animation: `ping 1s ease-out ${i * 0.05}s`,
                  animationIterationCount: 1,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* NFTs Display */}
      {showNFTs && (
        <div className="relative w-full max-w-6xl mx-auto px-4">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Header */}
          <div className="text-center mb-8 fade-in-up">
            <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent mb-2">
              Pack Opened!
            </h2>
            <p className="text-gray-400 text-lg">{packName}</p>
          </div>

          {/* NFTs Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {nftMetadata.map((nft, index) => {
              const rarity = nft.attributes?.find(a => a.trait_type === 'Rarity')?.value || 'Unknown';
              
              return (
                <Card
                  key={index}
                  className="overflow-hidden bg-gradient-to-b from-gray-900 to-black border-2 border-purple-500/30 hover:border-purple-500 transition-all duration-300 scale-in"
                  style={{
                    animationDelay: `${index * 0.1}s`,
                    animationFillMode: 'both',
                  }}
                >
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20">
                    <img
                      src={ipfsToHttp(nft.image)}
                      alt={nft.name}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/cardifyN.png';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                    
                    {/* Rarity Badge */}
                    <div className="absolute top-2 left-2 right-2">
                      <Badge 
                        variant="outline" 
                        className={`w-full justify-center ${getRarityColor(rarity)}`}
                      >
                        {rarity}
                      </Badge>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="text-lg font-bold text-white mb-1 truncate">
                      {nft.name}
                    </h3>
                    {nft.description && (
                      <p className="text-sm text-gray-400 line-clamp-2">
                        {nft.description}
                      </p>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>

          {/* Continue Button */}
          <div className="text-center mt-8 fade-in-up" style={{ animationDelay: '0.5s', animationFillMode: 'both' }}>
            <button
              onClick={onClose}
              className="px-8 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-lg transition-all duration-300 transform hover:scale-105"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.8);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        @keyframes ping {
          0% {
            transform: scale(1);
            opacity: 1;
          }
          75%, 100% {
            transform: scale(2);
            opacity: 0;
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 0.75;
          }
          50% {
            opacity: 1;
          }
        }

        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        .fade-in-up {
          animation: fade-in-up 0.5s ease-out forwards;
        }

        .scale-in {
          animation: scale-in 0.4s ease-out forwards;
          opacity: 0;
        }
      `}} />
    </div>
  );
}

