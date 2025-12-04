"use client";

import { useState, useEffect, MouseEvent } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useChainId,
  usePublicClient,
} from "wagmi";
import { formatEther, decodeErrorResult } from "viem";
import Link from "next/link";
import toast from "react-hot-toast";
import {
  Sparkles,
   ShoppingCart,
   Loader2,
  X,
  RefreshCw,
  Eye,
  RotateCcw,
  Zap,
  Shield,
  Activity,
  Box,
  Share2,
  ExternalLink
} from "lucide-react";

import { CONTRACTS } from "@/lib/contract";
import { AlchemyNFT, getBestImageUrl, preferGateway } from "@/lib/alchemy";
import TiltCard from "@/components/ui/TiltCard";
import {Button} from "@/components/ui/button";

interface Props {
  nft: AlchemyNFT;
}

export default function AlchemyNFTCard({ nft }: Props) {
  /* -------------------------------------------------------------------------- */
  /*                                 LOGIC & HOOKS                              */
  /* -------------------------------------------------------------------------- */
  
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  const publicClient = usePublicClient({ chainId: 84532 });
  
  // Force Base Sepolia chain for marketplace reads
  const EXPECTED_CHAIN_ID = 84532; 

  /* state */
  const [load, setLoad] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  const [isFlipped, setIsFlipped] = useState(false);

  /* get image from Alchemy data */
  const rawUrl = getBestImageUrl(nft);
  const isJsonUrl = rawUrl?.endsWith('.json') || 
    (rawUrl && !rawUrl.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp|ico|jfif)$/i) && 
     (rawUrl.includes('metadata') || rawUrl.includes('/json')));
  
  // Image resolution logic
  useEffect(() => {
    const fetchImageFromMetadata = async () => {
      if (rawUrl && !rawUrl.endsWith('.json') && !isJsonUrl) {
        const optimizedUrl = preferGateway(rawUrl);
        const finalUrl = optimizedUrl && (optimizedUrl.includes('/ipfs/') || optimizedUrl.startsWith('ipfs://'))
          ? `/api/ipfs-image?src=${encodeURIComponent(optimizedUrl)}`
          : optimizedUrl;
        setResolvedImageUrl(finalUrl);
        return;
      }

      let tokenUri: string | null = null;
      if (nft.raw?.tokenUri) {
        tokenUri = typeof nft.raw.tokenUri === 'string' ? nft.raw.tokenUri : (nft.raw.tokenUri as any)?.raw || (nft.raw.tokenUri as any)?.gateway || null;
      } else if (nft.tokenUri) {
        tokenUri = typeof nft.tokenUri === 'string' ? nft.tokenUri : (nft.tokenUri as any)?.raw || (nft.tokenUri as any)?.gateway || null;
      }

      if (!tokenUri) {
        if (rawUrl && isJsonUrl) tokenUri = rawUrl;
        else if (publicClient && nft.contract.address && nft.tokenId) {
          try {
            let contractUri = await publicClient.readContract({
              address: nft.contract.address as `0x${string}`,
              abi: CONTRACTS.nft1155Abi,
              functionName: 'uri',
              args: [BigInt(nft.tokenId)],
            } as any) as string;
            
            if (!contractUri || contractUri.trim() === '') {
              contractUri = await publicClient.readContract({
                address: nft.contract.address as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: 'baseUri',
                args: [],
              } as any) as string;
            }
            if (contractUri) tokenUri = contractUri;
          } catch (error) {
            console.error('Failed to fetch URI from contract', error);
          }
        }
      }

      if (tokenUri) {
        try {
        const apiUrl = `/api/ipfs-metadata?src=${encodeURIComponent(tokenUri)}&tokenId=${nft.tokenId}`;
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.imageUrl;
          if (imageUrl) {
            const finalUrl = imageUrl.includes('/ipfs/') || imageUrl.startsWith('ipfs://')
              ? `/api/ipfs-image?src=${encodeURIComponent(imageUrl)}`
              : imageUrl;
            setResolvedImageUrl(finalUrl);
            }
          }
        } catch (error) {
          console.error('Failed to resolve image', error);
        }
      }
    };
    fetchImageFromMetadata();
  }, [nft, rawUrl, isJsonUrl, publicClient]);

  const imageUrl = resolvedImageUrl ?? (rawUrl && !isJsonUrl 
    ? (() => {
        const optimizedUrl = preferGateway(rawUrl);
        return optimizedUrl && (optimizedUrl.includes('/ipfs/') || optimizedUrl.startsWith('ipfs://'))
          ? `/api/ipfs-image?src=${encodeURIComponent(optimizedUrl)}`
          : optimizedUrl;
      })()
    : null);
  
  /* listing info */
  const { data: listing, refetch: refetchListing, isLoading: listingLoading, error: listingError } = useReadContract({
    address: CONTRACTS.marketplace,
    abi: CONTRACTS.marketplaceAbi,
    functionName: "listings1155",
    args: [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
    chainId: EXPECTED_CHAIN_ID,
    query: {
      enabled: !!nft?.contract?.address,
      staleTime: 0,
      refetchOnWindowFocus: true,
      refetchInterval: 10000,
      retry: false,
    },
  });

  const ZERO = "0x0000000000000000000000000000000000000000";
  const tuple = listing as any;
  const listingData = tuple && !listingError
    ? { seller: tuple[0] as `0x${string}`, price: tuple[1] as bigint, remaining: 1n }
    : undefined;

  const isListed = !!listingData && listingData.seller !== ZERO && listingData.price > 0n;
  const isListedByYou = isListed && listingData!.seller.toLowerCase() === address?.toLowerCase();

  // Since this component is often used in a "My NFTs" dashboard, we can sometimes assume ownership, 
  // but if used in Marketplace, we check against address.
  // For safety, let's assume if it's in "My NFTs" address matches contract check, or passed via props.
  // Here we'll rely on the parent or context, but for "Buy" button visibility, we check if seller != user.
  const canBuy = isListed && !isListedByYou;

  /* actions */
  const handleRefresh = async (e: MouseEvent) => {
    e.stopPropagation();
    setRefreshing(true);
    try { await refetchListing(); toast.success("Synced with chain"); } 
    catch { toast.error("Sync failed"); } 
    finally { setRefreshing(false); }
  };

  const buy = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!address) { toast.error("Connect wallet first"); return; }
    if (!listingData) return;
    try {
      await writeContractAsync({
        address: CONTRACTS.marketplace,
        abi: CONTRACTS.marketplaceAbi,
        functionName: "buy1155",
        args: [nft.contract.address as `0x${string}`, BigInt(nft.tokenId), 1n],
        value: listingData.price,
      } as any);
      toast.success("Asset Acquired!");
      refetchListing();
    } catch (err: any) {
      toast.error("Transaction Failed");
    }
  };

  const cancelListing = async (e: MouseEvent) => {
    e.stopPropagation();
    if (!address) return;
    try {
      await writeContractAsync({
        address: CONTRACTS.marketplace,
        abi: CONTRACTS.marketplaceAbi,
        functionName: "cancelListing1155",
        args: [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
      } as any);
      toast.success("Listing Removed");
      refetchListing();
    } catch (err: any) {
      toast.error("Cancellation Failed");
    }
  };

  // Extract attributes for back of card
  const attributes = (nft.raw?.metadata?.attributes || []) as Array<{ trait_type: string; value: string }>;

  // Fallback image
  const fallback = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMDkwNTE4Ii8+PHBhdGggZD0iTTEwMCAxMDBMMzAwIDMwME0zMDAgMTAwTTEwMCAzMDAiIHN0cm9rZT0iIzMzMyIgc3Ryb2tlLXdpZHRoPSIyIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJtb25vc3BhY2UiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkRPV05MT0FEIEZBSUxFRDwvdGV4dD48L3N2Zz4=";

  /* -------------------------------------------------------------------------- */
  /*                                    RENDER                                  */
  /* -------------------------------------------------------------------------- */

  return (
    <TiltCard className="h-[480px] w-full" glowColor={isListed ? "rgba(176,38,255,0.4)" : "rgba(0,243,255,0.3)"}>
      <div 
        className={`relative w-full h-full transition-all duration-700 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        
        {/* ======================= FRONT FACE ======================= */}
        <div className="absolute inset-0 backface-hidden bg-[#0a0a0f] border border-white/10 rounded-xl overflow-hidden flex flex-col group cursor-pointer">
            
            {/* --- Status Bar --- */}
            <div className="absolute top-0 left-0 w-full z-20 flex justify-between p-3 pointer-events-none">
                <div className="flex gap-2">
                    {isListed ? (
                        <div className="bg-neon-purple/90 backdrop-blur text-black text-[10px] font-bold px-2 py-0.5 rounded shadow-[0_0_10px_rgba(176,38,255,0.4)] flex items-center gap-1">
                            <Activity className="w-3 h-3" /> LISTED
            </div>
                    ) : (
                        <div className="bg-gray-800/90 backdrop-blur text-gray-300 text-[10px] font-bold px-2 py-0.5 rounded border border-white/10 flex items-center gap-1">
                            <Shield className="w-3 h-3" /> SECURE
          </div>
                    )}
                </div>
                
                {/* Refresh Button */}
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                    className="pointer-events-auto bg-black/50 backdrop-blur p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                >
                    <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>

            {/* --- Image Area --- */}
            <div className="relative h-[280px] w-full bg-gray-900 overflow-hidden">
                 {(load || !imageUrl) && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <Loader2 className="w-8 h-8 text-neon-blue animate-spin" />
                    </div>
                 )}
                 
                 <img
                    src={imageUrl ?? fallback}
                    alt={nft.name || 'NFT'}
                    className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${load ? 'opacity-0' : 'opacity-100'}`}
                    onLoad={() => { setLoad(false); setImgError(false); }}
                    onError={(e) => { (e.target as HTMLImageElement).src = fallback; setLoad(false); setImgError(true); }}
                 />
                 
                 {/* Cyber Overlay Gradient */}
                 <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-transparent opacity-90" />
                 
                 {/* Floating Rarity (if available in attributes) */}
                 {attributes.length > 0 && (
                     <div className="absolute bottom-4 left-4">
                         <div className="text-[10px] text-neon-blue font-mono tracking-widest uppercase mb-0.5">TYPE</div>
                         <div className="text-white font-display font-bold tracking-wide">
                             {attributes.find(a => a.trait_type === 'Rarity')?.value || 'Standard'}
                         </div>
                     </div>
                 )}
            </div>

            {/* --- Info Area --- */}
            <div className="flex-1 p-4 flex flex-col justify-between relative">
                 {/* Tech decoration */}
                 <div className="absolute top-0 right-0 w-16 h-[1px] bg-gradient-to-l from-white/20 to-transparent" />

                 <div>
                     <div className="flex justify-between items-start mb-1">
                         <h3 className="text-white font-display font-bold text-lg leading-tight truncate pr-2 group-hover:text-neon-blue transition-colors">
                             {nft.name || `Asset #${nft.tokenId}`}
                         </h3>
                         <span className="text-xs font-mono text-gray-500">#{nft.tokenId}</span>
                     </div>
                     <p className="text-gray-500 text-xs line-clamp-2 min-h-[2.5em] font-sans">
                         {nft.description || "No description data available in system."}
                     </p>
                 </div>

                 {/* Price / Action Row */}
                 <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                     {listingLoading ? (
                         <div className="text-xs text-gray-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Syncing...</div>
                     ) : isListed ? (
                         <div className="flex flex-col">
                             <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Current Price</span>
                             <span className="text-neon-purple font-mono font-bold text-lg">{formatEther(listingData!.price)} ETH</span>
                         </div>
                     ) : (
                         <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Status</span>
                            <span className="text-gray-300 font-mono text-sm">Not Listed</span>
                         </div>
                     )}

                     <div onClick={(e) => e.stopPropagation()}>
                         {isListedByYou ? (
                             <Button onClick={cancelListing} variant="outline" className="!px-3 !py-1.5 text-xs border-red-500/50 text-red-400 hover:bg-red-500/10">
                                 Cancel
                             </Button>
                         ) : canBuy ? (
                             <Button onClick={buy} variant={"primary" as any} glow className="!px-4 !py-1.5 text-xs">
                                 Buy Now
                             </Button>
                         ) : (
                             !isListed && (
                                <Link href={`/list/${nft.contract.address}/${nft.tokenId}`}>
                                    <Button variant="secondary" className="!px-4 !py-1.5 text-xs">
                                        List Item
                                    </Button>
                                </Link>
                             )
                         )}
            </div>
          </div>
        </div>

            {/* View Specs Hint */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                <div className="bg-black/80 backdrop-blur border border-white/20 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-white font-bold tracking-wider">
                    <Eye className="w-3 h-3 text-neon-blue" /> VIEW SPECS
                </div>
            </div>
              </div>


        {/* ======================= BACK FACE ======================= */}
        <div className="absolute inset-0 backface-hidden rotate-y-180 bg-[#08080c] border border-neon-blue/30 rounded-xl overflow-hidden p-6 flex flex-col shadow-[inset_0_0_30px_rgba(0,0,0,0.8)]">
            
            {/* Background Grid */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(0,243,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,243,255,0.03)_1px,transparent_1px)] bg-[size:20px_20px] pointer-events-none" />
            
            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
                    <h3 className="font-display font-bold text-lg text-white tracking-widest uppercase">
                        Sys<span className="text-neon-blue">.Data</span>
                    </h3>
                <button
                        onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
                        className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-white/10 rounded"
                >
                        <RotateCcw className="w-5 h-5" />
                </button>
              </div>

                {/* Attributes Grid */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                    {attributes.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2 mb-4">
                            {attributes.map((attr, idx) => (
                                <div key={idx} className="bg-white/5 border border-white/5 p-2 rounded hover:border-neon-blue/30 transition-colors">
                                    <div className="text-[9px] text-neon-blue uppercase tracking-wider mb-0.5 truncate">{attr.trait_type}</div>
                                    <div className="text-xs text-white font-mono truncate" title={attr.value}>{attr.value}</div>
              </div>
                            ))}
              </div>
            ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-gray-500 border border-dashed border-white/10 rounded mb-4">
                            <Box className="w-8 h-8 mb-2 opacity-50" />
                            <span className="text-xs font-mono uppercase">No Metadata</span>
                        </div>
                    )}
              </div>

                {/* Contract Info Footer */}
                <div className="mt-auto pt-4 border-t border-white/10 space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono">
                         <span className="text-gray-500">CONTRACT</span>
                         <span className="text-neon-purple flex items-center gap-1 cursor-pointer hover:text-white transition-colors" title={nft.contract.address}>
                            {nft.contract.address.slice(0, 6)}...{nft.contract.address.slice(-4)}
                            <ExternalLink className="w-3 h-3" />
                </span>
                    </div>
                    
                    <div className="flex gap-2">
                         <button className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded py-2 text-[10px] font-bold text-gray-300 transition-colors flex items-center justify-center gap-2">
                             <Share2 className="w-3 h-3" /> SHARE
                         </button>
                         <button className="flex-1 bg-neon-blue/10 hover:bg-neon-blue/20 border border-neon-blue/30 rounded py-2 text-[10px] font-bold text-neon-blue transition-colors flex items-center justify-center gap-2">
                             <Activity className="w-3 h-3" /> HISTORY
                </button>
              </div>
          </div>
        </div>
      </div>

      </div>
    </TiltCard>
  );
}
