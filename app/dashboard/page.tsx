"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useAccount,
  useReadContract,
  usePublicClient,
  useWatchContractEvent,
  useWriteContract,
} from "wagmi";

import FullPageLoader     from "@/components/FullPageLoader";
import AlchemyNFTCard     from "@/components/AlchemyNFTCard";
import { CONTRACTS }      from "@/lib/contract";
import { getNFTsForOwner, AlchemyNFT } from "@/lib/alchemy";
import PackOpeningAnimation from "@/components/PackOpeningAnimation";
import DashboardPackCard from "@/components/DashboardPackCard";

/* ------------------------------------------------------------------ */
/* constants + helpers                                                */
const CHAIN_ID = 84532;                          // Base-Sepolia

/* ------------------------------------------------------------------ */
export default function Dashboard() {
  /* wallet ---------------------------------------------------------------- */
  const { ready }     = usePrivy();
  const { address }   = useAccount();
  const publicClient  = usePublicClient({ chainId: CHAIN_ID });

  /* ui state -------------------------------------------------------------- */
  const [busy,  setBusy ] = useState(false);
  const [show,  setShow ] = useState(false);

  /* data ------------------------------------------------------------------ */
  const [allCollections, setAllCollections] = useState<string[]>([]);
  const [alchemyNfts,    setAlchemyNfts   ] = useState<AlchemyNFT[]>([]);
  const [packs, setPacks] = useState<Array<{
    packAddress: string;
    name: string;
    symbol: string;
    balance: bigint;
    packImageUri?: string;
    nftImageUris?: string[];
    allTokenUris?: string[];
    packTokenId: bigint; // The token ID for the pack (5 or 0)
    uniqueId?: string;
  }>>([]);
  const [selectedPack, setSelectedPack] = useState<{
    packAddress: string;
    name: string;
    nftMetadata: Array<{
      name: string;
      description: string;
      image: string;
      attributes: Array<{ trait_type: string; value: string }>;
    }>;
  } | null>(null);
  const [showPackView, setShowPackView] = useState(false);

  /* totals from factories ------------------------------------------------- */
  const {
    data: singleTotal,
    isPending: singleLoading,
    error: singleErr,
  } = useReadContract({
    address:      CONTRACTS.singleFactory,
    abi:          CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query:        { enabled: !!address },
  });

  const {
    data: erc1155Total,
    isPending: erc1155Loading,
    error: erc1155Err,
  } = useReadContract({
    address:      CONTRACTS.factoryERC1155,
    abi:          CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query:        { enabled: !!address },
  });

  // Fetch pack collections from database
  const loadPacks = useCallback(async () => {
    if (!address || !publicClient) return;
    
    try {
      const response = await fetch('/api/packs/active');
      if (!response.ok) return;
      
      const dbPacks = await response.json();
      if (!Array.isArray(dbPacks)) return;
      
        // Check balance for each pack
        // Unopened packs are token ID 0 (token ID 5 is only for metadata/display)
        // When opened, token ID 0 is burned and 5 NFTs (token IDs 0-4) are minted
        console.log(`🔍 Checking pack balances for wallet: ${address}`);
        const packBalances = await Promise.all(
          dbPacks.map(async (dbPack: any) => {
            try {
              // Check token ID 0 first (unopened packs are token ID 0)
              let balance = await publicClient.readContract({
                address: dbPack.collection_address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: 'balanceOf',
                args: [address as `0x${string}`, 0n],
              }).catch(() => 0n) as bigint;
              
              let packTokenId = 0n; // Default to legacy token ID 0
              
              console.log(`  📦 Pack "${dbPack.name}" (${dbPack.collection_address}):`);
              console.log(`     Token ID 0 balance: ${balance.toString()}`);
              
              // Also check token ID 5 for backwards compatibility (some old packs might be at ID 5)
              if (balance === 0n) {
                const balance5 = await publicClient.readContract({
                  address: dbPack.collection_address as `0x${string}`,
                  abi: CONTRACTS.packCollectionAbi,
                  functionName: 'balanceOf',
                  args: [address as `0x${string}`, 5n],
                }).catch(() => 0n) as bigint;
                if (balance5 > 0n) {
                  balance = balance5;
                  packTokenId = 5n; // Most packs mint to token ID 5
                }
                console.log(`     Token ID 5 balance: ${balance5.toString()}`);
              }
              
              console.log(`     ✅ Final: ${balance.toString()} unopened pack(s) at token ID ${packTokenId.toString()}`);
              
              if (balance > 0n) {
                // Parse JSON strings from database
                let nftImageUris: string[] = [];
                let allTokenUris: string[] = [];
                
                try {
                  nftImageUris = JSON.parse(dbPack.nft_image_uris || '[]') as string[];
                } catch (e) {
                  console.warn('Failed to parse nft_image_uris');
                }
                
                try {
                  allTokenUris = JSON.parse(dbPack.all_token_uris || '[]') as string[];
                } catch (e) {
                  console.warn('Failed to parse all_token_uris');
                }
                
                return {
                  packAddress: dbPack.collection_address,
                  name: dbPack.name || 'Unnamed Pack',
                  symbol: dbPack.symbol || 'PACK',
                  balance: balance,
                  packImageUri: dbPack.pack_image_uri,
                  nftImageUris,
                  allTokenUris,
                  packTokenId,
                };
              }
              return null;
            } catch (error) {
              console.error(`Error checking balance for pack ${dbPack.collection_address}:`, error);
              return null;
            }
          })
        );
      
      // Expand packs to show individual instances
      // If user owns 3 packs, create 3 separate pack objects
      const expandedPacks: Array<typeof packBalances[0] & { uniqueId: string }> = [];
      let totalUnopenedPacks = 0;
      
      packBalances.forEach((pack) => {
        if (pack) {
          const count = Number(pack.balance);
          totalUnopenedPacks += count;
          console.log(`📦 Expanding pack "${pack.name}": balance = ${count}, creating ${count} pack instance(s)`);
          for (let i = 0; i < count; i++) {
            expandedPacks.push({
              ...pack,
              // Add a unique ID for each instance
              uniqueId: `${pack.packAddress}-${pack.packTokenId}-${i}`,
            } as any);
          }
        }
      });
      
      console.log(`\n📊 SUMMARY:`);
      console.log(`   Total unopened packs in wallet: ${totalUnopenedPacks}`);
      console.log(`   Total pack cards to display: ${expandedPacks.length}`);
      console.log(`\n`);
      
      setPacks(expandedPacks.filter(Boolean) as any);
    } catch (error) {
      console.error('Error fetching packs:', error);
    }
  }, [address, publicClient]);

  useEffect(() => { 
    loadPacks(); 
  }, [loadPacks]);

  /* ------------------------------------------------------------------ */
  /* 1/3 – load every collection address once totals are known          */
  useEffect(() => {
    if (!publicClient || (!singleTotal && !erc1155Total)) return;

    (async () => {
      const list: string[] = [];

      if (singleTotal) {
        const n = Number(singleTotal as bigint);
        for (let i = 0; i < n; i++) {
          const addr = await publicClient.readContract({
            address:      CONTRACTS.singleFactory,
            abi:          CONTRACTS.singleFactoryAbi,
            functionName: "allCollections",
            args:         [BigInt(i)],
          });
          list.push(addr as string);
        }
      }

      if (erc1155Total) {
        const n = Number(erc1155Total as bigint);
        for (let i = 0; i < n; i++) {
          const addr = await publicClient.readContract({
            address:      CONTRACTS.factoryERC1155,
            abi:          CONTRACTS.factoryERC1155Abi,
            functionName: "allCollections",
            args:         [BigInt(i)],
          });
          list.push(addr as string);
        }
      }

      // Also add pack collection addresses
      try {
        const response = await fetch('/api/packs/active');
        if (response.ok) {
          const dbPacks = await response.json();
          if (Array.isArray(dbPacks)) {
            dbPacks.forEach((dbPack: any) => {
              if (dbPack.collection_address) {
                list.push(dbPack.collection_address);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching pack collections for NFT loading:', error);
      }

      setAllCollections(list);
    })();
  }, [singleTotal, erc1155Total, publicClient]);

  /* ------------------------------------------------------------------ */
  /* 2/3 – core loader                                                  */
  const loadNfts = useCallback(async () => {
    if (!ready || !address || !allCollections.length) return;

    setBusy(true);
    setShow(false);

    try {
      // Get pack collection addresses to filter out pack tokens
      const packCollectionAddresses = new Set<string>();
      try {
        const response = await fetch('/api/packs/active');
        if (response.ok) {
          const dbPacks = await response.json();
          if (Array.isArray(dbPacks)) {
            dbPacks.forEach((dbPack: any) => {
              if (dbPack.collection_address) {
                packCollectionAddresses.add(dbPack.collection_address.toLowerCase());
              }
            });
          }
        }
      } catch (error) {
        console.error('Error fetching pack collections for filtering:', error);
      }

      const raw = await getNFTsForOwner(address, allCollections);

      // Fetch pack token IDs from contracts for each pack collection
      const packTokenIdMap = new Map<string, { packTokenId: bigint; cardTokenIds: bigint[] }>();
      if (publicClient) {
        for (const packAddress of packCollectionAddresses) {
          try {
            const [packTokenId, cardTokenIds] = await Promise.all([
              publicClient.readContract({
                address: packAddress as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: 'packTokenId',
              }).catch(() => 0n) as Promise<bigint>,
              publicClient.readContract({
                address: packAddress as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: 'cardTokenIds',
              }).catch(() => [1n, 2n, 3n, 4n, 5n]) as Promise<bigint[]>,
            ]);
            packTokenIdMap.set(packAddress.toLowerCase(), { packTokenId, cardTokenIds });
            console.log(`📦 Pack ${packAddress}: packTokenId=${packTokenId.toString()}, cardTokenIds=[${cardTokenIds.map(id => id.toString()).join(', ')}]`);
          } catch (error) {
            console.error(`Error fetching token IDs for pack ${packAddress}:`, error);
            // Fallback to default values
            packTokenIdMap.set(packAddress.toLowerCase(), { packTokenId: 0n, cardTokenIds: [1n, 2n, 3n, 4n, 5n] });
          }
        }
      }

      const factories = new Set(allCollections.map(c => c.toLowerCase()));
      const kept      = raw.filter(nft => {
        const isFromFactory = factories.has(nft.contract.address.toLowerCase());
        if (!isFromFactory) return false;
        
        // If NFT is from a pack collection, use contract to determine valid token IDs
        const isFromPackCollection = packCollectionAddresses.has(nft.contract.address.toLowerCase());
        if (isFromPackCollection) {
          const tokenId = BigInt(nft.tokenId);
          const tokenIdInfo = packTokenIdMap.get(nft.contract.address.toLowerCase());
          
          if (!tokenIdInfo) {
            // If we couldn't fetch token ID info, filter out token ID 0 (default pack token)
            return tokenId !== 0n;
          }
          
          // Filter out the pack token ID, only show card token IDs
          if (tokenId === tokenIdInfo.packTokenId) {
            return false; // This is the pack token, not an NFT
          }
          
          // Only show if it's one of the valid card token IDs
          return tokenIdInfo.cardTokenIds.includes(tokenId);
        }
        
        return true;
      });

      // Build a map of pack collection addresses to their token URIs from database
      const packUriMap = new Map<string, Map<number, { uri: string; imageUri?: string }>>();
      if (packCollectionAddresses.size > 0 && publicClient) {
        try {
          const response = await fetch('/api/packs/active');
          if (response.ok) {
            const dbPacks = await response.json();
            if (Array.isArray(dbPacks)) {
              for (const dbPack of dbPacks) {
                if (!dbPack.collection_address) continue;
                const collectionLower = dbPack.collection_address.toLowerCase();
                if (!packCollectionAddresses.has(collectionLower)) continue;
                
                try {
                  let allTokenUris: string[] = [];
                  let nftImageUris: string[] = [];
                  
                  try {
                    allTokenUris = JSON.parse(dbPack.all_token_uris || '[]') as string[];
                  } catch (e) {
                    console.warn(`Failed to parse all_token_uris for ${collectionLower}`);
                  }
                  
                  try {
                    nftImageUris = JSON.parse(dbPack.nft_image_uris || '[]') as string[];
                  } catch (e) {
                    console.warn(`Failed to parse nft_image_uris for ${collectionLower}`);
                  }
                  
                  // Map token IDs 1-5 to indices 0-4 in allTokenUris
                  // Token ID 1 -> index 0, Token ID 2 -> index 1, etc.
                  const tokenIdMap = new Map<number, { uri: string; imageUri?: string }>();
                  for (let tokenId = 1; tokenId <= 5; tokenId++) {
                    const uriIndex = tokenId - 1; // Token ID 1 maps to index 0
                    if (uriIndex < allTokenUris.length && allTokenUris[uriIndex]) {
                      tokenIdMap.set(tokenId, {
                        uri: allTokenUris[uriIndex],
                        imageUri: nftImageUris[uriIndex]
                      });
                    }
                  }
                  
                  if (tokenIdMap.size > 0) {
                    packUriMap.set(collectionLower, tokenIdMap);
                    console.log(`📦 Mapped URIs for pack ${collectionLower}:`, Array.from(tokenIdMap.entries()).map(([id, data]) => `${id}->${data.uri}`));
                  }
                } catch (error) {
                  console.error(`Error processing pack ${collectionLower}:`, error);
                }
              }
            }
          }
        } catch (error) {
          console.error('Error fetching pack URIs:', error);
        }
      }

      // Process NFTs and override metadata for pack collection NFTs
      const expanded: AlchemyNFT[] = [];
      const processedNfts = await Promise.all(kept.map(async (nft) => {
        const count = nft.tokenType === "ERC1155"
          ? Number((nft as any).balance ?? 1)
          : 1;
        
        // Override token URI and metadata if this is a pack collection NFT
        let nftToAdd = { ...nft };
        const collectionLower = nft.contract.address.toLowerCase();
        const tokenIdNum = Number(nft.tokenId);
        const isPackCollection = packCollectionAddresses.has(collectionLower);
        
        if (isPackCollection && tokenIdNum >= 1 && tokenIdNum <= 5) {
          const uriMap = packUriMap.get(collectionLower);
          if (uriMap) {
            const uriData = uriMap.get(tokenIdNum);
            if (uriData && uriData.uri) {
              try {
                // Fetch metadata from the correct URI
                const metadataResponse = await fetch(`/api/ipfs-metadata?src=${encodeURIComponent(uriData.uri)}&tokenId=${tokenIdNum}`);
                if (metadataResponse.ok) {
                  const metadata = await metadataResponse.json();
                  
                  // Override the NFT's metadata
                  nftToAdd = {
                    ...nftToAdd,
                    name: metadata.name || nftToAdd.name || `NFT #${tokenIdNum}`,
                    raw: {
                      ...nftToAdd.raw,
                      metadata: {
                        ...nftToAdd.raw?.metadata,
                        name: metadata.name || nftToAdd.raw?.metadata?.name,
                        description: metadata.description || nftToAdd.raw?.metadata?.description,
                        image: metadata.imageUrl || uriData.imageUri || nftToAdd.raw?.metadata?.image,
                        attributes: metadata.attributes || nftToAdd.raw?.metadata?.attributes || []
                      },
                      tokenUri: {
                        raw: uriData.uri,
                        gateway: uriData.uri.startsWith('ipfs://') 
                          ? `https://gateway.pinata.cloud/ipfs/${uriData.uri.replace('ipfs://', '').replace(/^\/+/, '')}`
                          : uriData.uri
                      }
                    },
                    tokenUri: uriData.uri,
                    image: {
                      cachedUrl: metadata.imageUrl || uriData.imageUri,
                      originalUrl: metadata.imageUrl || uriData.imageUri
                    }
                  };
                  
                  console.log(`✅ Overrode metadata for token ID ${tokenIdNum} in ${collectionLower}:`, {
                    name: nftToAdd.name,
                    image: nftToAdd.image?.cachedUrl
                  });
                }
              } catch (error) {
                console.warn(`Error fetching metadata for token ID ${tokenIdNum}:`, error);
              }
            }
          }
        }
        
        // Expand based on balance
        const expandedForThisNft: AlchemyNFT[] = [];
        for (let i = 0; i < count; i++) {
          expandedForThisNft.push({ 
            ...nftToAdd, 
            uniqueId: `${nftToAdd.contract.address}-${nftToAdd.tokenId}-${i}` 
          });
        }
        return expandedForThisNft;
      }));
      
      // Flatten the array of arrays
      expanded.push(...processedNfts.flat());
      
      setAlchemyNfts(expanded);
    } catch (err) {
      console.error("NFT fetch failed:", err);
      setAlchemyNfts([]);
    } finally {
      setBusy(false);
      setTimeout(() => setShow(true), 200);   // anti-flicker
    }
  }, [ready, address, allCollections, publicClient]);

  useEffect(() => { 
    loadNfts();
    loadPacks(); // Also load packs when address changes
  }, [loadNfts, loadPacks]);

  // Handle opening a pack - shows animation with NFTs
  const handleOpenPack = async (packAddress: string, packName: string) => {
    if (!publicClient) return;
    
    try {
      // Find the pack data
      const pack = packs.find(p => p.packAddress === packAddress);
      if (!pack) return;

      // Use token URIs from database if available, otherwise fetch from blockchain
      let tokenURIs: (string | null)[] = [];
      
      if (pack.allTokenUris && pack.allTokenUris.length >= 5) {
        // Use database token URIs (first 5 are the NFTs)
        tokenURIs = pack.allTokenUris.slice(0, 5);
      } else {
        // Fallback: Fetch token URIs from blockchain
        // NFT token IDs are 1-5, not 0-4
        tokenURIs = await Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            publicClient.readContract({
              address: packAddress as `0x${string}`,
              abi: CONTRACTS.packCollectionAbi,
              functionName: 'uri',
              args: [BigInt(i + 1)], // Token IDs are 1-5, not 0-4
            }).catch(() => null)
          )
        );
      }

      // Fetch metadata for each NFT
      const nftMetadataPromises = tokenURIs.map(async (tokenUri, index) => {
        const imageUri = pack.nftImageUris?.[index];
        
        if (!tokenUri || tokenUri === 'ipfs://...' || tokenUri.includes('...')) {
          // Use image from database if available
          const fallbackImage = imageUri 
            ? (imageUri.startsWith('ipfs://') 
                ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '').replace(/^\/+/, '')}`
                : imageUri)
            : '/cardifyN.png';
          
          return {
            name: `NFT ${index + 1}`,
            description: '',
            image: fallbackImage,
            attributes: []
          };
        }

        try {
          let httpUrl = tokenUri as string;
          if (httpUrl.startsWith('ipfs://')) {
            const ipfsHash = httpUrl.replace('ipfs://', '').replace(/^\/+/, '');
            httpUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          try {
            const response = await fetch(httpUrl, { 
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const metadata = await response.json();
              // Ensure image is set, use imageUri from database as fallback
              if (!metadata.image && imageUri) {
                metadata.image = imageUri.startsWith('ipfs://') 
                  ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '').replace(/^\/+/, '')}`
                  : imageUri;
              }
              return metadata;
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error) {
          console.warn(`Error fetching metadata for NFT ${index}:`, error);
        }

        // Fallback: use image from database if available
        const fallbackImage = imageUri 
          ? (imageUri.startsWith('ipfs://') 
              ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '').replace(/^\/+/, '')}`
              : imageUri)
          : '/cardifyN.png';

        return {
          name: `NFT ${index + 1}`,
          description: '',
          image: fallbackImage,
          attributes: []
        };
      });

      const nftMetadata = await Promise.all(nftMetadataPromises);

      setSelectedPack({
        packAddress: packAddress,
        name: packName,
        nftMetadata: nftMetadata
      });
      setShowPackView(true);
      
      // Refresh packs and NFTs after showing animation
      // Wait a bit for blockchain state to update
      setTimeout(() => {
        console.log('🔄 Refreshing packs and NFTs after pack opening...');
        loadPacks();
        loadNfts();
      }, 3000);
    } catch (error) {
      console.error('Error opening pack:', error);
    }
  };

  // Fetch pack NFT metadata when a pack is clicked (for viewing)
  const handlePackClick = async (pack: { 
    packAddress: string; 
    name: string;
    allTokenUris?: string[];
    nftImageUris?: string[];
  }) => {
    if (!publicClient) return;
    
    try {
      // Use token URIs from database if available, otherwise fetch from blockchain
      let tokenURIs: (string | null)[] = [];
      
      if (pack.allTokenUris && pack.allTokenUris.length >= 5) {
        // Use database token URIs (first 5 are the NFTs)
        tokenURIs = pack.allTokenUris.slice(0, 5);
      } else {
        // Fallback: Fetch token URIs from blockchain
        // NFT token IDs are 1-5, not 0-4
        tokenURIs = await Promise.all(
          Array.from({ length: 5 }, (_, i) =>
            publicClient.readContract({
              address: pack.packAddress as `0x${string}`,
              abi: CONTRACTS.packCollectionAbi,
              functionName: 'uri',
              args: [BigInt(i + 1)], // Token IDs are 1-5, not 0-4
            }).catch(() => null)
          )
        );
      }

      // Fetch metadata for each NFT
      const nftMetadataPromises = tokenURIs.map(async (tokenUri, index) => {
        const imageUri = pack.nftImageUris?.[index];
        
        if (!tokenUri || tokenUri === 'ipfs://...' || tokenUri.includes('...')) {
          // Use image from database if available
          const fallbackImage = imageUri 
            ? (imageUri.startsWith('ipfs://') 
                ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '').replace(/^\/+/, '')}`
                : imageUri)
            : '/cardifyN.png';
          
          return {
            name: `NFT ${index + 1}`,
            description: '',
            image: fallbackImage,
            attributes: []
          };
        }

        try {
          let httpUrl = tokenUri as string;
          if (httpUrl.startsWith('ipfs://')) {
            const ipfsHash = httpUrl.replace('ipfs://', '').replace(/^\/+/, '');
            httpUrl = `https://gateway.pinata.cloud/ipfs/${ipfsHash}`;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          try {
            const response = await fetch(httpUrl, { 
              signal: controller.signal,
              headers: { 'Accept': 'application/json' }
            });
            clearTimeout(timeoutId);

            if (response.ok) {
              const metadata = await response.json();
              // Ensure image is set, use imageUri from database as fallback
              if (!metadata.image && imageUri) {
                metadata.image = imageUri.startsWith('ipfs://') 
                  ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '').replace(/^\/+/, '')}`
                  : imageUri;
              }
              return metadata;
            }
          } catch (fetchError) {
            clearTimeout(timeoutId);
            throw fetchError;
          }
        } catch (error) {
          console.warn(`Error fetching metadata for NFT ${index}:`, error);
        }

        // Fallback: use image from database if available
        const fallbackImage = imageUri 
          ? (imageUri.startsWith('ipfs://') 
              ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '').replace(/^\/+/, '')}`
              : imageUri)
          : '/cardifyN.png';

        return {
          name: `NFT ${index + 1}`,
          description: '',
          image: fallbackImage,
          attributes: []
        };
      });

      const nftMetadata = await Promise.all(nftMetadataPromises);

      setSelectedPack({
        packAddress: pack.packAddress,
        name: pack.name,
        nftMetadata: nftMetadata
      });
      setShowPackView(true);
    } catch (error) {
      console.error('Error loading pack contents:', error);
    }
  };

  /* ------------------------------------------------------------------ */
  /* 3/3 – refresh on Sold / Cancelled events                           */
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Sold1155",
    onLogs() { 
      loadNfts(); 
      loadPacks();
    },
  });
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Cancelled1155",
    onLogs() { 
      loadNfts(); 
      loadPacks();
    },
  });
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Listed1155",
    onLogs() { 
      loadNfts(); 
      loadPacks();
    },
  });

  // Watch for pack mint events - refresh packs when new packs are minted
  // Note: We watch all pack collections for Transfer events to token ID 5
  useEffect(() => {
    if (!address || !publicClient || !CONTRACTS.packFactory) return;
    
    // Fetch pack addresses and set up watchers
    const setupPackWatchers = async () => {
      try {
        const response = await fetch('/api/packs/active');
        if (!response.ok) return;
        
        const dbPacks = await response.json();
        if (!Array.isArray(dbPacks)) return;
        
        // Set up watchers for each pack collection
        dbPacks.forEach((dbPack: any) => {
          // Watch for Transfer events to the user's address for token ID 5
          // This will trigger when packs are minted or transferred
        });
      } catch (error) {
        console.error('Error setting up pack watchers:', error);
      }
    };
    
    setupPackWatchers();
  }, [address, publicClient]);

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  const loading =
    !ready ||
    singleLoading || erc1155Loading ||
    busy || !show;

  if (loading)                 return <FullPageLoader message="Loading NFTs…"/>;
  if (!address)                return <Empty label="🔗 Connect your wallet to view NFTs." />;
  if (!allCollections.length && !packs.length)  return <Empty label="No Collections Found" />;
  if (!alchemyNfts.length && !packs.length)     return <Empty label="😢 No Cardify NFTs or packs owned yet." />;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Your NFTs</h1>
        
        {/* Packs Section */}
        {packs.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-white mb-6">Your Packs</h2>
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {packs.map((pack) => (
                <DashboardPackCard
                  key={pack.uniqueId || pack.packAddress}
                  pack={pack}
                  onView={() => handlePackClick(pack)}
                  onOpen={handleOpenPack}
                  onListed={() => {
                    loadPacks();
                    loadNfts();
                  }}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* NFTs Section */}
        {alchemyNfts.length > 0 && (
          <div>
            {packs.length > 0 && <h2 className="text-2xl font-bold text-white mb-6">Your NFTs</h2>}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alchemyNfts.map(nft => (
            <AlchemyNFTCard key={nft.uniqueId} nft={nft}/>
          ))}
        </div>
      </div>
        )}
      </div>

      {/* Pack View Modal */}
      {selectedPack && (
        <PackOpeningAnimation
          isOpen={showPackView}
          onClose={() => {
            setShowPackView(false);
            setSelectedPack(null);
            // Refresh packs and NFTs when animation closes
            console.log('🔄 Refreshing packs and NFTs after closing pack animation...');
            setTimeout(() => {
              loadPacks();
              loadNfts();
            }, 500);
          }}
          nftMetadata={selectedPack.nftMetadata}
          packName={selectedPack.name}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
function Empty({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-2xl text-zinc-400">{label}</p>
    </div>
  );
}
