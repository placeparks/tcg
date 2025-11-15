"use client";

import { useState, useEffect } from 'react';
import { useReadContract, useWriteContract, usePublicClient, useAccount, useChainId, useSwitchChain } from 'wagmi';
import { CONTRACTS } from '@/lib/contract';
import { formatEther } from 'viem';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Eye, Tag, Gift } from 'lucide-react';
import toast from 'react-hot-toast';
import PackListingModal from './PackListingModal';

interface DashboardPackCardProps {
  pack: {
    packAddress: string;
    name: string;
    symbol: string;
    packImageUri?: string;
    packTokenId: bigint;
    uniqueId?: string;
    allTokenUris?: string[];
    nftImageUris?: string[];
  };
  onView: () => void;
  onOpen?: (packAddress: string, packName: string) => Promise<void>;
  onListed?: () => void;
}

export default function DashboardPackCard({ pack, onView, onOpen, onListed }: DashboardPackCardProps) {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: 84532 });
  const [showListingModal, setShowListingModal] = useState(false);
  const [isOpening, setIsOpening] = useState(false);

  // Check if user still owns the pack (balance > 0)
  const { data: packBalance, refetch: refetchBalance } = useReadContract({
    address: pack.packAddress as `0x${string}`,
    abi: CONTRACTS.packCollectionAbi,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, pack.packTokenId],
    query: {
      enabled: !!pack.packAddress && !!address,
      refetchInterval: 3000, // Check balance every 3 seconds
      staleTime: 0,
    }
  });

  const ownsPack = (packBalance as bigint | undefined) !== undefined && (packBalance as bigint) > 0n;

  // Check if pack is listed - check at the pack's actual token ID
  const { data: listing, refetch: refetchListingQuery } = useReadContract({
    address: CONTRACTS.marketplace as `0x${string}`,
    abi: CONTRACTS.marketplaceAbi,
    functionName: 'listings1155',
    args: [pack.packAddress as `0x${string}`, pack.packTokenId],
    query: {
      enabled: !!pack.packAddress && ownsPack,
      refetchInterval: 5000,
      staleTime: 0, // Always consider data stale
    }
  });

  // Determine which listing exists - use the pack's actual token ID
  const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';
  const listingData = listing as [string, bigint] | undefined;
  
  // Check if listing exists (seller is not zero address and price > 0)
  const isListed = listingData && 
    listingData[0] !== ZERO_ADDRESS && 
    listingData[1] > 0n;
  const isListedByYou = isListed && address && listingData && listingData[0].toLowerCase() === address.toLowerCase();
  const listingPrice = isListed && listingData ? listingData[1] : 0n;
  const actualTokenId = pack.packTokenId; // Use the pack's actual token ID

  // Refetch listings when needed
  const refetchListingData = async () => {
    // Add a small delay to ensure blockchain state is updated
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Also manually read from contract to verify
    // Check at the pack's actual token ID
    if (publicClient) {
      try {
        const ZERO = '0x0000000000000000000000000000000000000000';
        const manualListing = await publicClient.readContract({
          address: CONTRACTS.marketplace as `0x${string}`,
          abi: CONTRACTS.marketplaceAbi,
          functionName: 'listings1155',
          args: [pack.packAddress as `0x${string}`, pack.packTokenId],
        }) as [string, bigint];
        
        const seller = manualListing[0];
        const price = manualListing[1];
      } catch (error) {
        console.error('Error in manual listing check:', error);
      }
    }
    
    await refetchListingQuery();
  };


  const handleUnlist = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (chainId !== 84532) {
      try {
        await switchChainAsync({ chainId: 84532 });
      } catch (error) {
        toast.error('Please switch to Base Sepolia');
        return;
      }
    }

    const toastId = toast.loading('Unlisting pack...');
    
    try {
      // Cancel the listing using the pack's actual token ID
      const hash = await writeContractAsync({
        address: CONTRACTS.marketplace as `0x${string}`,
        abi: CONTRACTS.marketplaceAbi,
        functionName: 'cancelListing1155',
        args: [pack.packAddress as `0x${string}`, pack.packTokenId], // Use the pack's actual token ID
      });

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Pack unlisted successfully', { id: toastId });
      // Refetch listings after unlisting
      await refetchListingData();
      onListed?.();
    } catch (error: any) {
      console.error('Unlist error:', error);
      toast.error(
        error?.shortMessage || error?.message || 'Failed to unlist pack',
        { id: toastId }
      );
    }
  };

  const handleListClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowListingModal(true);
  };

  const handleOpenPack = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (chainId !== 84532) {
      try {
        await switchChainAsync({ chainId: 84532 });
      } catch (error) {
        toast.error('Please switch to Base Sepolia');
        return;
      }
    }

    if (!onOpen) {
      toast.error('Open pack handler not available');
      return;
    }

    setIsOpening(true);
    const toastId = toast.loading('Opening pack...');
    
    try {
      // Call openPack on the contract
      const hash = await writeContractAsync({
        address: pack.packAddress as `0x${string}`,
        abi: CONTRACTS.packCollectionAbi,
        functionName: 'openPack',
        args: [1n],
      });

      toast.loading(`Opening pack: ${hash.slice(0, 10)}...`, { id: toastId });
      
      // Wait for confirmation
      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
      }

      toast.success('Pack opened successfully!', { id: toastId });
      
      // Immediately refetch balance to update UI
      await refetchBalance();
      
      // Wait a bit for blockchain state to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Call the onOpen handler to show animation (only once)
      if (onOpen) {
        await onOpen(pack.packAddress, pack.name);
      }
      
      // Don't refresh here - let the animation close handler do it
    } catch (error: any) {
      console.error('Error opening pack:', error);
      toast.error(
        error?.shortMessage || error?.message || 'Failed to open pack',
        { id: toastId }
      );
    } finally {
      setIsOpening(false);
    }
  };

  const ipfsToHttp = (uri: string): string => {
    if (!uri) return '/cardifyN.png';
    if (uri.startsWith('ipfs://')) {
      return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
    }
    return uri;
  };

  return (
    <>
      <Card className="relative bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-purple-500 transition-all duration-300 overflow-hidden">
        {/* Pack Image */}
        <div 
          className="relative h-48 bg-gradient-to-r from-purple-500/20 to-pink-500/20 cursor-pointer"
          onClick={onView}
        >
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
              <Package className="w-16 h-16 text-purple-400/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
          <div className="absolute top-3 right-3">
            <Badge variant="outline" className="bg-purple-500/20 border-purple-500/50 text-white">
              <Package className="w-3 h-3 mr-1" />
              Pack
            </Badge>
          </div>
          {isListed && (
            <div className="absolute top-3 left-3">
              <Badge variant="outline" className="bg-green-500/20 border-green-500/50 text-green-300">
                Listed
              </Badge>
            </div>
          )}
          <div className="absolute bottom-3 left-3 right-3">
            <h3 className="text-lg font-bold text-white">{pack.name}</h3>
            <p className="text-gray-300 text-sm">{pack.symbol}</p>
          </div>
        </div>

        {/* Pack Info */}
        <div className="p-4 space-y-3 min-h-[120px] flex flex-col">
          {isListed && isListedByYou && (
            <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Listed Price:</span>
                <span className="text-green-300 font-semibold">
                  {formatEther(listingPrice)} ETH
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 mt-auto">
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={onView}
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white border border-gray-700"
              >
                <Eye className="w-4 h-4 mr-1" />
                View
              </Button>
              {!isListed && ownsPack && (
                <Button
                  size="sm"
                  onClick={handleOpenPack}
                  disabled={isOpening}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white border border-purple-500"
                >
                  <Gift className="w-4 h-4 mr-1" />
                  {isOpening ? 'Opening...' : 'Open'}
                </Button>
              )}
            </div>
            {!ownsPack ? (
              <div className="w-full p-2 text-center text-sm text-gray-400 bg-gray-800/50 rounded border border-gray-700">
                Pack opened
              </div>
            ) : isListedByYou ? (
              <Button
                size="sm"
                onClick={handleUnlist}
                className="w-full bg-red-600 hover:bg-red-700 text-white border border-red-500"
              >
                Unlist
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleListClick}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white border border-purple-500 disabled:bg-gray-700 disabled:text-gray-500 disabled:border-gray-600"
                disabled={isListed}
              >
                <Tag className="w-4 h-4 mr-1" />
                {isListed ? 'Listed' : 'List'}
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Listing Modal */}
      {showListingModal && (
        <PackListingModal
          isOpen={showListingModal}
          onClose={() => setShowListingModal(false)}
          packAddress={pack.packAddress}
          packName={pack.name}
          packImageUri={pack.packImageUri}
          packTokenId={pack.packTokenId}
          onListed={async () => {
            // Wait a bit for transaction to be confirmed
            await new Promise(resolve => setTimeout(resolve, 3000));
            // Refetch listings after listing
            await refetchListingData();
            // Refetch again after a short delay
            setTimeout(async () => {
              await refetchListingData();
            }, 2000);
            onListed?.();
            setShowListingModal(false);
          }}
        />
      )}
    </>
  );
}
