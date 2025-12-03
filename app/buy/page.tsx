"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { metaCache } from "@/lib/net-utils";
import { wagmi } from "../providers";
import { useMarketplaceListings } from "@/hooks/useMarketplaceListings";


/* ─── constants ─── */
const CHAIN_ID = 84532

const ipfsToHttp = (u: string) => u.replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/")
const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"

type Listing1155Tuple = readonly [`0x${string}`, bigint] // [seller, unitPrice]

type ListedItem = {
  collection: string;
  id: number;
  seller: `0x${string}`;
  price: bigint;
  metadata: { name?: string; image?: string; [k: string]: any };
};

// wait until the wallet really switched
const waitForChain = (target: number, timeoutMs = 15000) =>
  new Promise<void>((resolve, reject) => {
    let done = false;

    const unwatch = watchAccount(wagmi, {
      onChange(acct) {
        if (done) return;
        if (!acct.isConnected) {
          done = true;
          clearTimeout(timer);
          unwatch();
          reject(new Error("disconnected"));
          return;
        }
        if (acct.chainId === target) {
          done = true;
          clearTimeout(timer);
          unwatch();
          resolve();
        }
      },
    });

    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      unwatch();
      reject(new Error("chain switch timeout"));
    }, timeoutMs);
  });

export default function BuyPage() {
  useEnsureBaseSepolia(); 
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
  const packCollectionsRef = useRef<Set<string>>(new Set())

  // Fetch all collections by index when total count is available
  useEffect(() => {
    if ((!totalCollectionsERC1155 && !totalCollectionsSingle) || !publicClient) return;
    
    const fetchCollections = async () => {
      const collectionsList: string[] = [];
      const packCollectionSet = new Set<string>();
      
      // Fetch from ERC1155 factory (parallelized)
      if (totalCollectionsERC1155) {
        const count = Number(totalCollectionsERC1155 as bigint);
        console.log('🔍 Fetching ERC1155 collections:', count);
        
        const erc1155Addrs: (`0x${string}` | null)[] = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            publicClient.readContract({
              address: CONTRACTS.factoryERC1155 as `0x${string}`,
              abi: CONTRACTS.factoryERC1155Abi,
              functionName: "allCollections",
              args: [BigInt(i)],
            }).catch(() => null)
          )
        );

        erc1155Addrs
          .filter((addr: `0x${string}` | null): addr is `0x${string}` => !!addr)
          .forEach((addr) => collectionsList.push(addr));
      }
      
      // Fetch from Single factory (parallelized)
      if (totalCollectionsSingle) {
        const count = Number(totalCollectionsSingle as bigint);
        console.log('🔍 Fetching Single factory collections:', count);
        
        const singleAddrs: (`0x${string}` | null)[] = await Promise.all(
          Array.from({ length: count }, (_, i) =>
            publicClient.readContract({
              address: CONTRACTS.singleFactory as `0x${string}`,
              abi: CONTRACTS.singleFactoryAbi,
              functionName: "allCollections",
              args: [BigInt(i)],
            }).catch(() => null)
          )
        );

        singleAddrs
          .filter((addr: `0x${string}` | null): addr is `0x${string}` => !!addr)
          .forEach((addr) => collectionsList.push(addr));
      }
      
      // Fetch Pack collections from database
      try {
        console.log('🔍 Fetching Pack collections from database...');
        const response = await fetch('/api/packs/active');
        if (response.ok) {
          const dbPacks = await response.json();
          if (Array.isArray(dbPacks)) {
            dbPacks.forEach((dbPack: any) => {
              if (dbPack.collection_address) {
                const packAddr = dbPack.collection_address.toLowerCase();
                collectionsList.push(dbPack.collection_address);
                packCollectionSet.add(packAddr);
                console.log('📦 Added pack collection:', dbPack.collection_address);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching pack collections:', error);
      }
      
      // Dedupe collections (same address might appear in multiple sources)
      const unique = Array.from(new Set(collectionsList.map(a => a.toLowerCase())));
      console.log('🏭 Fetched All Collections:', unique);
      console.log('📦 Pack Collections:', Array.from(packCollectionSet));
      setCollections(unique);
      packCollectionsRef.current = packCollectionSet;
    };
    
    fetchCollections();
  }, [totalCollectionsERC1155, totalCollectionsSingle, publicClient]);

  /* listings - use hook */
  const { listings: listedNFTs, loading, firstFetchDone, refetch: refetchListings } = useMarketplaceListings({
    includePacks: true,
    collections: collections.length > 0 ? collections : undefined,
  });



  /* buy flow */
/* ─── BUY FLOW ────────────────────────────────────────────── */
async function buyNFT(
  collection: `0x${string}`,
  id:         number,
  price:      bigint,
) {
  if (!address) {
    toast.error("Connect wallet first");
    return;
  }

  // network
  if (chainId !== CHAIN_ID) {
    try {
      await switchChainAsync({ chainId: CHAIN_ID });
      await waitForChain(CHAIN_ID);
    } catch {
      toast.error("Please switch to Base-Sepolia");
      return;
    }
  }

  // 1) single listing read
  let seller: `0x${string}`;
  let unitPrice: bigint;
  try {
    const listing = await publicClient.readContract({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "listings1155",
      args: [collection, BigInt(id)],
    }) as readonly [`0x${string}`, bigint];

    [seller, unitPrice] = listing;
    if (!seller || seller.toLowerCase() === ZERO_ADDRESS) {
      toast.error("Listing not found");
      return;
    }

    if (unitPrice !== price) {
      toast.error(`Price mismatch: expected ${formatEther(unitPrice)} ETH`);
      return;
    }
  } catch (e) {
    console.log("listing read failed", e);
    toast.error("Failed to read listing");
    return;
  }

  // 2) basic checks
  const [approved, sellerBalance] = await Promise.all([
    publicClient.readContract({
      address: collection,
      abi: CONTRACTS.nft1155Abi,
      functionName: "isApprovedForAll",
      args: [seller, CONTRACTS.marketplace as `0x${string}`],
    }) as Promise<boolean>,
    publicClient.readContract({
      address: collection,
      abi: CONTRACTS.nft1155Abi,
      functionName: "balanceOf",
      args: [seller, BigInt(id)],
    }) as Promise<bigint>,
  ]);

  if (!approved) {
    toast.error("Seller revoked marketplace approval");
    return;
  }

  if (sellerBalance < 1n) {
    toast.error("Seller no longer holds this token");
    return;
  }

  // 3) simulate marketplace buy
  try {
    await publicClient.simulateContract({
      account: address,
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "buy1155",
      args: [collection, BigInt(id), 1n],
      value: price,
    });
  } catch (err: any) {
    let reason = err?.shortMessage || err?.message || "Transaction failed";
    try {
      if (err?.data?.data) {
        const decoded = decodeErrorResult({
          abi: CONTRACTS.marketplaceAbi,
          data: err.data.data as `0x${string}`,
        });
        reason = decoded.errorName;
      }
    } catch {}
    toast.error(`Cannot buy: ${reason}`);
    return;
  }

  // 4) gas + balance sanity
  const gasLimit = BigInt(await publicClient.estimateGas({
    account: address,
    to: CONTRACTS.marketplace,
    data: encodeFunctionData({
      abi: CONTRACTS.marketplaceAbi,
      functionName: "buy1155",
      args: [collection, BigInt(id), 1n],
    }),
    value: price,
  }));
  const gasPrice = BigInt(await publicClient.getGasPrice());
  const needed = price + (gasLimit * gasPrice);
  const balance = balanceData?.value ?? 0n;

  if (balance < needed) {
    toast.error(
      `Need ${formatEther(needed)} ETH, you have ${formatEther(balance)}`
    );
    return;
  }

  // 5) send tx
  toast.loading("Buying NFT…");
  try {
    const hash = await writeContractAsync({
      address: CONTRACTS.marketplace,
      abi: CONTRACTS.marketplaceAbi,
      functionName: "buy1155",
      args: [collection, BigInt(id), 1n],
      value: price,
    });

    // Optimistic UI update - the hook will refetch and update state
    await publicClient.waitForTransactionReceipt({ hash });
    await refetchListings();
    toast.dismiss();
    toast.success("NFT purchased!");
  } catch (err: any) {
    toast.dismiss();
    let msg = err?.shortMessage || err?.message || "Buy failed";
    try {
      if (err?.data?.data) {
        const decoded = decodeErrorResult({
          abi: CONTRACTS.marketplaceAbi,
          data: err.data.data as `0x${string}`,
        });
        msg = `Transaction failed: ${decoded.errorName}`;
      }
    } catch {}
    toast.error(msg);
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
      await refetchListings()
      toast.dismiss()
      toast.success("Listing cancelled")
    } catch (err: any) {
      toast.dismiss()
      toast.error(err?.shortMessage || "Cancel failed")
    }
  }

if (!firstFetchDone || loading) return <FullPageLoader message="Loading…" />

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
              const lowerAddr = address?.toLowerCase()
              const isOwner = lowerAddr && item.seller.toLowerCase() === lowerAddr
              const collectionAddr = item.collection as `0x${string}`

              return (
                <div
                  key={cardId}
                  className="group relative"
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
                          onClick={() => cancelListing(collectionAddr, item.id)}
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
                          onClick={() => buyNFT(collectionAddr, item.id, item.price)}
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
