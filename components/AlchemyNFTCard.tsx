"use client";

import { useState, useEffect, MouseEvent } from "react";
import {
  useAccount,
  useWriteContract,
  useReadContract,
  useChainId,
} from "wagmi";
import { formatEther, decodeErrorResult } from "viem";
import Image    from "next/image";
import Link     from "next/link";
import toast    from "react-hot-toast";
import {
  Sparkles,
   ShoppingCart,
   Loader2,
  X,
  RefreshCw
} from "lucide-react";

import { CONTRACTS } from "@/lib/contract";
import { Badge }     from "@/components/ui/badge";
import { AlchemyNFT, getBestImageUrl, preferGateway } from "@/lib/alchemy";

interface Props {
  nft: AlchemyNFT;
}

export default function AlchemyNFTCard({ nft }: Props) {
  /* wallet hooks */
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const chainId = useChainId();
  
  // Force Base Sepolia chain for marketplace reads
  const EXPECTED_CHAIN_ID = 84532; // Base Sepolia
  console.log("🔗 Dashboard chainId =", chainId, "expected =", EXPECTED_CHAIN_ID);

  /* state */
  const [load, setLoad] = useState(true);
  const [imgError, setImgError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  /* get image from Alchemy data */
  const rawUrl = getBestImageUrl(nft);
  // Temporarily bypass preferGateway to test if it's causing issues
  const imageUrl = rawUrl; // rawUrl ? preferGateway(rawUrl) : null;
  
  // Debug: log if no image URL is found
  if (!imageUrl) {
    console.warn('⚠️ No image URL found for NFT:', {
      tokenId: nft.tokenId,
      contract: nft.contract.address,
      name: nft.name,
      hasImage: !!nft.image,
      hasRawMetadata: !!nft.raw?.metadata,
      metadataImage: nft.raw?.metadata?.image
    });
  }
  
  // Debug image URL
  useEffect(() => {
    console.log('🔍 NFT Image Debug - Full NFT Data:', nft);
    console.log('🔍 NFT Image Debug - Image Sources:', {
      nftName: nft.name,
      rawUrl,
      imageUrl,
      alchemyImage: nft.image,
      metadataImage: nft.raw?.metadata?.image,
      tokenUri: nft.raw?.tokenUri,
      topLevelTokenUri: nft.tokenUri,
      hasImage: 'image' in nft,
      imageKeys: nft.image ? Object.keys(nft.image) : 'no image',
      metadataKeys: nft.raw?.metadata ? Object.keys(nft.raw.metadata) : 'no metadata'
    });
    console.log("🖼 resolved imageUrl =", imageUrl);
    console.log("🔍 preferGateway test:", rawUrl ? preferGateway(rawUrl) : 'no rawUrl');
  }, [nft, imageUrl, rawUrl]);

  /* listing info - determine token type and use correct function */
  // Force ERC1155 for NFTs from our factories since our marketplace only supports ERC1155
  const isERC1155 = true; // Always treat as ERC1155 since our marketplace only supports ERC1155
  const listingFunctionName = "listings1155";
  
  const { data: listing, refetch: refetchListing, isLoading: listingLoading, error: listingError } = useReadContract({
    address:       CONTRACTS.marketplace,
    abi:           CONTRACTS.marketplaceAbi,
    functionName:  listingFunctionName,
    args:          [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
    chainId:       EXPECTED_CHAIN_ID,           // 🔴 force Base-Sepolia
    query: {
      enabled: !!nft?.contract?.address,
      staleTime: 0,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchInterval: 5_000,                // poll every 5s for faster updates
      retry: false, // Don't retry for unlisted NFTs - this is expected behavior
    },
  });

  // Parse listing data with proper typing
  const ZERO = "0x0000000000000000000000000000000000000000";
  const tuple = listing as any;

  const listingData = tuple && !listingError
    ? { seller: tuple[0] as `0x${string}`, price: tuple[1] as bigint, remaining: 1n } // Always ERC1155 format
    : undefined;

  // Separate "listed" from "listed by me"
  const isListed = !!listingData && listingData.seller !== ZERO && listingData.price > 0n && listingData.remaining > 0n;
  const isListedByYou = isListed && listingData!.seller.toLowerCase() === address?.toLowerCase();

  // Enhanced debug logging for listing detection
  console.log('🔍 Enhanced Listing Debug:', {
    tokenId: nft.tokenId,
    contractAddress: nft.contract.address,
    address,
    rawListing: listing,
    tuple,
    listingData,
    isListed,
    isListedByYou,
    seller: listingData?.seller,
    price: listingData?.price,
    remaining: listingData?.remaining,
    zeroAddress: ZERO,
    sellerIsZero: listingData?.seller === ZERO,
    priceIsZero: listingData?.price === 0n,
    remainingIsZero: listingData?.remaining === 0n,
    listingFunctionName,
    isERC1155,
    listingLoading,
    listingError
  });

  // Check if current user owns this NFT
  // Since this component is used in the dashboard, we assume the user owns the NFT
  const isOwner = !!address;
  
  // Debug logging
  console.log('🔍 AlchemyNFTCard Debug:', {
    tokenId: nft.tokenId,
    contractAddress: nft.contract.address,
    address,
    isOwner,
    listingData,
    isListed,
    isListedByYou,
    seller: listingData?.seller,
    listingFunctionName,
    marketplace: CONTRACTS.marketplace,
    isERC1155,
    rawListing: listing,
    chainId,
    expectedChainId: EXPECTED_CHAIN_ID,
    chainMatch: chainId === EXPECTED_CHAIN_ID,
    nameSources: {
      nftName: nft.name,
      metadataName: nft.raw?.metadata?.name,
      contractName: nft.contract.name,
      finalName: nft.name || nft.raw?.metadata?.name || nft.contract.name || `NFT #${nft.tokenId}`
    }
  });

  /* refresh handler */
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchListing();
      toast.success("Listing status refreshed");
    } catch (error) {
      console.error('Failed to refresh listing:', error);
      toast.error("Failed to refresh listing status");
    } finally {
      setRefreshing(false);
    }
  };

  /* buy handler */
  const buy = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!listingData) {
      toast.error("This NFT is not for sale");
      return;
    }

    try {
      // Always use ERC1155 since our marketplace only supports ERC1155
      await writeContractAsync({
        address: CONTRACTS.marketplace,
        abi:     CONTRACTS.marketplaceAbi,
        functionName: "buy1155",
        args:    [nft.contract.address as `0x${string}`, BigInt(nft.tokenId), 1n],
        value:   listingData.price,
      });

      toast.success("NFT purchased successfully!");
    } catch (error: any) {
      console.error("Buy error:", error);
      
      try {
        const decoded = decodeErrorResult({
          abi: CONTRACTS.marketplaceAbi,
          data: error.data,
        });
        toast.error(`Transaction failed: ${decoded.errorName}`);
      } catch {
        toast.error("Transaction failed. Please try again.");
      }
    }
  };

  /* cancel listing handler */
  const cancelListing = async (e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (!listingData) {
      toast.error("This NFT is not listed");
      return;
    }

    try {
      // Always use ERC1155 since our marketplace only supports ERC1155
      await writeContractAsync({
        address: CONTRACTS.marketplace,
        abi:     CONTRACTS.marketplaceAbi,
        functionName: "cancelListing1155",
        args:    [nft.contract.address as `0x${string}`, BigInt(nft.tokenId)],
      });

      toast.success("Listing cancelled successfully!");
    } catch (error: any) {
      console.error("Cancel listing error:", error);
      
      try {
        const decoded = decodeErrorResult({
          abi: CONTRACTS.marketplaceAbi,
          data: error.data,
        });
        toast.error(`Transaction failed: ${decoded.errorName}`);
      } catch {
        toast.error("Transaction failed. Please try again.");
      }
    }
  };

  const fallback = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjQwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjMzMzIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyMCIgZmlsbD0iI2ZmZiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZHk9Ii4zZW0iPk5GVCBJbWFnZTwvdGV4dD48L3N2Zz4=";

  return (
    <div className="group relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/20 hover:border-white/40 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-purple-500/20">
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden">
        {load ? (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-spin">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
          </div>
        ) : imgError ? (
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-white text-xs">!</span>
              </div>
              <p className="text-xs text-red-400">Image Error</p>
            </div>
          </div>
        ) : null}
        
        <img
          src={imageUrl || fallback}
          alt={nft.name || "NFT"}
          className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${load ? "opacity-0" : "opacity-100"}`}
          onLoad={() => {
            console.log('✅ Image loaded successfully:', imageUrl);
            setLoad(false);
            setImgError(false);
          }}
          onError={(e) => {
            console.log('❌ Image failed to load:', imageUrl);
            console.log('❌ Error event:', e);
            console.log('🔄 Trying fallback image...');
            (e.target as HTMLImageElement).src = fallback;
            setLoad(false);
            setImgError(true);
          }}
        />
        
        {/* Hover Overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
            <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-lg border border-white/30">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-xl mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300 truncate">
              {nft.name || nft.raw?.metadata?.name || nft.contract.name || `NFT #${nft.tokenId}`}
            </h3>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400 uppercase tracking-wider font-medium">
                #{nft.tokenId}
              </span>
              <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400 font-medium">Owned</span>
                </div>
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-1 hover:bg-white/10 rounded transition-colors duration-200 disabled:opacity-50"
                  title="Refresh listing status"
                >
                  <RefreshCw className={`w-3 h-3 text-gray-400 ${refreshing ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Price and Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10">
          {listingLoading ? (
            <div className="flex items-center gap-2 text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading listing status...</span>
            </div>
          ) : listingError ? (
            // Check if it's a "not found" error (expected for unlisted NFTs) vs a real error
            listingError.message?.includes('not found') || 
            listingError.message?.includes('execution reverted') ||
            listingError.message?.includes('call exception') ? (
              <div className="flex items-center gap-2 text-gray-400">
                <span className="text-sm">Not listed</span>
                <button
                  onClick={handleRefresh}
                  className="text-xs bg-gray-500/20 hover:bg-gray-500/30 px-2 py-1 rounded transition-colors"
                  title="Refresh listing status"
                >
                  Refresh
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <span className="text-sm">Error loading listing</span>
                <button
                  onClick={handleRefresh}
                  className="text-xs bg-red-500/20 hover:bg-red-500/30 px-2 py-1 rounded transition-colors"
                >
                  Retry
                </button>
              </div>
            )
          ) : isOwner ? (
            // Owner's view - three states: listed by you, listed by someone else, not listed
            isListedByYou ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">
                  {formatEther(listingData!.price)} ETH
                </span>
                <button
                  onClick={cancelListing}
                  className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 flex items-center gap-1.5 hover:shadow-lg hover:shadow-red-500/25"
                >
                  <X className="w-3 h-3" />
                  Cancel
                </button>
              </div>
            ) : isListed ? (
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="text-sm">Already listed (not by this wallet)</span>
                <span className="text-white font-bold">{formatEther(listingData!.price)} ETH</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-400">Not listed</span>
                <Link
                  href={`/list/${nft.contract.address}/${nft.tokenId}`}
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <Sparkles className="w-4 h-4" />
                  List
                </Link>
              </div>
            )
          ) : (
            // Non-owner's view
            isListed ? (
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold text-white">
                  {formatEther(listingData!.price)} ETH
                </span>
                <button
                  onClick={buy}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2"
                >
                  <ShoppingCart className="w-4 h-4" />
                  Buy Now
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                  <Sparkles className="w-3 h-3 text-white" />
                </div>
                <span>Not for sale</span>
              </div>
            )
          )}
          
          <div className="text-xs text-gray-500 font-mono bg-white/10 backdrop-blur-sm px-2 py-1 rounded border border-white/20">
            {nft.contract.address.slice(0, 6)}...{nft.contract.address.slice(-4)}
          </div>
        </div>
      </div>

      {/* Gradient glow effect */}
      <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-xl" />
      </div>
    </div>
  );
}
