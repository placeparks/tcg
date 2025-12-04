/* --------------------------------------------------------------------
 *  app/collection/page.tsx
 * ------------------------------------------------------------------ */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams }          from "next/navigation";
import {
  useReadContract,
  usePublicClient,
  useReadContracts,
}                                   from "wagmi";
import { usePrivy }                 from "@privy-io/react-auth";
import { Sparkles, Activity, Layers, Box, Database, Server, Globe, Zap } from "lucide-react";

import FullPageLoader               from "@/components/FullPageLoader";
import useEnsureBaseSepolia         from "@/hooks/useEnsureNetwork";
import CollectionCard               from "@/components/CollectionCard";
import { Badge }                    from "@/components/ui/badge";
import { CONTRACTS }                from "@/lib/contract";

/* ------------------------------------------------------------------ */

export const dynamic = "force-dynamic";      // ⬅ disable SSG / SSG export

/* Very tiny ERC-721 ABI just for name() */
const nameAbi = [
  {
    constant: true,
    inputs: [],
    name: "name",
    outputs: [{ type: "string" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/* -------------------- Stateless fall-back UI bits ----------------- */
const Empty = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen flex items-center justify-center text-white">
    <div className="text-center">
      {children}
    </div>
  </div>
);

/* ------------------------------------------------------------------ */
/*              <Inner /> does all the data fetching                   */
/*   …and it now lives inside a <Suspense> boundary.                   */
/* ------------------------------------------------------------------ */
function Inner() {
  /* make sure we’re on Base-Sepolia everywhere in the app */
  useEnsureBaseSepolia();

  /* ----- hooks ----- */
  const { ready } = usePrivy();
  const searchParams       = useSearchParams();              // ⬅ OK inside Suspense
  const keyword            = (searchParams.get("search") || "").toLowerCase();
  const typeFilter         = searchParams.get("type") || "";  // Filter by type: 'pack', 'erc1155', 'single'

  // Fetch total collections count from both factories
  const {
    data: erc1155Total,
    isLoading: erc1155Loading,
    error: erc1155Error,
  } = useReadContract({
    address:      CONTRACTS.factoryERC1155 as `0x${string}`,
    abi:          CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query: {
      enabled: !!CONTRACTS.factoryERC1155,
    }
  });

  const {
    data: singleNftTotal,
    isLoading: singleNftLoading,
    error: singleNftError,
  } = useReadContract({
    address:      CONTRACTS.singleFactory as `0x${string}`,
    abi:          CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query: {
      enabled: !!CONTRACTS.singleFactory,
    }
  });


  const publicClient = usePublicClient({ chainId: 84532 })!;

  // State for collections and metadata
  const [allCollections, setAllCollections] = useState<{address: string, type: 'erc1155' | 'single' | 'pack'}[][]>([]);
  const [packDataMap, setPackDataMap] = useState<Record<string, { pack_image_uri?: string }>>({});
  const [physicalNftMetadata, setPhysicalNftMetadata] = useState<Record<string, any>>({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataFetchStarted, setMetadataFetchStarted] = useState(false);
  const [collectionsFetched, setCollectionsFetched] = useState(false);

  // Fetch all collections from both factories and pack collections from database
  useEffect(() => {
    if (!publicClient) return;
    
    const fetchAllCollections = async () => {
      const allCollectionsData: {address: string, type: 'erc1155' | 'single' | 'pack'}[] = [];
      
      // Fetch ERC1155 collections
      if (erc1155Total && CONTRACTS.factoryERC1155) {
        const count = Number(erc1155Total);
        console.log(`🟣 Fetching ${count} ERC1155 collections...`);
        
        for (let i = 0; i < count; i++) {
          try {
            const address = await publicClient.readContract({
              address: CONTRACTS.factoryERC1155 as `0x${string}`,
              abi: CONTRACTS.factoryERC1155Abi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            allCollectionsData.push({address: address as string, type: 'erc1155'});
          } catch (error) {
            console.error(`Error fetching ERC1155 collection at index ${i}:`, error);
          }
        }
      }
      
      // Fetch Single NFT collections
      if (singleNftTotal && CONTRACTS.singleFactory) {
        const count = Number(singleNftTotal);
        console.log(`🟣 Fetching ${count} Single NFT collections...`);
        
        for (let i = 0; i < count; i++) {
          try {
            const address = await publicClient.readContract({
              address: CONTRACTS.singleFactory as `0x${string}`,
              abi: CONTRACTS.singleFactoryAbi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            allCollectionsData.push({address: address as string, type: 'single'});
          } catch (error) {
            console.error(`Error fetching Single NFT collection at index ${i}:`, error);
          }
        }
      }
      
      // Fetch Pack collections from database
      const packData: Record<string, { pack_image_uri?: string }> = {};
      try {
        const response = await fetch('/api/packs/active');
        if (response.ok) {
          const dbPacks = await response.json();
          if (Array.isArray(dbPacks)) {
            console.log(`📦 Fetching ${dbPacks.length} Pack collections...`);
            dbPacks.forEach((dbPack: any) => {
              if (dbPack.collection_address) {
                allCollectionsData.push({address: dbPack.collection_address, type: 'pack'});
                // Store pack_image_uri for this collection
                if (dbPack.pack_image_uri) {
                  packData[dbPack.collection_address.toLowerCase()] = {
                    pack_image_uri: dbPack.pack_image_uri
                  };
                }
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching pack collections:', error);
      }
      
      console.log('🟣 All Collections:', allCollectionsData);
      console.log('🟣 ERC1155 Collections:', allCollectionsData.filter(c => c.type === 'erc1155'));
      console.log('🟣 Single NFT Collections:', allCollectionsData.filter(c => c.type === 'single'));
      console.log('📦 Pack Collections:', allCollectionsData.filter(c => c.type === 'pack'));
      setAllCollections([allCollectionsData]);
      setPackDataMap(packData);
      setCollectionsFetched(true);
    };
    
    fetchAllCollections();
  }, [erc1155Total, singleNftTotal, publicClient]);

  /* flags */
  const loading = !ready || erc1155Loading || singleNftLoading || isLoadingMetadata || !collectionsFetched;
  

  /* process collections data */
  const processedCollections = useMemo(() => {
    if (!allCollections || allCollections.length === 0) return [];
    const flatCollections = allCollections.flat();
    console.log('🟣 Processed Collections:', flatCollections);
    return flatCollections;
  }, [allCollections]);

  useEffect(() => {
    if (!allCollections || !publicClient) return;
    
    const fetchMetadata = async () => {
      setMetadataFetchStarted(true);
      setIsLoadingMetadata(true);
      const metadata: Record<string, any> = {};
      
      // Set a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn('Metadata fetching timeout - using fallback data');
        setIsLoadingMetadata(false);
      }, 10000); // 10 second timeout
      
      const flatCollections = allCollections.flat();
      
      for (const collection of flatCollections) {
        const { address, type } = collection;
        try {
          // Fetch collection details from the individual collection contract
          let name: unknown;
          let symbol: unknown;
          let baseURI: string = "";
          let maxSupply: unknown;
          let mintPrice: unknown;

          if (type === 'erc1155') {
            // ERC1155 exposes baseUri() directly
            const [nm, sym, base, max, price] = await Promise.all([
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: "name",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: "symbol",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: "baseUri",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: "maxSupply",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: "mintPrice",
              }),
            ]);
            name = nm; symbol = sym; baseURI = base as string; maxSupply = max; mintPrice = price;
          } else if (type === 'pack') {
            // Pack collections: use packCollectionAbi
            const [nm, sym, uri5, max, price] = await Promise.all([
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: "name",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: "symbol",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: "uri",
                args: [5n],
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: "maxPacks",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: "packPrice",
              }),
            ]);
            name = nm; symbol = sym; maxSupply = max; mintPrice = price;
            const raw = String(uri5 || "");
            // Remove ERC1155 template tokens and json filename to get a directory-like base
            let base = raw
              .replace(/\{id\}(\.json)?/gi, "")
              .replace(/\/[^\/]*\.json$/i, "/");
            if (base && !base.endsWith("/")) base += "/";
            baseURI = base;
          } else {
            // Single collections: derive base from uri(0)
            const [nm, sym, uri0, max, price] = await Promise.all([
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.singleCollectionAbi,
                functionName: "name",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.singleCollectionAbi,
                functionName: "symbol",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.singleCollectionAbi,
                functionName: "uri",
                args: [0n],
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.singleCollectionAbi,
                functionName: "maxSupply",
              }),
              publicClient.readContract({
                address: address as `0x${string}`,
                abi: CONTRACTS.singleCollectionAbi,
                functionName: "mintPrice",
              }),
            ]);
            name = nm; symbol = sym; maxSupply = max; mintPrice = price;
            const raw = String(uri0 || "");
            // Remove ERC1155 template tokens and json filename to get a directory-like base
            let base = raw
              .replace(/\{id\}(\.json)?/gi, "")
              .replace(/\/[^\/]*\.json$/i, "/");
            if (base && !base.endsWith("/")) base += "/";
            baseURI = base;
          }

          metadata[address] = {
            name: name as string,
            symbol: symbol as string,
            baseURI,
            maxSupply: maxSupply as bigint,
            mintPrice: mintPrice as bigint,
            owner: '', // ERC1155 contracts don't have owner function
            type: type,
          };
        } catch (error) {
          console.error(`Error fetching metadata for ${address}:`, error);
          metadata[address] = {
            name: `Collection ${address.slice(0, 6)}...`,
            symbol: type === 'erc1155' ? 'HYBRID' : type === 'pack' ? 'PACK' : 'SINGLE',
            baseURI: '',
            maxSupply: 0n,
            mintPrice: 0n,
            owner: '',
            type: type,
            error: true,
          };
        }
      }
      
      setPhysicalNftMetadata(metadata);
      setIsLoadingMetadata(false);
      clearTimeout(timeoutId);
      console.log('🟣 Physical+NFT Metadata:', metadata);
      console.log('🟣 Metadata count:', Object.keys(metadata).length);
    };
    
    fetchMetadata();
  }, [allCollections, publicClient]);

  const processedPhysicalNft = useMemo<Array<{
    address: string;
    name: string;
    symbol: string;
    baseURI: string;
    maxSupply: bigint;
    mintPrice: bigint;
    owner: string;
    type: 'erc1155' | 'single' | 'pack';
  }>>(() => {
    if (!allCollections) return [];
    const flatCollections = allCollections.flat();
    const processed = flatCollections.map((collection) => {
      const { address, type } = collection;
      const metadata = physicalNftMetadata[address];
      return {
        address: address,
        name: metadata?.name || `Collection ${address.slice(0, 6)}...`,
        symbol: metadata?.symbol || (type === 'erc1155' ? 'HYBRID' : type === 'pack' ? 'PACK' : 'SINGLE'),
        baseURI: metadata?.baseURI || '',
        maxSupply: metadata?.maxSupply || 0n,
        mintPrice: metadata?.mintPrice || 0n,
        owner: metadata?.owner || '',
        type: type as 'erc1155' | 'single' | 'pack'
      };
    });
    console.log('🟣 Processed Physical+NFT Collections:', processed);
    console.log('🟣 Metadata available for:', Object.keys(physicalNftMetadata).length, 'collections');
    return processed;
  }, [allCollections, physicalNftMetadata]);

  /* filter by keyword and type (memoised) */
  const filteredCollections = useMemo<Array<{
    address: string;
    name: string;
    symbol: string;
    baseURI: string;
    maxSupply: bigint;
    mintPrice: bigint;
    owner: string;
    type: 'erc1155' | 'single' | 'pack';
  }>>(() => {
    let filtered = processedPhysicalNft;
    
    // Filter by type if specified
    if (typeFilter) {
      filtered = filtered.filter((col) => col.type === typeFilter);
    }
    
    // Filter by keyword if specified
    if (keyword) {
      filtered = filtered.filter((col) =>
        col.name?.toLowerCase().includes(keyword)
      );
    }
    
    return filtered;
  }, [keyword, typeFilter, processedPhysicalNft]);


  /* early returns */
  if (loading) return <FullPageLoader message="Loading collections…" />;
  if (!CONTRACTS.factoryERC1155 && !CONTRACTS.singleFactory) 
    return <Empty>Contract addresses not configured. Please set factory environment variables.</Empty>;
  if (erc1155Error || singleNftError) 
    return <Empty>Error loading collections: {erc1155Error?.message || singleNftError?.message}</Empty>;
  if (processedPhysicalNft.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-4">No Collections Yet</h1>
          <p className="text-gray-400">No collections are available from the factory contracts.</p>
        </div>
      </div>
    );
  if (keyword && filteredCollections.length === 0)
    return <Empty>No collections found for "{keyword}".</Empty>;

  /* ---------------- main render ---------------- */
  const getTypeLabel = () => {
    if (typeFilter === 'pack') return 'Pack Series';
    if (typeFilter === 'erc1155') return 'ERC1155 Collections';
    if (typeFilter === 'single') return 'Physical Backed';
    return 'All Collections';
  };

  return (
    <div className="min-h-screen bg-[#030014] relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px]" />
        <div className="absolute top-20 left-[-10%] w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
      </div>

      <div className="container mx-auto px-6 py-20 relative z-10 md:px-24">
        <div className="mb-12">
          <h1 className="font-display font-bold text-4xl md:text-5xl text-white mb-8">
            {getTypeLabel()}
          </h1>
          
          {/* Filter Buttons */}
          <div className="flex flex-wrap items-center gap-3 mb-12">
            <Link
              href="/collection"
              className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold uppercase transition-all border ${
                !typeFilter
                  ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/60 shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              All Collections
            </Link>
            <Link
              href="/collection?type=single"
              className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold uppercase transition-all border flex items-center gap-2 ${
                typeFilter === 'single'
                  ? 'bg-neon-blue/20 text-neon-blue border-neon-blue/60 shadow-[0_0_15px_rgba(0,243,255,0.3)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Physical Backed
            </Link>
            <Link
              href="/collection?type=erc1155"
              className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold uppercase transition-all border flex items-center gap-2 ${
                typeFilter === 'erc1155'
                  ? 'bg-neon-purple/20 text-neon-purple border-neon-purple/60 shadow-[0_0_15px_rgba(176,38,255,0.3)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Hybrid (ERC1155)
            </Link>
            <Link
              href="/collection?type=pack"
              className={`px-5 py-2.5 rounded-xl text-xs font-display font-bold uppercase transition-all border flex items-center gap-2 ${
                typeFilter === 'pack'
                  ? 'bg-neon-pink/20 text-neon-pink border-neon-pink/60 shadow-[0_0_15px_rgba(255,0,255,0.3)]'
                  : 'bg-white/5 text-gray-400 border-white/10 hover:border-white/30 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              Pack Series
            </Link>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid lg:grid-cols-12 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-3 space-y-6">
            <div className="relative bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
              {/* Bracket decoration */}
              <div className="absolute top-0 left-0 w-8 h-full border-l-2 border-t-2 border-b-2 border-white/20 rounded-l-xl" />
              <div className="absolute top-0 right-0 w-8 h-full border-r-2 border-t-2 border-b-2 border-white/20 rounded-r-xl" />
              
              <div className="relative z-10">
                <h3 className="text-white font-display font-bold text-xl mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-neon-blue" />
                  Collection Index
                </h3>
                <p className="text-gray-400 text-sm leading-relaxed font-sans mb-6">
                  Browse through all verified collections on TCGMeta. Each collection is authenticated on the Base network and indexed by the Cardify Oracle for seamless trading.
                </p>
                <div className="flex gap-2 text-xs font-mono text-neon-blue mb-6">
                  <span className="animate-pulse">●</span> {filteredCollections.length} Collection{filteredCollections.length !== 1 ? 's' : ''} Active
                </div>

                {/* Stats */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                        <Globe className="w-3 h-3" />
                        NETWORK STATUS
                      </span>
                      <span className="text-xs text-green-400 font-mono font-bold">ONLINE</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-green-500 w-full shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] text-gray-500 font-mono font-bold uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-3 h-3" />
                        INDEXING
                      </span>
                      <span className="text-xs text-neon-blue font-mono font-bold">100%</span>
                    </div>
                    <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden border border-white/10">
                      <div className="h-full bg-neon-blue w-full shadow-[0_0_10px_rgba(0,243,255,0.5)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Collection Types Info */}
            <div className="relative bg-gradient-to-br from-gray-900/95 to-black/95 backdrop-blur-xl border border-white/10 rounded-xl p-6 overflow-hidden">
              <div className="relative z-10">
                <h3 className="text-white font-display font-bold text-lg mb-4 flex items-center gap-2">
                  <Server className="w-5 h-5 text-neon-purple" />
                  Collection Types
                </h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <Activity className="w-4 h-4 text-neon-blue mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-display font-bold text-white mb-1">Physical Backed</div>
                      <div className="text-[10px] text-gray-400 font-sans">Graded slabs with physical redemption</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <Layers className="w-4 h-4 text-neon-purple mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-display font-bold text-white mb-1">Hybrid (ERC1155)</div>
                      <div className="text-[10px] text-gray-400 font-sans">Digital collections with multiple editions</div>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <Box className="w-4 h-4 text-neon-pink mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-xs font-display font-bold text-white mb-1">Pack Series</div>
                      <div className="text-[10px] text-gray-400 font-sans">Mystery packs with 5 randomized NFTs</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Collections Grid */}
          <div className="lg:col-span-9">
            {filteredCollections.length > 0 ? (
              <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {filteredCollections.map((col, i) => {
              // For pack collections, use pack_image_uri from database if available
              const packData = packDataMap[col.address.toLowerCase()];
              const preview = col.type === 'pack' && packData?.pack_image_uri 
                ? packData.pack_image_uri 
                : CONTRACTS.collectionPreview(col.address);
              
              return (
                <div key={col.address} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                  <CollectionCard
                    address={col.address}
                    preview={preview}
                    type={col.type as 'erc1155' | 'single' | 'pack'}
                  />
                </div>
              );
            })}
              </div>
            ) : (
          <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
            <div className="relative z-10 text-center">
              <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <Box className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-2xl font-display font-bold text-white mb-2">No Collections Found</h3>
              <p className="text-gray-400 font-mono text-sm max-w-md mx-auto">
                {typeFilter 
                  ? `No ${typeFilter === 'erc1155' ? 'Hybrid' : typeFilter === 'pack' ? 'Pack' : 'Physical Backed'} collections available.`
                  : 'No collections are available at this time.'
                }
              </p>
            </div>
          </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Wrapper – satisfies “wrap useSearchParams in a Suspense boundary”  */
/* ------------------------------------------------------------------ */
export default function CollectionPage() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading collections…" />}>
      <Inner />
    </Suspense>
  );
}
