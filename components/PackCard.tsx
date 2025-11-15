"use client";

import { useState } from 'react';
import { useWriteContract, useAccount, useChainId, useSwitchChain, usePublicClient } from 'wagmi';
import { CONTRACTS } from '@/lib/contract';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import toast from 'react-hot-toast';
import { usePrivy } from '@privy-io/react-auth';
import { Package } from 'lucide-react';
import useEnsureBaseSepolia from '@/hooks/useEnsureNetwork';
import PackOpeningAnimation from '@/components/PackOpeningAnimation';

interface NFTMetadata {
  name: string;
  description: string;
  image: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

interface PackInfo {
  packAddress: string;
  name: string;
  symbol: string;
  packPrice: bigint;
  maxPacks: bigint;
  packsMinted: bigint;
  packImageUri?: string;
  nftMetadata: NFTMetadata[];
}

interface PackCardProps {
  pack: PackInfo;
}

// Helper function to convert IPFS URI to HTTP URL
const ipfsToHttp = (uri: string): string => {
  if (!uri) return '/cardifyN.png';
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
  }
  return uri;
};

export default function PackCard({ pack }: PackCardProps) {
  const { ready, authenticated, login } = usePrivy();
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync, isPending: isMinting } = useWriteContract();
  const publicClient = usePublicClient({ chainId: 84532 });
  
  const [showAnimation, setShowAnimation] = useState(false);
  const [openedNFTs, setOpenedNFTs] = useState<NFTMetadata[]>([]);
  
  // Ensure we're on the right network
  useEnsureBaseSepolia();

  // Fetch NFT metadata from token URIs
  const fetchNFTMetadata = async (tokenURIs: string[]): Promise<NFTMetadata[]> => {
    const metadataPromises = tokenURIs.slice(0, 5).map(async (tokenUri, index) => {
      if (!tokenUri) {
        return {
          name: `NFT ${index + 1}`,
          description: '',
          image: '/cardifyN.png',
          attributes: []
        } as NFTMetadata;
      }
      
      try {
        // Convert IPFS URI to HTTP URL if needed
        let httpUrl = tokenUri;
        if (httpUrl.startsWith('ipfs://')) {
          // Remove ipfs:// prefix and any leading slashes
          const ipfsHash = httpUrl.replace('ipfs://', '').replace(/^\/+/, '');
          httpUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
        }
        
        console.log(`Fetching metadata from:`, httpUrl);
        
        // Fetch metadata with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        try {
          const response = await fetch(httpUrl, { 
            signal: controller.signal,
            headers: {
              'Accept': 'application/json',
            }
          });
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const metadata = await response.json();
            console.log(`✅ Fetched metadata:`, metadata);
            return metadata as NFTMetadata;
          } else {
            console.warn(`❌ Failed to fetch:`, response.status);
          }
        } catch (fetchError) {
          clearTimeout(timeoutId);
          console.warn(`❌ Fetch error:`, fetchError);
          throw fetchError;
        }
      } catch (error) {
        console.warn('Error fetching NFT metadata:', error);
      }
      
      // Return default metadata if fetch fails
      return {
        name: `NFT ${index + 1}`,
        description: '',
        image: '/cardifyN.png',
        attributes: []
      } as NFTMetadata;
    });
    
    return Promise.all(metadataPromises);
  };

  const handleMintPack = async () => {
    if (!ready || !authenticated || !address) {
      toast.error('Please connect your wallet first');
      return;
    }

    // Auto-switch network if needed
    if (chainId !== 84532) {
      try {
        await switchChainAsync({ chainId: 84532 });
      } catch (error) {
        toast.error('Please switch to Base Sepolia');
        return;
      }
    }

    let toastId = toast.loading('Preparing to mint pack...');
    
    try {
      toast.loading('Please confirm the transaction...', { id: toastId });
      
      // Use wagmi's writeContractAsync
      const hash = await writeContractAsync({
        address: pack.packAddress as `0x${string}`,
        abi: CONTRACTS.packCollectionAbi,
        functionName: 'mintPacks',
        args: [1n],
        value: pack.packPrice,
      });

      toast.loading(`Transaction sent: ${hash.slice(0, 10)}...`, { id: toastId });
      
      // Wait for confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }
      
      toast.success('Pack minted successfully!', { id: toastId });
    } catch (error: any) {
      console.error('Mint pack error:', error);
      toast.dismiss(toastId);
      toast.error(
        error?.code === 4001 || error?.shortMessage?.includes('rejected')
          ? 'Transaction was rejected'
          : error?.shortMessage || error?.message || 'Failed to mint pack',
        { id: toastId }
      );
    }
  };

  const remainingPacks = pack.maxPacks - pack.packsMinted;
  const isSoldOut = remainingPacks <= 0n;

  return (
    <Card 
      className="overflow-hidden bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-purple-500 transition-all duration-300"
    >
      {/* Pack Header */}
      <div className="relative h-64 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
        {pack.packImageUri ? (
          <img
            src={ipfsToHttp(pack.packImageUri)}
            alt={pack.name}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Package className="w-24 h-24 text-purple-400/50" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
        <div className="absolute top-4 left-4 right-4">
          <Badge variant="outline" className="bg-purple-500/20 border-purple-500/50 text-white">
            <Package className="w-3 h-3 mr-1" />
            Pack Series
          </Badge>
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-2xl font-bold text-white mb-1">{pack.name}</h3>
          <p className="text-gray-300 text-sm">{pack.symbol}</p>
        </div>
      </div>

      <div className="p-6 space-y-4">
        {/* Pack Info */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/50 text-white">
            {pack.packsMinted.toString()} / {pack.maxPacks.toString()} Minted
          </Badge>
          <Badge variant="outline" className="bg-pink-500/10 border-pink-500/50 text-white">
            {pack.packPrice > 0n ? `${(Number(pack.packPrice) / 1e18).toFixed(4)} ETH` : 'Free'}
          </Badge>
          {isSoldOut && (
            <Badge variant="outline" className="bg-red-500/10 border-red-500/50 text-white">
              Sold Out
            </Badge>
          )}
        </div>

        {/* NFTs in Pack */}
        <div>
          <h4 className="text-sm font-semibold text-gray-400 mb-3">Contains 5 NFTs:</h4>
          <div className="grid grid-cols-5 gap-2">
            {pack.nftMetadata.map((nft, index) => (
              <div key={index} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-gray-700">
                  <img
                    src={ipfsToHttp(nft.image)}
                    alt={nft.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/cardifyN.png';
                    }}
                  />
                </div>
                <div className="mt-1 text-center">
                  <p className="text-xs text-white font-medium truncate">{nft.name}</p>
                  {nft.attributes && nft.attributes.length > 0 && (
                    <p className="text-xs text-gray-400 truncate">
                      {nft.attributes.find(a => a.trait_type === 'Rarity')?.value || ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mint Button */}
        {!authenticated ? (
          <Button
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            onClick={login}
          >
            Connect Wallet
          </Button>
        ) : (
          <Button 
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            onClick={handleMintPack}
            disabled={isMinting || isSoldOut}
          >
            {isMinting ? 'Minting...' : isSoldOut ? 'Sold Out' : 'Mint Pack'}
          </Button>
        )}
      </div>

      {/* Pack Opening Animation */}
      <PackOpeningAnimation
        isOpen={showAnimation}
        onClose={() => setShowAnimation(false)}
        nftMetadata={openedNFTs}
        packName={pack.name}
      />
    </Card>
  );
}

