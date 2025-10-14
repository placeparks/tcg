/* --------------------------------------------------------------------
 *  app/collection/page.tsx
 * ------------------------------------------------------------------ */
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams }          from "next/navigation";
import {
  useReadContract,
  usePublicClient,
  useReadContracts,
}                                   from "wagmi";
import { usePrivy }                 from "@privy-io/react-auth";
import { Sparkles, TrendingUp }     from "lucide-react";

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
    {children}
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

  // Fetch NFT-only collections (single NFT factory)
  const {
    data: nftOnlyCollections,
    isLoading: nftOnlyLoading,
  } = useReadContract({
    address:      CONTRACTS.singleFactory as `0x${string}`, // This is the single NFT factory
    abi:          CONTRACTS.singleFactoryAbi,
    functionName: "getAllCollectionsWithInfo",
  });

  // Fetch Physical + NFT collections (ERC1155 factory)
  const {
    data: physicalNftCollections,
    isLoading: physicalNftLoading,
  } = useReadContract({
    address:      CONTRACTS.factoryERC1155 as `0x${string}`, // This is the ERC1155 factory
    abi:          CONTRACTS.factoryERC1155Abi, // Use the correct ERC1155 factory ABI
    functionName: "getAllCollections", // ERC1155 factory uses getAllCollections, not getAllCollectionsWithInfo
  });

  // Console logs to debug collections
  console.log('🔵 Single NFT Factory Address:', CONTRACTS.singleFactory);
  console.log('🟣 ERC1155 Factory Address:', CONTRACTS.factoryERC1155);
  console.log('🔵 NFT-Only Collections:', nftOnlyCollections);
  console.log('🟣 Physical+NFT Collections:', physicalNftCollections);

  const publicClient = usePublicClient({ chainId: 84532 })!;

  // Fetch collection metadata for ERC1155 collections
  const [physicalNftMetadata, setPhysicalNftMetadata] = useState<Record<string, any>>({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataFetchStarted, setMetadataFetchStarted] = useState(false);

  /* flags */
  const loading = !ready || nftOnlyLoading || physicalNftLoading || (physicalNftCollections && physicalNftCollections.length > 0 && !metadataFetchStarted) || isLoadingMetadata;

  /* process collections data */
  const processedNftOnly = useMemo(() => {
    if (!nftOnlyCollections) return [];
    const processed = (nftOnlyCollections as any[]).map((col: any) => ({
      address: col.collectionAddress,
      name: col.name,
      symbol: col.symbol,
      baseURI: col.baseURI,
      maxSupply: col.maxSupply,
      mintPrice: col.mintPrice,
      owner: col.owner,
      type: 'nft-only'
    }));
    console.log('🔵 Processed NFT-Only Collections:', processed);
    return processed;
  }, [nftOnlyCollections]);

  useEffect(() => {
    if (!physicalNftCollections || !publicClient) return;
    
    const fetchMetadata = async () => {
      setMetadataFetchStarted(true);
      setIsLoadingMetadata(true);
      const metadata: Record<string, any> = {};
      
      // Set a timeout to prevent hanging
      const timeoutId = setTimeout(() => {
        console.warn('Metadata fetching timeout - using fallback data');
        setIsLoadingMetadata(false);
      }, 10000); // 10 second timeout
      
      for (const address of physicalNftCollections as string[]) {
        try {
          // Fetch collection details from the individual collection contract
          const [name, symbol, baseURI, maxSupply, mintPrice] = await Promise.all([
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
              functionName: "uri",
              args: [0n], // Get URI for token ID 0
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
          
          metadata[address] = {
            name: name as string,
            symbol: symbol as string,
            baseURI: baseURI as string,
            maxSupply: maxSupply as bigint,
            mintPrice: mintPrice as bigint,
            owner: '', // ERC1155 contracts don't have owner function
          };
        } catch (error) {
          console.error(`Error fetching metadata for ${address}:`, error);
          metadata[address] = {
            name: `Collection ${address.slice(0, 6)}...`,
            symbol: 'PHYS',
            baseURI: '',
            maxSupply: 0n,
            mintPrice: 0n,
            owner: '',
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
  }, [physicalNftCollections, publicClient]);

  const processedPhysicalNft = useMemo(() => {
    if (!physicalNftCollections) return [];
    // ERC1155 factory returns just addresses, not full collection info
    const processed = (physicalNftCollections as string[]).map((address: string) => {
      const metadata = physicalNftMetadata[address];
      return {
        address: address,
        name: metadata?.name || `Collection ${address.slice(0, 6)}...`,
        symbol: metadata?.symbol || 'PHYS',
        baseURI: metadata?.baseURI || '',
        maxSupply: metadata?.maxSupply || 0n,
        mintPrice: metadata?.mintPrice || 0n,
        owner: metadata?.owner || '',
        type: 'physical-nft'
      };
    });
    console.log('🟣 Processed Physical+NFT Collections:', processed);
    console.log('🟣 Metadata available for:', Object.keys(physicalNftMetadata).length, 'collections');
    return processed;
  }, [physicalNftCollections, physicalNftMetadata]);

  /* filter by keyword (memoised) */
  const filteredNftOnly = useMemo(() => {
    if (!keyword) return processedNftOnly;
    return processedNftOnly.filter((col) =>
      col.name?.toLowerCase().includes(keyword)
    );
  }, [keyword, processedNftOnly]);

  const filteredPhysicalNft = useMemo(() => {
    if (!keyword) return processedPhysicalNft;
    return processedPhysicalNft.filter((col) =>
      col.name?.toLowerCase().includes(keyword)
    );
  }, [keyword, processedPhysicalNft]);

  /* early returns */
  if (loading)          return <FullPageLoader message="Loading collections…" />;
  if (!nftOnlyLoading && !physicalNftLoading && processedNftOnly.length === 0 && processedPhysicalNft.length === 0)
    return <Empty>No collections yet.</Empty>;
  if (keyword && filteredNftOnly.length === 0 && filteredPhysicalNft.length === 0)
    return <Empty>No collections found for "{keyword}".</Empty>;

  /* ---------------- main render ---------------- */
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* ⭐ animated gradient backdrop (unchanged) */}
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
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
      </div>

      <div className="relative z-10 container mx-auto px-6 py-20">
        {/* header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/20 rounded-full px-6 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-purple-400 animate-spin" />
            <span className="text-sm font-medium text-gray-300">
              Featured Collections
            </span>
            <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold text-xs">
              {(filteredNftOnly.length + filteredPhysicalNft.length)}
            </Badge>
          </div>

          <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
            <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
              Explore
            </span>
            <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
              Collections
            </span>
          </h1>
        </div>

        {/* NFT-Only Collections Section */}
        {filteredNftOnly.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                Digital NFT Collections
              </h2>
              <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-bold text-xs">
                {filteredNftOnly.length}
              </Badge>
            </div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {filteredNftOnly.map((col, i) => (
                <div
                  key={col.address}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <CollectionCard
                    address={col.address}
                    preview={CONTRACTS.collectionPreview(col.address)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Physical + NFT Collections Section */}
        {filteredPhysicalNft.length > 0 && (
          <div className="mb-16">
            <div className="flex items-center space-x-3 mb-8">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <h2 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Card + NFT Collections
              </h2>
              <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-xs">
                {filteredPhysicalNft.length}
              </Badge>
            </div>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 max-w-7xl mx-auto">
              {filteredPhysicalNft.map((col, i) => (
                <div
                  key={col.address}
                  className="animate-fade-in-up"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <CollectionCard
                    address={col.address}
                    preview={CONTRACTS.collectionPreview(col.address)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* footer tease */}
        <div className="text-center mt-16">
          <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/10 to-pink-500/10 backdrop-blur-xl border border-white/10 rounded-full px-8 py-4">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-gray-300 font-medium">
              More collections coming soon…
            </span>
          </div>
        </div>
      </div>

      {/* neat little fade-up animation utility */}
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
