
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
import NFTCard        from "@/components/NFTCard";
import AlchemyNFTCard from "@/components/AlchemyNFTCard";
import { CONTRACTS }  from "@/lib/contract";
import { getNFTsForOwner, AlchemyNFT } from "@/lib/alchemy";
import Link from "next/link";

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
  const [busy,  setBusy]  = useState(true);
  const [owned, setOwned] = useState<
    { collection: `0x${string}`; name: string; ids: bigint[] }[]
  >([]);
  const [alchemyNfts, setAlchemyNfts] = useState<AlchemyNFT[]>([]);

  // Fetch from both factory types
  const { data: singleNftCollections = [], isPending: singleNftLoading, error: singleNftError } = useReadContract({
    address:      CONTRACTS.singleFactory as `0x${string}`,
    abi:          CONTRACTS.singleFactoryAbi,
    functionName: "getAllCollectionsWithInfo",
    query:        { enabled: !!address },
  });

  const { data: erc1155Collections = [], isPending: erc1155Loading, error: erc1155Error } = useReadContract({
    address:      CONTRACTS.factoryERC1155 as `0x${string}`,
    abi:          CONTRACTS.factoryERC1155Abi,
    functionName: "getAllCollections",
    query:        { enabled: !!address },
  });

  const publicClient = usePublicClient({ chainId: 84532 });

  // Debug contract loading states
  console.log('🔍 Contract loading states:', {
    singleNftLoading,
    erc1155Loading,
    singleNftError,
    erc1155Error,
    singleNftCollections: singleNftCollections?.length || 0,
    erc1155Collections: erc1155Collections?.length || 0,
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

  // Combine collections from both factories
  const collections = useMemo(() => {
    const singleNft = (singleNftCollections as any[])?.map((col: any) => col.collectionAddress) || [];
    const erc1155 = (erc1155Collections as string[]) || [];
    return [...singleNft, ...erc1155];
  }, [singleNftCollections, erc1155Collections]);


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

    load();
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

  if (owned.length === 0)
    return (
      <p className="text-center mt-12 text-zinc-400">
        😢 No Cardify NFTs owned yet.
      </p>
    );

  /* ---------- main render ---------- */
    return (
    <div className="px-6 md:px-10 py-8 space-y-12">
      <h1 className="text-3xl font-playfair font-bold text-zinc-400">
        Cardify NFTs
      </h1>

      {owned.map(({ collection, ids, name }) => (
        <section key={collection} className="space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-playfair text-2xl font-bold">{name}</h2>
              <span className="text-zinc-400 text-sm">({ids.length} owned)</span>
            </div>
            <p className="text-xs text-zinc-500 font-mono mt-1">{collection}</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {(() => {
              const collectionNfts = alchemyNfts.filter(nft => 
                nft.contract.address.toLowerCase() === collection.toLowerCase()
              );
              console.log(`🔍 Collection ${collection} NFTs:`, collectionNfts.length, collectionNfts);
              return collectionNfts.map((nft, index) => (
                <Link
                  key={nft.uniqueId || `${nft.contract.address}-${nft.tokenId}-${index}`}
                  href={`/list/${nft.contract.address}/${nft.tokenId}`}
                  className="block"
                >
                  <AlchemyNFTCard nft={nft} />
                </Link>
              ));
            })()}
          </div>
        </section>
      ))}
    </div>
  );
}
