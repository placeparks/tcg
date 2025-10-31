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
import { Sparkles }                  from "lucide-react";

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
  const [allCollections, setAllCollections] = useState<{address: string, type: 'erc1155' | 'single'}[][]>([]);
  const [physicalNftMetadata, setPhysicalNftMetadata] = useState<Record<string, any>>({});
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [metadataFetchStarted, setMetadataFetchStarted] = useState(false);

  // Fetch all collections from both factories
  useEffect(() => {
    if (!publicClient) return;
    
    const fetchAllCollections = async () => {
      const allCollectionsData: {address: string, type: 'erc1155' | 'single'}[] = [];
      
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
      
      console.log('🟣 All Collections:', allCollectionsData);
      console.log('🟣 ERC1155 Collections:', allCollectionsData.filter(c => c.type === 'erc1155'));
      console.log('🟣 Single NFT Collections:', allCollectionsData.filter(c => c.type === 'single'));
      setAllCollections([allCollectionsData]);
    };
    
    fetchAllCollections();
  }, [erc1155Total, singleNftTotal, publicClient]);

  /* flags */
  const loading = !ready || erc1155Loading || singleNftLoading || isLoadingMetadata;
  
  // Add a small delay to prevent flash of "No Collections Yet"
  const [showContent, setShowContent] = useState(false);
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  

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
            symbol: type === 'erc1155' ? 'HYBRID' : 'SINGLE',
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

  const processedPhysicalNft = useMemo(() => {
    if (!allCollections) return [];
    const flatCollections = allCollections.flat();
    const processed = flatCollections.map((collection) => {
      const { address, type } = collection;
      const metadata = physicalNftMetadata[address];
      return {
        address: address,
        name: metadata?.name || `Collection ${address.slice(0, 6)}...`,
        symbol: metadata?.symbol || (type === 'erc1155' ? 'HYBRID' : 'SINGLE'),
        baseURI: metadata?.baseURI || '',
        maxSupply: metadata?.maxSupply || 0n,
        mintPrice: metadata?.mintPrice || 0n,
        owner: metadata?.owner || '',
        type: type
      };
    });
    console.log('🟣 Processed Physical+NFT Collections:', processed);
    console.log('🟣 Metadata available for:', Object.keys(physicalNftMetadata).length, 'collections');
    return processed;
  }, [allCollections, physicalNftMetadata]);

  /* filter by keyword (memoised) */
  const filteredCollections = useMemo(() => {
    if (!keyword) return processedPhysicalNft;
    return processedPhysicalNft.filter((col) =>
      col.name?.toLowerCase().includes(keyword)
    );
  }, [keyword, processedPhysicalNft]);

  const filteredPhysicalNft = useMemo(() => {
    if (!keyword) return processedPhysicalNft;
    return processedPhysicalNft.filter((col) =>
      col.name?.toLowerCase().includes(keyword)
    );
  }, [keyword, processedPhysicalNft]);

  /* early returns */
  if (loading || !showContent) return <FullPageLoader message="Loading collections…" />;
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
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Collections</h1>
        
        {filteredCollections.length > 0 && (
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCollections.map((col, i) => (
              <div key={col.address}>
                <CollectionCard
                  address={col.address}
                  preview={CONTRACTS.collectionPreview(col.address)}
                  type={col.type}
                />
              </div>
            ))}
          </div>
        )}
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
