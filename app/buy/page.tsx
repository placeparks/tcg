"use client"

import { useEffect, useState, useCallback, useRef, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useBalance,
  useSwitchChain,
  useChainId,
} from "wagmi"
import { watchAccount } from "@wagmi/core"
import { encodeFunctionData, decodeErrorResult, formatEther } from "viem"
import toast from "react-hot-toast"
import { CONTRACTS } from "@/lib/contract"
import {
  Sparkles,
  ShoppingCart,
  X,
  Zap,
  Eye,
  Heart,
  TrendingUp,
  Crown,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import useEnsureBaseSepolia from "@/hooks/useEnsureNetwork";
import FullPageLoader from "@/components/FullPageLoader" 
import { chunked, metaCache } from "@/lib/net-utils";
import { wagmi } from "../providers";


/* ─── constants ─── */
const CHAIN_ID = 84532

const ipfsToHttp = (u: string) => u.replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/")

type ListingStruct = { seller: `0x${string}`; price: bigint }
type Listing1155Tuple = readonly [`0x${string}`, bigint] // [seller, unitPrice]

export default function BuyPage() {
  useEnsureBaseSepolia(); 
  const router = useRouter()
  const { address } = useAccount()
  const publicClient = usePublicClient({ chainId: CHAIN_ID })!
  const { writeContractAsync } = useWriteContract()


  /* auto-switch network */
const { switchChainAsync } = useSwitchChain();
  const chainId = useChainId(); 

  /* live balance */
  const { data: balanceData } = useBalance({ address, chainId: CHAIN_ID })

  /* collections - fetch from both factories */
  const { data: totalCollectionsERC1155 } = useReadContract({
    address: CONTRACTS.factoryERC1155,
    abi: CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
  })

  const { data: totalCollectionsSingle } = useReadContract({
    address: CONTRACTS.singleFactory,
    abi: CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
  })

  // State for collections
  const [collections, setCollections] = useState<string[]>([])

  // Fetch all collections by index when total count is available
  useEffect(() => {
    if ((!totalCollectionsERC1155 && !totalCollectionsSingle) || !publicClient) return;
    
    const fetchCollections = async () => {
      const collectionsList: string[] = [];
      
      // Fetch from ERC1155 factory
      if (totalCollectionsERC1155) {
        const count = Number(totalCollectionsERC1155 as bigint);
        console.log('🔍 Fetching ERC1155 collections:', count);
        
        for (let i = 0; i < count; i++) {
          try {
            const address = await publicClient.readContract({
              address: CONTRACTS.factoryERC1155 as `0x${string}`,
              abi: CONTRACTS.factoryERC1155Abi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            collectionsList.push(address as string);
          } catch (error) {
            console.error(`Error fetching ERC1155 collection at index ${i}:`, error);
          }
        }
      }
      
      // Fetch from Single factory
      if (totalCollectionsSingle) {
        const count = Number(totalCollectionsSingle as bigint);
        console.log('🔍 Fetching Single factory collections:', count);
        
        for (let i = 0; i < count; i++) {
          try {
            const address = await publicClient.readContract({
              address: CONTRACTS.singleFactory as `0x${string}`,
              abi: CONTRACTS.singleFactoryAbi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            collectionsList.push(address as string);
          } catch (error) {
            console.error(`Error fetching Single factory collection at index ${i}:`, error);
          }
        }
      }
      
      console.log('🏭 Fetched All Collections:', collectionsList);
      setCollections(collectionsList);
    };
    
    fetchCollections();
  }, [totalCollectionsERC1155, totalCollectionsSingle, publicClient]);

  /* listings state */
  const [listedNFTs, setListedNFTs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)
  const inFlight = useRef(false)
  const lastFetchedCollections = useRef<string>('')
  const fetchTimeout = useRef<NodeJS.Timeout | null>(null)
  
  // Add a small delay to prevent flash of "No NFTs Listed" message
  const [showContent, setShowContent] = useState(false)

  // Add delay to prevent flash of "No NFTs Listed" message
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);

/* ─────────── fast, dependency-free fetcher ─────────── */
const fetchListings = useCallback(async () => {
  if (inFlight.current) return;        // prevent overlap without deadlock
  
  // Clear any existing timeout
  if (fetchTimeout.current) {
    clearTimeout(fetchTimeout.current);
  }
  
  // Debounce the fetch to prevent rapid successive calls
  fetchTimeout.current = setTimeout(async () => {
  inFlight.current = true;
  try {
    setLoading(true);

    // 1) supplies
    const supplies: bigint[] = [];
    for (const col of collections) {
      try {
        const maxSupply = await publicClient.readContract({
          address: col as `0x${string}`,
          abi: CONTRACTS.nft1155Abi,
          functionName: "maxSupply",
        });
        supplies.push(maxSupply as bigint);
        console.log(`✅ maxSupply for ${col}:`, maxSupply);
      } catch {
        try {
          const totalMinted = await publicClient.readContract({
            address: col as `0x${string}`,
            abi: CONTRACTS.nft1155Abi,
            functionName: "totalMinted",
          });
          supplies.push(totalMinted as bigint);
          console.log(`✅ totalMinted fallback for ${col}:`, totalMinted);
        } catch {
          supplies.push(1n);
          console.log(`🔄 Using fallback value 1 for ${col}`);
        }
      }
    }

    const items: any[] = [];

    // 2) per-collection
  await Promise.all(
      collections.map(async (col: string, idx: number) => {
      const total = supplies[idx] ?? 0n;
        if (total === 0n) return;

        // Check a reasonable range of token IDs (limit to first 100 to prevent infinite loops)
        const maxTokensToCheck = Math.min(Number(total), 100);
        const tokensToCheck = Array.from({ length: maxTokensToCheck }, (_, i) => i);
        const listings: [string, bigint][] = [];
        
        for (const i of tokensToCheck) {
          try {
            const listing = await publicClient.readContract({
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
              functionName: "listings1155",
              args: [col as `0x${string}`, BigInt(i)],
            }) as [string, bigint];
            listings.push(listing);
            console.log(`✅ Listing for ${col} token ${i}:`, listing);
          } catch {
            listings.push(["0x0000000000000000000000000000000000000000", 0n]);
          }
        }

        const liveIdx = listings.map((l, i) => (l[1] > 0n ? i : -1)).filter(i => i >= 0);
        if (!liveIdx.length) return;

      const tokenUris: string[] = [];
      for (const i of liveIdx) {
        try {
          const uri = await publicClient.readContract({
              address: col as `0x${string}`,
            abi: CONTRACTS.nft1155Abi,
            functionName: "uri",
            args: [BigInt(i)],
          }) as string;
          tokenUris.push(uri);
          console.log(`✅ URI for ${col} token ${i}:`, uri);
          } catch {
            tokenUris.push(`ipfs://fallback/${i}`);
          }
        }

      const metas: any[] = [];
        for (let j = 0; j < tokenUris.length; j++) {
          const uri = tokenUris[j];
        try {
          if (metaCache.has(uri)) {
            metas.push(metaCache.get(uri));
            continue;
          }
            const res = await fetch(ipfsToHttp(uri));
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('image/')) {
              const md = { name: `NFT #${liveIdx[j]}`, image: ipfsToHttp(uri) };
              metaCache.set(uri, md);
              metas.push(md);
            } else {
              const md = await res.json();
              metaCache.set(uri, md);
              metas.push(md);
            }
          } catch {
            metas.push({ name: `NFT #${liveIdx[j]}`, image: "/placeholder.svg" });
          }
        }

      liveIdx.forEach((i, j) => {
          const [seller, unitPrice] = listings[i];
        items.push({
          collection: col,
            id: i,
            seller,
            price: unitPrice,
            metadata: metas[j],
          });
        });
      })
  );

    console.log(`🎉 Fetch completed! Found ${items.length} listed NFTs:`, items);
  setListedNFTs(items);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, 500); // 500ms debounce
}, [publicClient, collections]);

/* ─────────── trigger fetch whenever collections change ─────────── */
useEffect(() => {
  const collectionsKey = collections.join(',');
  console.log('🔄 useEffect triggered - collections:', collections.length, 'inFlight:', inFlight.current, 'lastFetched:', lastFetchedCollections.current);
  
  if (collections.length === 0) {
    setListedNFTs([]);
    setLoading(false);
    lastFetchedCollections.current = '';
    return;
  }
  
  // Only fetch if not already in flight and collections have actually changed
  if (!inFlight.current && collectionsKey !== lastFetchedCollections.current) {
    console.log('🚀 Starting fetchListings...');
    lastFetchedCollections.current = collectionsKey;
  fetchListings();
  }
}, [collections, fetchListings]);



  /* buy flow */
/* ─── BUY FLOW ────────────────────────────────────────────── */
async function buyNFT(
  collection: `0x${string}`,
  id:         number,
  price:      bigint,
) {
  /* 1️⃣ basic guards */
  if (!address) {
    toast.error('Connect wallet first');
    return;
  }

  console.log('🛒 Starting buyNFT:', { collection, id, price, address });
  
  // Check the listing details first
  try {
    const listing = await publicClient.readContract({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "listings1155",
      args: [collection, BigInt(id)],
    });
    console.log('📋 Current listing:', listing);
    
    const [seller, unitPrice] = listing as [string, bigint];
    console.log('📋 Listing details:', { seller, unitPrice });
    
    // For ERC1155, we assume remaining is always 1 (single item listing)
    const remaining = 1n;
    
    if (unitPrice !== price) {
      toast.error(`Price mismatch: expected ${unitPrice}, got ${price}`);
      return;
    }
  } catch (err) {
    console.log('❌ Failed to fetch listing details:', err);
    toast.error('Failed to fetch listing details');
    return;
  }
  
  // Skip collection validation since we already validated during listing
  // The marketplace will handle validation during the transaction
  console.log('🔍 Skipping collection validation - already validated during listing');

// wait until the wallet really switched
const waitForChain = (target: number) =>
  new Promise<void>((resolve, reject) => {
    try {
    const unwatch = watchAccount(wagmi, {
      onChange(acct) {
          if (!acct.isConnected) { 
            unwatch(); 
            reject(new Error("disconnected")); 
            return;
          }
          if (acct.chainId === target) { 
            unwatch(); 
            resolve(); 
          }
      },
    });
    } catch (err) {
      reject(new Error("Failed to watch account"));
    }
  });


  if (chainId !== CHAIN_ID) {
    try {
      await switchChainAsync({ chainId: CHAIN_ID }); // opens MetaMask
      await waitForChain(CHAIN_ID);                  // ⏳ wait until switched
    } catch {
      toast.error('Please switch to Base-Sepolia');
      return;
    }
  }

  /* 3️⃣ dry-run to surface reverts */
  try {
    console.log('🔍 Simulating buy1155 transaction...');
    
    // Let's also check the exact parameters being passed
    console.log('📊 Buy parameters:', {
      nft: collection,
      id: id,
      amount: 1,
      value: price,
      buyer: address
    });
  
  // Check buyer's ETH balance
  try {
    const buyerBalance = await publicClient.getBalance({ address: address as `0x${string}` });
    console.log('💳 Buyer ETH balance:', buyerBalance);
    
    if (buyerBalance < price) {
      toast.error('Insufficient ETH balance');
      return;
    }
  } catch (err) {
    console.log('❌ Failed to check buyer balance:', err);
  }
  
  // Check if the marketplace is paused
  try {
    const isPaused = await publicClient.readContract({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "paused",
    });
    console.log('⏸️ Marketplace paused:', isPaused);
    
    if (isPaused) {
      toast.error('Marketplace is currently paused');
      return;
    }
  } catch (err) {
    console.log('❌ Failed to check if marketplace is paused:', err);
  }
  
  // Check seller's balance and approval
  try {
    const listing = await publicClient.readContract({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "listings1155",
      args: [collection, BigInt(id)],
    });
    const [seller] = listing as [string, bigint];
    
    const sellerBalance = await publicClient.readContract({
      address: collection as `0x${string}`,
      abi: CONTRACTS.nft1155Abi,
      functionName: "balanceOf",
      args: [seller as `0x${string}`, BigInt(id)],
    });
    console.log('💰 Seller balance:', sellerBalance);
    
    const isApproved = await publicClient.readContract({
      address: collection as `0x${string}`,
      abi: CONTRACTS.nft1155Abi,
      functionName: "isApprovedForAll",
      args: [seller as `0x${string}`, CONTRACTS.marketplace],
    });
    console.log('✅ Seller approved marketplace:', isApproved);
    
    if (!isApproved) {
      toast.error('Seller has not approved the marketplace');
      return;
    }
  } catch (err) {
    console.log('❌ Failed to check seller balance/approval:', err);
  }
  
  // Check if the NFT collection has any custom restrictions
  try {
    // Try to read some common NFT contract functions to see if they exist
    const collectionName = await publicClient.readContract({
      address: collection as `0x${string}`,
      abi: CONTRACTS.nft1155Abi,
      functionName: "name",
    });
    console.log('🏷️ Collection name:', collectionName);
    
    // Note: supportsInterface not available in our custom ABI
  } catch (err) {
    console.log('❌ Failed to check collection details:', err);
  }
  
  // Check if the NFT collection allows external transfers
  try {
    // Try to simulate a direct transfer from seller to buyer to see if it's allowed
    console.log('🔄 Testing direct transfer from seller to buyer...');
    
    // Get the seller address from the listing
    const listing = await publicClient.readContract({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "listings1155",
      args: [collection, BigInt(id)],
    });
    const [seller] = listing as [string, bigint];
    
    // Try to simulate a direct safeTransferFrom call
    try {
      await publicClient.simulateContract({
        account: seller as `0x${string}`,
        address: collection as `0x${string}`,
        abi: CONTRACTS.nft1155Abi,
        functionName: "safeTransferFrom",
        args: [
          seller as `0x${string}`,
          address,
          BigInt(id),
          1n,
          "0x" // empty data
        ],
      });
      console.log('✅ Direct transfer simulation successful');
    } catch (transferErr: any) {
      console.log('❌ Direct transfer simulation failed:', transferErr);
      console.log('🔍 Transfer error details:', {
        message: transferErr?.message,
        shortMessage: transferErr?.shortMessage,
        data: transferErr?.data
      });
    }
  } catch (err) {
    console.log('❌ Failed to test direct transfer:', err);
  }
  
  // Preflight checks before simulation
  try {
    console.log('🔍 Running preflight checks...');
    
    // 0) Get the seller from the listing
    const [seller, unitPrice] = await publicClient.readContract({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "listings1155",
      args: [collection, BigInt(id)],
    }) as readonly [`0x${string}`, bigint];
    
    // For ERC1155, we assume remaining is always 1 (single item listing)
    const remaining = 1n;
    console.log('📋 Listing details:', { seller, unitPrice, remaining });
    
    // 1) Check if seller has approved the marketplace
    const approved = await publicClient.readContract({
      address: collection as `0x${string}`,
      abi: CONTRACTS.nft1155Abi,
      functionName: "isApprovedForAll",
      args: [seller, CONTRACTS.marketplace as `0x${string}`],
    }) as boolean;
    
    console.log('🔐 Marketplace approval status:', approved);
    
    if (!approved) {
      toast.error('Seller revoked marketplace approval. Ask the seller to re-approve the marketplace.');
      return;
    }
    
    // 2) Check if seller still has the token
    const sellerBalance = await publicClient.readContract({
      address: collection as `0x${string}`,
      abi: CONTRACTS.nft1155Abi,
      functionName: "balanceOf",
      args: [seller, BigInt(id)],
    }) as bigint;
    
    console.log('💰 Seller balance:', sellerBalance);
    
    if (sellerBalance < 1n) {
      toast.error('Seller no longer holds this token.');
      return;
    }
    
    // 3) Check if there's enough remaining
    if (remaining < 1n) {
      toast.error('This item is no longer available for sale.');
      return;
    }
    
    // 4) Check if price matches
    if (unitPrice !== price) {
      toast.error(`Price mismatch: expected ${unitPrice}, got ${price}`);
      return;
    }
    
    console.log('✅ All preflight checks passed');
    
    // 5) Check if the token has operator filters that might block the marketplace
    try {
      console.log('🔍 Testing operator filter restrictions...');
      
      await publicClient.simulateContract({
        account: CONTRACTS.marketplace as `0x${string}`,
        address: collection as `0x${string}`,
        abi: CONTRACTS.nft1155Abi,
        functionName: 'safeTransferFrom',
        args: [seller, address!, BigInt(id), 1n, '0x'],
      });
      console.log('✅ Operator filter check passed');
      
    } catch (operatorErr: any) {
      console.log('❌ Operator filter check failed:', operatorErr);
      toast.error('This token has transfer restrictions that block the marketplace. The seller needs to use a different listing method.');
      return;
    }
    
  } catch (preflightErr) {
    console.log('❌ Preflight checks failed:', preflightErr);
    toast.error('Failed to verify listing details');
    return;
  }
  
    // Assume ERC1155 for now - could be enhanced to detect token type
    await publicClient.simulateContract({
      account:      address,
      address:      CONTRACTS.marketplace,
      abi:          CONTRACTS.marketplaceAbi,
      functionName: 'buy1155',
      args:         [collection, BigInt(id), 1n], // amount = 1 for ERC1155
      value:        price,
    });
  console.log('✅ Simulation successful');
  } catch (err: any) {
    console.log('❌ Simulation failed:', err);
    let reason = 'Transaction failed';
    
    try {
      if (err?.data?.data) {
        const decoded = decodeErrorResult({
          abi: CONTRACTS.marketplaceAbi,
          data: err.data.data as `0x${string}`,
        });
        reason = decoded.errorName;
      } else {
        reason = err?.shortMessage || err?.message || 'Transaction failed';
      }
    } catch (decodeErr) {
      reason = err?.shortMessage || err?.message || 'Transaction failed';
    }
    
    toast.error(`Cannot buy: ${reason}`);
    return;
  }

  /* 4️⃣ balance / gas sanity check */
  const gasLimit = await publicClient.estimateGas({
    account: address,
    to:      CONTRACTS.marketplace,
    data:    encodeFunctionData({
               abi: CONTRACTS.marketplaceAbi,
               functionName: 'buy1155',
               args: [collection, BigInt(id), 1n], // amount = 1 for ERC1155
             }),
    value:   price,
  });
  const gasPrice = await publicClient.getGasPrice();
  const needed   = price + gasLimit * gasPrice;
  const balance  = balanceData?.value ?? 0n;

  if (balance < needed) {
    toast.error(
      `Need ${formatEther(needed)} ETH, you have ${formatEther(balance)}`,
    );
    return;
  }

  /* 5️⃣ send the tx */
  toast.loading('Buying NFT…');
  try {
    console.log('🔍 Sending buy1155 transaction with params:', {
      collection,
      id,
      amount: 1n,
      value: price,
      marketplace: CONTRACTS.marketplace
    });
    
    const hash = await writeContractAsync({
      address:      CONTRACTS.marketplace,
      abi:          CONTRACTS.marketplaceAbi,
      functionName: 'buy1155',
      args:         [collection, BigInt(id), 1n], // amount = 1 for ERC1155
      value:        price,
    });

    console.log('✅ Transaction submitted:', hash);

    /* optimistic UI update */
    setListedNFTs(prev =>
      prev.filter(itm => itm.collection !== collection || itm.id !== id),
    );

    await publicClient.waitForTransactionReceipt({ hash });
    await fetchListings();                   // re-sync
    toast.dismiss();
    toast.success('NFT purchased!');
    router.refresh();                        // refresh dashboard data
  } catch (err: any) {
    console.error('❌ Buy transaction failed:', err);
    toast.dismiss();
    
    // Try to decode the error for better user feedback
    let errorMessage = 'Buy failed';
    try {
      if (err?.data?.data) {
        const decoded = decodeErrorResult({
          abi: CONTRACTS.marketplaceAbi,
          data: err.data.data as `0x${string}`,
        });
        errorMessage = `Transaction failed: ${decoded.errorName}`;
        console.log('🔍 Decoded error:', decoded);
      } else {
        errorMessage = err?.shortMessage || err?.message || 'Buy failed';
      }
    } catch (decodeErr) {
      console.log('❌ Failed to decode error:', decodeErr);
      errorMessage = err?.shortMessage || err?.message || 'Buy failed';
    }
    
    toast.error(errorMessage);
  }
}
/* ─────────────────────────────────────────────────────────── */


  async function cancelListing(collection: `0x${string}`, id: number) {
    if (!address) {
      toast.error("Connect wallet first")
      return
    }

    toast.loading("Canceling listing...")
    try {
      const hash = await writeContractAsync({
        address: CONTRACTS.marketplace,
        abi: CONTRACTS.marketplaceAbi,
        functionName: "cancelListing1155", // Using ERC1155 function
        args: [collection, BigInt(id)],
      })

      await publicClient.waitForTransactionReceipt({ hash })
      setListedNFTs((prev) => prev.filter((itm) => itm.collection !== collection || itm.id !== id))
      toast.dismiss()
      toast.success("Listing cancelled")
      router.refresh();                        // refresh dashboard data
    } catch (err: any) {
      toast.dismiss()
      toast.error(err?.shortMessage || "Cancel failed")
    }
  }

if (loading || !showContent) return <FullPageLoader message="Loading…" />

  /* ─── UI ─── */
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
        <div
          className="absolute w-64 h-64 bg-pink-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute w-80 h-80 bg-blue-500/20 rounded-full blur-3xl top-3/4 left-1/2 animate-pulse"
          style={{ animationDelay: "4s" }}
        />

        {/* Floating particles */}
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-20">
           {/* NFTs Grid */}
        
        {listedNFTs.length === 0 ? (
          <div className="text-center max-w-2xl mx-auto">
            <div className="relative mb-8">
              <div className="w-32 h-32 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/20 rounded-3xl flex items-center justify-center mx-auto">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center">
                  <ShoppingCart className="w-8 h-8 text-white" />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-white mb-4">No NFTs Listed</h2>
            <p className="text-xl text-gray-300 mb-8">Be the first to list your NFT on the marketplace</p>

            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-full px-6 py-3">
              <TrendingUp className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-medium text-yellow-300">Check back soon</span>
            </div>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
            {listedNFTs.map((item, idx) => {
              const cardId = `${item.collection}-${item.id}-${idx}`
              const isOwner = item.seller.toLowerCase() === address?.toLowerCase()
              const isHovered = hoveredCard === cardId

              return (
                <div
                  key={cardId}
                  className="group relative"
                  onMouseEnter={() => setHoveredCard(cardId)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{ animationDelay: `${idx * 0.1}s` }}
                >
                  {/* Neon Glow Effect - Multiple Layers */}
                  <div className="absolute -inset-1 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-3xl blur-lg opacity-0 group-hover:opacity-75 transition-all duration-500 animate-pulse" />
                  <div
                    className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-3xl blur-md opacity-0 group-hover:opacity-50 transition-all duration-500"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="absolute -inset-0.5 bg-gradient-to-r from-pink-500 via-blue-500 to-purple-500 rounded-3xl blur-sm opacity-0 group-hover:opacity-30 transition-all duration-500"
                    style={{ animationDelay: "0.2s" }}
                  />

                  {/* Main Card */}
                  <div className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 rounded-3xl hover:border-white/40 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-purple-500/20">
                    {/* Inner glow effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />

                    {/* NFT Image */}
                    <div className="relative overflow-hidden rounded-t-3xl">
                      <div className="relative pb-[100%]">
                        {item.metadata?.image ? (
                          <img
                            src={
                              ipfsToHttp(item.metadata.image) ||
                              `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(
                                `NFT ${item.metadata?.name || "digital art"}`,
                              )}`
                            }
                            alt={item.metadata?.name || `NFT #${item.id}`}
                            className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement
                              target.src = `/placeholder.svg?height=400&width=400&query=${encodeURIComponent(
                                `NFT ${item.metadata?.name || "digital art"}`,
                              )}`
                            }}
                          />
                        ) : (
                          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
                            <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                              <Sparkles className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        )}

                        {/* Gradient overlays */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                        {/* Top badges */}
                        <div className="absolute top-3 left-3 flex items-center space-x-2">
                          <Badge className="bg-black/50 backdrop-blur-xl border border-white/20 text-white text-xs px-2 py-1">
                            #{item.id}
                          </Badge>
                          {isOwner && (
                            <Badge className="bg-gradient-to-r from-yellow-500 to-orange-500 text-black font-bold text-xs px-2 py-1 flex items-center space-x-1">
                              <Crown className="w-3 h-3" />
                              <span>YOURS</span>
                            </Badge>
                          )}
                        </div>

                        {/* Floating action buttons */}
                        <div className="absolute top-3 right-3 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-y-2 group-hover:translate-y-0">
                          <div className="bg-black/50 backdrop-blur-xl border border-white/20 rounded-full p-2 hover:bg-black/70 transition-colors cursor-pointer hover:border-pink-500/50">
                            <Heart className="w-4 h-4 text-white hover:text-pink-400 transition-colors" />
                          </div>
                          <div
                            className="bg-black/50 backdrop-blur-xl border border-white/20 rounded-full p-2 hover:bg-black/70 transition-colors cursor-pointer hover:border-purple-500/50"
                            style={{ transitionDelay: "0.1s" }}
                          >
                            <Eye className="w-4 h-4 text-white hover:text-purple-400 transition-colors" />
                          </div>
                        </div>

                        {/* Sparkle effects */}
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                          <Sparkles className="absolute top-1/4 left-1/4 w-3 h-3 text-purple-400 animate-pulse" />
                          <Sparkles
                            className="absolute top-3/4 right-1/4 w-2 h-2 text-pink-400 animate-pulse"
                            style={{ animationDelay: "0.5s" }}
                          />
                          <Sparkles
                            className="absolute top-1/2 right-1/3 w-2 h-2 text-blue-400 animate-pulse"
                            style={{ animationDelay: "1s" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="relative z-10 p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
                            {item.metadata?.name || `NFT #${item.id}`}
                          </h3>
                          <div className="flex items-center space-x-2 mb-3">
                            <p className="text-sm text-gray-400">Token #{item.id}</p>
                            <div className="w-1 h-1 bg-gray-600 rounded-full" />
                            <div className="flex items-center space-x-1">
                              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                              <span className="text-xs text-green-400 font-medium">Listed</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Price */}
                      <div className="mb-4 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-white/10 rounded-2xl group-hover:border-purple-500/30 transition-colors duration-300">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Price</span>
                          <div className="flex items-center space-x-2">
                            <Zap className="w-4 h-4 text-yellow-400" />
                            <span className="text-lg font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                              {formatEther(item.price)} ETH
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Action Button */}
                      {isOwner ? (
                        <Button
                          onClick={() => cancelListing(item.collection, item.id)}
                          className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 rounded-full transition-all duration-300 hover:scale-105 group/btn border border-red-500/50 hover:border-red-400/70"
                        >
                          <X className="w-4 h-4 mr-2" />
                          Cancel Listing
                          <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity ml-2">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        </Button>
                      ) : (
                        <Button
                          onClick={() => buyNFT(item.collection, item.id, item.price)}
                          className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:from-purple-700 hover:via-pink-700 hover:to-blue-700 text-white font-semibold py-3 rounded-full transition-all duration-300 hover:scale-105 group/btn border border-purple-500/50 hover:border-purple-400/70"
                        >
                          <ShoppingCart className="w-4 h-4 mr-2" />
                          Buy Now
                          <div className="w-4 h-4 bg-white/20 rounded-full flex items-center justify-center opacity-0 group-hover/btn:opacity-100 transition-opacity ml-2">
                            <div className="w-2 h-2 bg-white rounded-full" />
                          </div>
                        </Button>
                      )}

                      {/* Stats */}
                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
                                         <div className="text-xs text-gray-500 font-mono">
                          {item.collection.slice(0, 6)}...{item.collection.slice(-4)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  )
}
