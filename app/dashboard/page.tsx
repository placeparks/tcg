
"use client";

import { useEffect, useState, useMemo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useAccount,
  useReadContract,
  useReadContracts,
  usePublicClient,
} from "wagmi";

import FullPageLoader from "@/components/FullPageLoader";
import AlchemyNFTCard from "@/components/AlchemyNFTCard";
import { CONTRACTS }  from "@/lib/contract";
import { getNFTsForOwner, AlchemyNFT } from "@/lib/alchemy";

/* ─── constants ─── */
const CHAIN_ID = 84532; // Base-Sepolia

/* flat, uniform shape we’ll use everywhere */
type FlatNFT = { contractAddress: string; tokenId: string };

export default function Dashboard() {
  console.log('🔍 Dashboard component rendering');
  
  /* wallets */
  const { ready, authenticated, user } = usePrivy();
  const { address } = useAccount();

  // Debug Privy state
  console.log('🔍 Privy state:', {
    ready,
    authenticated,
    user: user?.id,
    address
  });

  /* state */
  const [busy,  setBusy]  = useState(false); // Start as false, will be set to true when needed
  const [owned, setOwned] = useState<
    { collection: `0x${string}`; name: string; ids: bigint[] }[]
  >([]);
  const [alchemyNfts, setAlchemyNfts] = useState<AlchemyNFT[]>([]);
  const [allCollections, setAllCollections] = useState<string[]>([]);

  // Fetch from both factory types
  const { data: singleNftTotal, isPending: singleNftLoading, error: singleNftError } = useReadContract({
    address:      CONTRACTS.singleFactory as `0x${string}`,
    abi:          CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query:        { enabled: !!address },
  });

  const { data: erc1155Total, isPending: erc1155Loading, error: erc1155Error } = useReadContract({
    address:      CONTRACTS.factoryERC1155 as `0x${string}`,
    abi:          CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query:        { enabled: !!address },
  });

  const publicClient = usePublicClient({ chainId: 84532 });

  // Fetch all collections when totals are available
  useEffect(() => {
    if (!publicClient || (!singleNftTotal && !erc1155Total)) return;
    
    const fetchAllCollections = async () => {
      const collections: string[] = [];
      
      // Fetch single NFT collections
      if (singleNftTotal && CONTRACTS.singleFactory) {
        const count = Number(singleNftTotal as bigint);
        console.log(`🔍 Fetching ${count} single NFT collections...`);
        
        for (let i = 0; i < count; i++) {
          try {
            const address = await publicClient.readContract({
              address: CONTRACTS.singleFactory as `0x${string}`,
              abi: CONTRACTS.singleFactoryAbi,
              functionName: 'allCollections',
              args: [BigInt(i)],
            });
            collections.push(address as string);
          } catch (error) {
            console.error(`Error fetching single NFT collection at index ${i}:`, error);
          }
        }
      }
      
      // Fetch ERC1155 collections
      if (erc1155Total && CONTRACTS.factoryERC1155) {
        const count = Number(erc1155Total as bigint);
        console.log(`🔍 Fetching ${count} ERC1155 collections...`);
        
        for (let i = 0; i < count; i++) {
          try {
            const address = await publicClient.readContract({
              address: CONTRACTS.factoryERC1155 as `0x${string}`,
              abi: CONTRACTS.factoryERC1155Abi,
              functionName: 'allCollections',
              args: [BigInt(i)],
            });
            collections.push(address as string);
          } catch (error) {
            console.error(`Error fetching ERC1155 collection at index ${i}:`, error);
          }
        }
      }
      
      console.log('🔍 All collections fetched:', collections);
      setAllCollections(collections);
    };
    
    fetchAllCollections();
  }, [singleNftTotal, erc1155Total, publicClient]);

  // Debug contract loading states
  console.log('🔍 Contract loading states:', {
    singleNftLoading,
    erc1155Loading,
    singleNftError,
    erc1155Error,
    singleNftTotal,
    erc1155Total,
    allCollectionsLength: allCollections.length,
    address,
    singleFactory: CONTRACTS.singleFactory,
    erc1155Factory: CONTRACTS.factoryERC1155
  });

  // Debug environment variables
  console.log('🔍 Environment check:', {
    hasAlchemyKey: !!process.env.NEXT_PUBLIC_ALCHEMY_KEY,
    alchemyKeyLength: process.env.NEXT_PUBLIC_ALCHEMY_KEY?.length || 0,
    nodeEnv: process.env.NODE_ENV
  });

  // Debug factory contract addresses
  console.log('🔍 Factory contract addresses:', {
    singleFactory: CONTRACTS.singleFactory,
    erc1155Factory: CONTRACTS.factoryERC1155,
    singleFactoryEnv: process.env.NEXT_PUBLIC_SINGLE_NFT_FACTORY_ADDRESS,
    erc1155FactoryEnv: process.env.NEXT_PUBLIC_FACTORY_ADDRESS_ERC1155
  });

  // Use the fetched collections
  const collections = allCollections;


  /* We'll use Alchemy data for collection names instead of contract calls */


  /* -------- Alchemy → on-chain loader -------- */
  useEffect(() => {
    console.log('🔍 Dashboard useEffect triggered:', {
      ready,
      address,
      collectionsLength: collections.length,
      collections
    });

    if (!ready) {
      console.log('🔍 Dashboard: Privy not ready, skipping NFT load');
      return;
    }

    if (!address) {
      console.log('🔍 Dashboard: No address, skipping NFT load');
      return;
    }

    const load = async () => {
      if (collections.length === 0) {
        console.log('🔍 No collections available, skipping NFT load');
        setBusy(false);
        return;
      }
      
      setBusy(true);
      console.log('🔍 Starting NFT load for address:', address);
      console.log('🔍 Collections to filter:', collections);

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        console.warn('⚠️ NFT loading timeout - stopping load');
        setBusy(false);
      }, 15000); // 15 second timeout

      try {
        // Use Alchemy API to get NFTs ONLY from our factory contracts
        console.log('🔍 Filtering NFTs to factory contracts only:', collections);
        const alchemyNfts = await getNFTsForOwner(address, collections);
        console.log('🔍 Alchemy NFTs received (filtered):', alchemyNfts.length);
        console.log('🔍 Sample NFT data:', alchemyNfts[0]);
        
        if (alchemyNfts.length === 0) {
          console.log('🔍 No NFTs found from Alchemy for factory contracts');
          setOwned([]);
          setAlchemyNfts([]);
          clearTimeout(timeoutId);
          return;
        }

        // Double-check: filter out any NFTs not from our factory contracts
        const factoryContractAddresses = collections.map(addr => addr.toLowerCase());
        const filteredNfts = alchemyNfts.filter(nft => 
          factoryContractAddresses.includes(nft.contract.address.toLowerCase())
        );
        
        console.log('🔍 NFTs before filtering:', alchemyNfts.length);
        console.log('🔍 NFTs after factory contract filtering:', filteredNfts.length);
        
        if (filteredNfts.length === 0) {
          console.log('🔍 No NFTs found from factory contracts after filtering');
          setOwned([]);
          setAlchemyNfts([]);
          clearTimeout(timeoutId);
          return;
        }
        
        // For ERC1155, we need to create multiple entries based on balance
        const expandedNfts: AlchemyNFT[] = [];
        
        filteredNfts.forEach(nft => {
          if (nft.tokenType === 'ERC1155') {
            // For ERC1155, create multiple entries based on balance
            const nftData = nft as any;
            const balance = parseInt(nftData.balance || '1');
            
            console.log(`🔍 Processing ERC1155 NFT:`, {
              originalTokenId: nft.tokenId,
              balance: balance,
              contract: nft.contract.address
            });
            
            for (let i = 0; i < balance; i++) {
              // Try multiple sources for NFT name
              const nftName = nft.name || 
                            nft.raw?.metadata?.name || 
                            nft.contract.name || 
                            `NFT #${nft.tokenId}`;
              
              expandedNfts.push({
                ...nft,
                tokenId: nft.tokenId, // Use the actual token ID from the contract
                name: nftName,
                // Add unique identifier to prevent key duplication
                uniqueId: `${nft.contract.address}-${nft.tokenId}-${i}`,
              });
            }
          } else {
            // For non-ERC1155 NFTs, also try to improve name extraction
            const nftName = nft.name || 
                          nft.raw?.metadata?.name || 
                          nft.contract.name || 
                          `NFT #${nft.tokenId}`;
            
            expandedNfts.push({
              ...nft,
              name: nftName,
            });
          }
        });
        
        console.log('🔍 Expanded NFTs:', expandedNfts.length);
        console.log('🔍 Sample expanded NFT:', expandedNfts[0]);
        
        // Debug each NFT's token ID to ensure they're correct
        expandedNfts.forEach((nft, index) => {
          console.log(`🔍 Dashboard NFT ${index}:`, {
            contract: nft.contract.address,
            tokenId: nft.tokenId,
            name: nft.name,
            tokenType: nft.tokenType,
            rawMetadata: nft.raw?.metadata,
            contractName: nft.contract.name,
            allNameSources: {
              nftName: nft.name,
              metadataName: nft.raw?.metadata?.name,
              contractName: nft.contract.name,
              finalName: nft.name
            }
          });
        });
        
        setAlchemyNfts(expandedNfts);
        
        // Group by collection for the existing UI
        const map: Record<string, bigint[]> = {};
        expandedNfts.forEach(nft => {
          const coll = nft.contract.address.toLowerCase();
          (map[coll] ??= []).push(BigInt(nft.tokenId));
        });

        // Fetch collection metadata synchronously
        const metadata: Record<string, { name: string; symbol: string }> = {};
        const uniqueCollections = [...new Set(Object.keys(map))];
        
        if (publicClient) {
          for (const coll of uniqueCollections) {
            try {
              const [name, symbol] = await Promise.all([
                publicClient.readContract({
                  address: coll as `0x${string}`,
                  abi: CONTRACTS.nft1155Abi,
                  functionName: "name",
                }),
                publicClient.readContract({
                  address: coll as `0x${string}`,
                  abi: CONTRACTS.nft1155Abi,
                  functionName: "symbol",
                }),
              ]);
              
              metadata[coll.toLowerCase()] = {
                name: name as string,
                symbol: symbol as string,
              };
            } catch (error) {
              console.error(`Error fetching metadata for ${coll}:`, error);
              metadata[coll.toLowerCase()] = {
                name: `Collection ${coll.slice(2, 6)}`,
                symbol: "NFT",
              };
            }
          }
        }

        const output = Object.entries(map).map(([coll, ids]) => {
          // Get collection name from fetched metadata
          const metadataForColl = metadata[coll.toLowerCase()];
          const collectionName = metadataForColl?.name || `Collection ${coll.slice(2, 6)}`;

          console.log(`🔍 Collection ${coll} name:`, {
            metadata: metadataForColl,
            finalName: collectionName
          });

          return { collection: coll as `0x${string}`, name: collectionName, ids };
        });

        console.log('🔍 Final owned collections:', output);
        setOwned(output);
        clearTimeout(timeoutId);
      } catch (error) {
        console.error('❌ Failed to fetch NFTs from Alchemy:', error);
        
        // Fallback: try to get NFTs without Alchemy (direct contract calls)
        console.log('🔄 Trying fallback method without Alchemy...');
        try {
          // This is a simplified fallback - you might want to implement
          // direct contract calls here if Alchemy fails
          setOwned([]);
          setAlchemyNfts([]);
        } catch (fallbackError) {
          console.error('❌ Fallback also failed:', fallbackError);
          setOwned([]);
          setAlchemyNfts([]);
        }
        clearTimeout(timeoutId);
      } finally {
        setBusy(false);
      }
    };

    load().catch((error) => {
      console.error('❌ Unexpected error in load function:', error);
      setBusy(false);
    });
  }, [ready, address, collections]);

  /* ---------- UI states ---------- */
  // Debug loading states
  console.log('🔍 Dashboard loading states:', {
    ready,
    singleNftLoading,
    erc1155Loading,
    busy,
    address,
    collectionsLength: collections.length
  });

  if (!ready) {
    console.log('🔍 Dashboard: Privy not ready');
    return <FullPageLoader message="Connecting wallet…" />;
  }

  if (singleNftError || erc1155Error) {
    console.log('🔍 Dashboard: Contract errors', { singleNftError, erc1155Error });
    return (
      <div className="px-6 md:px-10 py-8">
        <h1 className="text-3xl font-playfair font-bold text-zinc-400 mb-4">
          Error Loading Collections
        </h1>
        <p className="text-red-400">
          {singleNftError?.message || erc1155Error?.message || 'Failed to load collections'}
        </p>
      </div>
    );
  }

  if (singleNftLoading) {
    console.log('🔍 Dashboard: Single NFT collections loading');
    return <FullPageLoader message="Loading single NFT collections…" />;
  }

  if (erc1155Loading) {
    console.log('🔍 Dashboard: ERC1155 collections loading');
    return <FullPageLoader message="Loading ERC1155 collections…" />;
  }

  if (busy) {
    console.log('🔍 Dashboard: NFT data loading');
    return <FullPageLoader message="Loading NFTs…" />;
  }

  if (!address)
    return (
      <p className="text-center mt-12 text-zinc-400">
        🔗 Connect your wallet to view NFTs.
      </p>
    );

  if (collections.length === 0 && !singleNftLoading && !erc1155Loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-playfair font-bold text-zinc-400 mb-4">
            No Collections Found
          </h1>
          <p className="text-zinc-400">
            No collections are available from the factory contracts. Please check your contract configuration.
          </p>
        </div>
      </div>
    );

  if (owned.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-2xl text-zinc-400">
            😢 No Cardify NFTs owned yet.
          </p>
        </div>
      </div>
    );

  /* ---------- main render ---------- */
    return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/30 via-black to-pink-900/30" />
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl top-1/4 left-1/4 animate-pulse" />
        <div className="absolute w-64 h-64 bg-pink-500/20 rounded-full blur-3xl bottom-1/4 right-1/4 animate-pulse" style={{ animationDelay: "2s" }} />
        <div className="absolute w-80 h-80 bg-blue-500/20 rounded-full blur-3xl top-3/4 left-1/2 animate-pulse" style={{ animationDelay: "4s" }} />
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* Hero Section */}
        <div className="text-center mb-20">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/20 rounded-full px-6 py-2 mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-300">
              TCG Meta Marketplace
            </span>
          </div>

          <h1 className="text-6xl md:text-8xl font-black mb-8 leading-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Explore
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
              AI-Generated
            </span>
            <br />
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Trading Cards
            </span>
      </h1>

          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12 leading-relaxed">
            Dive into a marketplace where design meets rarity and every card is a collectible masterpiece.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-purple-500/25">
              Start Collecting
            </button>
            <button className="border border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-full font-semibold text-lg transition-all duration-300 hover:bg-white/10 backdrop-blur-sm">
              View Collections
            </button>
          </div>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <div className="text-4xl font-bold text-white mb-2">10K+</div>
            <div className="text-gray-400">Cards Available</div>
          </div>
          <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <div className="text-4xl font-bold text-white mb-2">500+</div>
            <div className="text-gray-400">Active Collectors</div>
            </div>
          <div className="text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:bg-white/10 transition-all duration-300">
            <div className="text-4xl font-bold text-white mb-2">50+</div>
            <div className="text-gray-400">Collections</div>
          </div>
          </div>

        {/* Featured NFTs Section */}
        {alchemyNfts.length > 0 && (
          <div className="mb-20">
            <div className="flex items-center space-x-3 mb-12">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <div className="w-4 h-4 bg-white rounded-sm" />
              </div>
              <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Your Collection
              </h2>
            </div>
            
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {alchemyNfts.slice(0, 8).map((nft, index) => (
                <div
                  key={nft.uniqueId || `${nft.contract.address}-${nft.tokenId}-${index}`}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <AlchemyNFTCard nft={nft} />
                </div>
              ))}
            </div>
            
            {alchemyNfts.length > 8 && (
              <div className="text-center mt-8">
                <button className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 text-purple-300 px-6 py-3 rounded-full font-medium transition-all duration-300">
                  View All {alchemyNfts.length} Cards
                </button>
              </div>
            )}
          </div>
        )}

        {/* CTA Section */}
        <div className="text-center bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-white/10 rounded-3xl p-12">
          <h3 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Collection?
          </h3>
          <p className="text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of collectors in the ultimate TCG meta marketplace. Create, trade, and discover rare AI-generated cards.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:scale-105">
              Create Collection
            </button>
            <button className="border border-white/30 hover:border-white/60 text-white px-8 py-4 rounded-full font-semibold transition-all duration-300 hover:bg-white/10">
              Browse Marketplace
            </button>
          </div>
        </div>
      </div>

      {/* Animation Styles */}
      <style jsx>{`
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(30px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          animation: fade-in-up 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
}
