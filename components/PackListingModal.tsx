"use client";

import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import toast from 'react-hot-toast';
import { useWriteContract, usePublicClient, useAccount, useChainId, useSwitchChain } from 'wagmi';
import { parseEther, formatEther } from 'viem';
import { CONTRACTS } from '@/lib/contract';
import useEnsureBaseSepolia from '@/hooks/useEnsureNetwork';

interface PackListingModalProps {
  isOpen: boolean;
  onClose: () => void;
  packAddress: string;
  packName: string;
  packImageUri?: string;
  packTokenId: bigint;
  onListed?: () => void;
}

export default function PackListingModal({
  isOpen,
  onClose,
  packAddress,
  packName,
  packImageUri,
  packTokenId,
  onListed
}: PackListingModalProps) {
  const [price, setPrice] = useState('');
  const [isListing, setIsListing] = useState(false);
  
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient = usePublicClient({ chainId: 84532 });
  
  useEnsureBaseSepolia();

  if (!isOpen) return null;

  const priceNum = parseFloat(price) || 0;

  const handleList = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }

    if (chainId !== 84532) {
      try {
        await switchChainAsync({ chainId: 84532 });
      } catch (error) {
        toast.error('Please switch to Base Sepolia');
        return;
      }
    }

    if (!price || priceNum <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    setIsListing(true);
    const toastId = toast.loading('Checking approval...');

    try {
      if (!publicClient) {
        toast.error('Public client not available', { id: toastId });
        setIsListing(false);
        return;
      }

      // Check if marketplace is approved for this pack collection
      const isApproved = await publicClient.readContract({
        address: packAddress as `0x${string}`,
        abi: CONTRACTS.nft1155Abi,
        functionName: 'isApprovedForAll',
        args: [address as `0x${string}`, CONTRACTS.marketplace as `0x${string}`],
      }) as boolean;

      console.log('🔐 Marketplace approval status:', isApproved);

      // If not approved, request approval first
      if (!isApproved) {
        toast.loading('Approving marketplace...', { id: toastId });
        
        const approvalHash = await writeContractAsync({
          address: packAddress as `0x${string}`,
          abi: CONTRACTS.nft1155Abi,
          functionName: 'setApprovalForAll',
          args: [CONTRACTS.marketplace as `0x${string}`, true],
        });

        console.log('✅ Approval transaction hash:', approvalHash);
        
        if (publicClient) {
          await publicClient.waitForTransactionReceipt({ hash: approvalHash });
          console.log('✅ Marketplace approved');
        }
      }

      // List this single pack - use the packTokenId from the pack data
      // This ensures we list at the correct token ID where the pack actually exists
      const listingTokenId = packTokenId; // Use the actual pack token ID
      console.log('📦 Listing pack:', {
        packAddress,
        packTokenId: packTokenId.toString(),
        listingTokenId: listingTokenId.toString(),
        price,
      });
      
      toast.loading('Listing pack...', { id: toastId });
      
      const hash = await writeContractAsync({
        address: CONTRACTS.marketplace as `0x${string}`,
        abi: CONTRACTS.marketplaceAbi,
        functionName: 'listItem1155',
        args: [
          packAddress as `0x${string}`,
          listingTokenId, // Use the actual pack token ID
          parseEther(price)
        ],
      });
      
      console.log('✅ Listing transaction hash:', hash);

      if (publicClient) {
        await publicClient.waitForTransactionReceipt({ hash });
        // Wait a bit more for state to propagate
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Verify the listing was created
        try {
          const verifyListing = await publicClient.readContract({
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
            functionName: 'listings1155',
            args: [packAddress as `0x${string}`, listingTokenId],
          }) as [string, bigint];

          if (verifyListing[0] === "0x0000000000000000000000000000000000000000" || verifyListing[1] === 0n) {
            toast.error('Listing transaction succeeded but listing was not created. Please check if the marketplace recognizes this collection.', { id: toastId });
            setIsListing(false);
            return;
          }
          
          console.log('✅ Pack listing verified:', {
            seller: verifyListing[0],
            price: formatEther(verifyListing[1]),
            tokenId: listingTokenId.toString()
          });
        } catch (verifyErr) {
          console.warn('Could not verify pack listing:', verifyErr);
          // Continue anyway - the transaction succeeded
        }
      }

      toast.success('Pack listed successfully!', { id: toastId });
      onListed?.();
      onClose();
      setPrice('');
    } catch (error: any) {
      console.error('Listing error:', error);
      toast.error(
        error?.shortMessage || error?.message || 'Failed to list pack',
        { id: toastId }
      );
    } finally {
      setIsListing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-gradient-to-b from-gray-900 to-black border border-gray-800">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white">List Pack</h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Pack Info */}
          <div className="mb-6">
            <div className="relative h-32 rounded-lg overflow-hidden bg-gradient-to-r from-purple-500/20 to-pink-500/20 mb-4">
              {packImageUri && (
                <img
                  src={packImageUri.startsWith('ipfs://') 
                    ? `https://gateway.pinata.cloud/ipfs/${packImageUri.replace('ipfs://', '')}`
                    : packImageUri}
                  alt={packName}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <h3 className="text-xl font-bold text-white mb-1">{packName}</h3>
            <p className="text-sm text-gray-400">List this pack for sale</p>
          </div>

          {/* Price Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Price (ETH)
            </label>
            <Input
              type="number"
              step="0.001"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.0"
              className="bg-gray-800 border-gray-700 text-white"
            />
            <p className="text-xs text-gray-400 mt-1">
              Enter the price you want to sell this pack for
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1 border-gray-700 text-gray-300 hover:bg-gray-800"
              disabled={isListing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleList}
              disabled={isListing || !price || priceNum <= 0}
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
            >
              {isListing ? 'Listing...' : 'List Pack'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

