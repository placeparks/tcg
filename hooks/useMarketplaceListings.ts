import { useState, useEffect, useCallback, useRef } from "react"
import { usePublicClient } from "wagmi"
import { CONTRACTS } from "@/lib/contract"
import { metaCache } from "@/lib/net-utils"

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000"
const ipfsToHttp = (u: string) => u.replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/")

export type ListedItem = {
  collection: string;
  id: number;
  seller: `0x${string}`;
  price: bigint;
  metadata: { name?: string; image?: string; [k: string]: any };
};

type Listing1155Tuple = readonly [`0x${string}`, bigint];

interface UseMarketplaceListingsOptions {
  includePacks?: boolean;
  collections?: string[]; // If provided, only fetch from these collections
  maxTokensPerCollection?: number; // Limit tokens checked per collection (default: 100)
}

export function useMarketplaceListings(options: UseMarketplaceListingsOptions = {}) {
  const { includePacks = true, collections: providedCollections, maxTokensPerCollection = 100 } = options;
  const publicClient = usePublicClient();
  
  const [listedNFTs, setListedNFTs] = useState<ListedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstFetchDone, setFirstFetchDone] = useState(false);
  const inFlight = useRef(false);
  const packCollectionsRef = useRef<Set<string>>(new Set());

  // Fetch collections if not provided
  const [collections, setCollections] = useState<string[]>(providedCollections || []);
  
  useEffect(() => {
    if (providedCollections) {
      setCollections(providedCollections);
      return;
    }

    // Auto-fetch collections from factories
    if (!publicClient) return;

    const fetchCollections = async () => {
      const collectionsList: string[] = [];
      const packCollectionSet = new Set<string>();

      // Fetch from ERC1155 factory
      try {
        const total = await publicClient.readContract({
          address: CONTRACTS.factoryERC1155 as `0x${string}`,
          abi: CONTRACTS.factoryERC1155Abi,
          functionName: "totalCollections",
        }) as bigint;

        if (total > 0n) {
          const count = Number(total);
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
      } catch (error) {
        console.error('Error fetching ERC1155 collections:', error);
      }

      // Fetch from Single factory
      try {
        const total = await publicClient.readContract({
          address: CONTRACTS.singleFactory as `0x${string}`,
          abi: CONTRACTS.singleFactoryAbi,
          functionName: "totalCollections",
        }) as bigint;

        if (total > 0n) {
          const count = Number(total);
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
      } catch (error) {
        console.error('Error fetching Single factory collections:', error);
      }

      // Fetch Pack collections if enabled
      if (includePacks) {
        try {
          const response = await fetch('/api/packs/active');
          if (response.ok) {
            const dbPacks = await response.json();
            if (Array.isArray(dbPacks)) {
              dbPacks.forEach((dbPack: any) => {
                if (dbPack.collection_address) {
                  const packAddr = dbPack.collection_address.toLowerCase();
                  collectionsList.push(dbPack.collection_address);
                  packCollectionSet.add(packAddr);
                }
              });
            }
          }
        } catch (error) {
          console.error('Error fetching pack collections:', error);
        }
      }

      // Dedupe collections
      const unique = Array.from(new Set(collectionsList.map(a => a.toLowerCase())));
      setCollections(unique);
      packCollectionsRef.current = packCollectionSet;
    };

    fetchCollections();
  }, [publicClient, includePacks, providedCollections]);

  const fetchListings = useCallback(async () => {
    if (!publicClient || !collections.length || inFlight.current) return;
    
    inFlight.current = true;
    setLoading(true);
    
    try {
      // 1) Get supplies in parallel
      const supplies = await Promise.all(
        collections.map(async (col) => {
          const isPack = packCollectionsRef.current.has(col.toLowerCase());
          let supply = 0n;
          
          if (isPack) {
            try {
              supply = await publicClient.readContract({
                address: col as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: "cardCount",
              }) as bigint;
              supply = supply + 1n; // +1 for pack token id 0
            } catch {
              supply = 1n;
            }
          } else {
            try {
              supply = await publicClient.readContract({
                address: col as `0x${string}`,
                abi: CONTRACTS.nft1155Abi,
                functionName: "totalMinted",
              }) as bigint;
            } catch {}

            if (supply === 0n) {
              try {
                supply = await publicClient.readContract({
                  address: col as `0x${string}`,
                  abi: CONTRACTS.nft1155Abi,
                  functionName: "maxSupply",
                }) as bigint;
              } catch {
                supply = 1n;
              }
            }
            
            if (supply === 0n) supply = 1n;
          }
          
          return supply;
        })
      );

      const allItems: ListedItem[] = [];

      // 2) Per collection, batch listing lookups with multicall
      await Promise.all(
        collections.map(async (col, idx) => {
          const total = supplies[idx] ?? 0n;
          if (total === 0n) return;

          const maxCheck = Math.min(Number(total), maxTokensPerCollection);
          if (maxCheck === 0) return;

          const tokenIds = Array.from({ length: maxCheck }, (_, i) => BigInt(i));

          // Batch listings1155 calls
          const listingContracts = tokenIds.map((id) => ({
            address: CONTRACTS.marketplace as `0x${string}`,
            abi: CONTRACTS.marketplaceAbi,
            functionName: "listings1155" as const,
            args: [col as `0x${string}`, id],
          }));

          const listingResults = await publicClient.multicall({
            contracts: listingContracts,
            allowFailure: true,
          });

          const liveTokenIds: bigint[] = [];
          const liveListings: Listing1155Tuple[] = [];

          listingResults.forEach((res: any, i: number) => {
            if (!res.status || res.status === "failure") return;
            const [seller, unitPrice] = res.result as Listing1155Tuple;
            if (
              seller.toLowerCase() !== ZERO_ADDRESS &&
              unitPrice > 0n
            ) {
              liveTokenIds.push(tokenIds[i]);
              liveListings.push([seller, unitPrice]);
            }
          });

          if (!liveTokenIds.length) return;

          const isPack = packCollectionsRef.current.has(col.toLowerCase());
          const nftAbi = isPack ? CONTRACTS.packCollectionAbi : CONTRACTS.nft1155Abi;

          // 3) Batch `uri` calls only for live tokens
          const uriContracts = liveTokenIds.map((id) => ({
            address: col as `0x${string}`,
            abi: nftAbi,
            functionName: "uri" as const,
            args: [id],
          }));

          const uriResults = await publicClient.multicall({
            contracts: uriContracts,
            allowFailure: true,
          });

          const metas: ListedItem["metadata"][] = [];

          // 4) Fetch metadata (with cache)
          await Promise.all(
            uriResults.map(async (res: any, j: number) => {
              const fallbackName = `NFT #${liveTokenIds[j].toString()}`;
              
              if (!res.status || res.status === "failure") {
                metas[j] = { name: fallbackName, image: "/placeholder.svg" };
                return;
              }

              let uri = res.result as string;
              if (!uri) {
                metas[j] = { name: fallbackName, image: "/placeholder.svg" };
                return;
              }

              if (metaCache.has(uri)) {
                metas[j] = metaCache.get(uri);
                return;
              }

              try {
                const http = ipfsToHttp(uri);
                const r = await fetch(http);
                if (!r.ok) throw new Error(`HTTP ${r.status}`);
                
                const ct = r.headers.get("content-type") || "";
                let md: any;
                
                if (ct.includes("image/")) {
                  md = { name: fallbackName, image: http };
                } else {
                  md = await r.json();
                  if (md.image) md.image = ipfsToHttp(md.image);
                }
                
                metaCache.set(uri, md);
                metas[j] = md;
              } catch {
                metas[j] = { name: fallbackName, image: "/placeholder.svg" };
              }
            })
          );

          // 5) Build final item list
          liveTokenIds.forEach((id, j) => {
            const [seller, unitPrice] = liveListings[j];
            allItems.push({
              collection: col,
              id: Number(id),
              seller,
              price: unitPrice,
              metadata: metas[j],
            });
          });
        })
      );

      setListedNFTs(allItems);
      setFirstFetchDone(true);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, [publicClient, collections, maxTokensPerCollection]);

  // Trigger fetch when collections change
  useEffect(() => {
    if (!collections.length) {
      setListedNFTs([]);
      setLoading(false);
      setFirstFetchDone(true);
      return;
    }
    fetchListings();
  }, [collections, fetchListings]);

  return {
    listings: listedNFTs,
    loading,
    firstFetchDone,
    refetch: fetchListings,
  };
}

