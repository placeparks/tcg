"use client";

import { useEffect, useState, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useAccount,
  useReadContract,
  usePublicClient,
  useWatchContractEvent,
} from "wagmi";

import FullPageLoader     from "@/components/FullPageLoader";
import AlchemyNFTCard     from "@/components/AlchemyNFTCard";
import { CONTRACTS }      from "@/lib/contract";
import { getNFTsForOwner, AlchemyNFT } from "@/lib/alchemy";
import PackOpeningAnimation from "@/components/PackOpeningAnimation";
import DashboardPackCard from "@/components/DashboardPackCard";

const CHAIN_ID = 84532; // Base-Sepolia

export default function Dashboard() {
  const { ready }     = usePrivy();
  const { address }   = useAccount();
  const publicClient  = usePublicClient({ chainId: CHAIN_ID });

  const [busy,  setBusy ] = useState(false);
  const [show,  setShow ] = useState(false);

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
    packTokenId: bigint;
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

  const {
    data: singleTotal,
    isPending: singleLoading,
  } = useReadContract({
    address:      CONTRACTS.singleFactory,
    abi:          CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query:        { enabled: !!address },
  });

  const {
    data: erc1155Total,
    isPending: erc1155Loading,
  } = useReadContract({
    address:      CONTRACTS.factoryERC1155,
    abi:          CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query:        { enabled: !!address },
  });

  // Load packs from database and check balances
  const loadPacks = useCallback(async () => {
    if (!address || !publicClient) return;
    
    try {
      const response = await fetch('/api/packs/active');
      if (!response.ok) return;
      
      const dbPacks = await response.json();
      if (!Array.isArray(dbPacks)) return;
      
      console.log(`🔍 Checking pack balances for wallet: ${address}`);
      const packBalances = await Promise.all(
        dbPacks.map(async (dbPack: any) => {
          try {
            // Check token ID 0 (unopened pack token)
            const balance = await publicClient.readContract({
              address: dbPack.collection_address as `0x${string}`,
              abi: CONTRACTS.packCollectionAbi,
              functionName: 'balanceOf',
              args: [address as `0x${string}`, 0n],
            }).catch(() => 0n) as bigint;
            
            console.log(`  📦 Pack "${dbPack.name}": balance = ${balance.toString()}`);
            
            // Only return pack data if balance > 0
            if (balance > 0n) {
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
                packTokenId: 0n, // Pack is always token ID 0
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
      const expandedPacks: Array<typeof packBalances[0] & { uniqueId: string }> = [];
      let totalUnopenedPacks = 0;
      
      packBalances.forEach((pack) => {
        if (pack) {
          const count = Number(pack.balance);
          totalUnopenedPacks += count;
          for (let i = 0; i < count; i++) {
            expandedPacks.push({
              ...pack,
              uniqueId: `${pack.packAddress}-0-${i}`,
            } as any);
          }
        }
      });
      
      console.log(`📊 Total unopened packs: ${totalUnopenedPacks}, displaying ${expandedPacks.length} cards\n`);
      
      setPacks(expandedPacks.filter(Boolean) as any);
    } catch (error) {
      console.error('Error fetching packs:', error);
    }
  }, [address, publicClient]);

  useEffect(() => { 
    loadPacks(); 
  }, [loadPacks]);

  // Load collection addresses
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

      // Add pack collection addresses
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
        console.error('Error fetching pack collections:', error);
      }

      setAllCollections(list);
    })();
  }, [singleTotal, erc1155Total, publicClient]);

  // Load NFTs
  const loadNfts = useCallback(async () => {
    if (!ready || !address || !allCollections.length) return;

    setBusy(true);
    setShow(false);

    try {
      // Get pack collection addresses
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
        console.error('Error fetching pack collections:', error);
      }

      const raw = await getNFTsForOwner(address, allCollections);

      // Pack collections: Token ID 0 is the pack, Token IDs 1+ are the NFT cards
      // We need to get cardCount from each pack contract to know the valid range
      const packTokenIdMap = new Map<string, { packTokenId: bigint; cardCount: bigint }>();
      
      // Fetch cardCount for each pack collection
      if (packCollectionAddresses.size > 0 && publicClient) {
        await Promise.all(Array.from(packCollectionAddresses).map(async (packAddress) => {
          try {
            const cardCount = await publicClient.readContract({
              address: packAddress as `0x${string}`,
              abi: CONTRACTS.packCollectionAbi,
              functionName: 'cardCount',
            }).catch(() => 0n) as bigint;
            
            packTokenIdMap.set(packAddress.toLowerCase(), { 
              packTokenId: 0n, 
              cardCount: cardCount
            });
          } catch (error) {
            console.warn(`Failed to get cardCount for ${packAddress}:`, error);
            // Default to allowing all non-zero token IDs if we can't fetch cardCount
            packTokenIdMap.set(packAddress.toLowerCase(), { 
              packTokenId: 0n, 
              cardCount: 0n // 0 means no limit
            });
          }
        }));
      }

      const factories = new Set(allCollections.map(c => c.toLowerCase()));
      const kept      = raw.filter(nft => {
        const isFromFactory = factories.has(nft.contract.address.toLowerCase());
        if (!isFromFactory) return false;
        
        // If NFT is from a pack collection, filter out the pack token (ID 0)
        const isFromPackCollection = packCollectionAddresses.has(nft.contract.address.toLowerCase());
        if (isFromPackCollection) {
          const tokenId = BigInt(nft.tokenId);
          const tokenIdInfo = packTokenIdMap.get(nft.contract.address.toLowerCase());
          
          // Filter out the pack token ID (0)
          if (tokenId === 0n) return false;
          
          // If we have cardCount info, only allow token IDs 1 to cardCount
          if (tokenIdInfo && tokenIdInfo.cardCount > 0n) {
            return tokenId >= 1n && tokenId <= tokenIdInfo.cardCount;
          }
          
          // If no cardCount info, allow all non-zero token IDs
          return tokenId > 0n;
        }
        
        return true;
      });

      // Build URI map from database
      const packUriMap = new Map<string, Map<number, { uri: string; imageUri?: string }>>();
      if (packCollectionAddresses.size > 0) {
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
                    nftImageUris = JSON.parse(dbPack.nft_image_uris || '[]') as string[];
                  } catch (e) {
                    console.warn(`Failed to parse URIs for ${collectionLower}`);
                  }
                  
                  // Map token IDs to array indices
                  // allTokenUris[0] = pack URI, allTokenUris[1+] = card URIs
                  // So token ID 1 = index 1, token ID 2 = index 2, etc.
                  const tokenIdMap = new Map<number, { uri: string; imageUri?: string }>();
                  // Process all available token URIs (skip index 0 which is the pack)
                  for (let i = 1; i < allTokenUris.length; i++) {
                    const tokenId = i; // Token ID matches the index (since pack is at 0)
                    if (allTokenUris[i]) {
                      tokenIdMap.set(tokenId, {
                        uri: allTokenUris[i],
                        imageUri: nftImageUris[i - 1] || undefined // nftImageUris doesn't include pack, so index is i-1
                      });
                    }
                  }
                  
                  if (tokenIdMap.size > 0) {
                    packUriMap.set(collectionLower, tokenIdMap);
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

      // Process NFTs and override metadata for pack NFTs
      const expanded: AlchemyNFT[] = [];
      const processedNfts = await Promise.all(kept.map(async (nft) => {
        const count = nft.tokenType === "ERC1155" ? Number((nft as any).balance ?? 1) : 1;
        
        let nftToAdd = { ...nft };
        const collectionLower = nft.contract.address.toLowerCase();
        const tokenIdNum = Number(nft.tokenId);
        const isPackCollection = packCollectionAddresses.has(collectionLower);
        
        // For pack collections, handle any card token ID (1 to cardCount)
        if (isPackCollection && tokenIdNum >= 1) {
          const uriMap = packUriMap.get(collectionLower);
          let uriData = uriMap?.get(tokenIdNum);
          
          // If URI not in database map, try fetching from contract
          if (!uriData && publicClient) {
            try {
              const contractUri = await publicClient.readContract({
                address: nft.contract.address as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: 'uri',
                args: [BigInt(tokenIdNum)],
              }).catch(() => null);
              
              if (contractUri) {
                uriData = { uri: contractUri as string };
              }
            } catch (error) {
              console.warn(`Error fetching URI from contract for token ID ${tokenIdNum}:`, error);
            }
          }
          
          if (uriData && uriData.uri) {
            try {
              const metadataResponse = await fetch(`/api/ipfs-metadata?src=${encodeURIComponent(uriData.uri)}&tokenId=${tokenIdNum}`);
              if (metadataResponse.ok) {
                const metadata = await metadataResponse.json();
                
                nftToAdd = {
                  ...nftToAdd,
                  name: metadata.name || nftToAdd.name || `NFT #${tokenIdNum}`,
                  raw: {
                    ...nftToAdd.raw,
                    metadata: {
                      ...nftToAdd.raw?.metadata,
                      name: metadata.name,
                      description: metadata.description,
                      image: metadata.imageUrl || uriData.imageUri,
                      attributes: metadata.attributes || []
                    },
                    tokenUri: {
                      raw: uriData.uri,
                      gateway: uriData.uri.startsWith('ipfs://') 
                        ? `https://gateway.pinata.cloud/ipfs/${uriData.uri.replace('ipfs://', '')}`
                        : uriData.uri
                    }
                  },
                  tokenUri: uriData.uri,
                  image: {
                    cachedUrl: metadata.imageUrl || uriData.imageUri,
                    originalUrl: metadata.imageUrl || uriData.imageUri
                  }
                };
              }
            } catch (error) {
              console.warn(`Error fetching metadata for token ID ${tokenIdNum}:`, error);
            }
          }
        }
        
        const expandedForThisNft: AlchemyNFT[] = [];
        for (let i = 0; i < count; i++) {
          expandedForThisNft.push({ 
            ...nftToAdd, 
            uniqueId: `${nftToAdd.contract.address}-${nftToAdd.tokenId}-${i}` 
          });
        }
        return expandedForThisNft;
      }));
      
      expanded.push(...processedNfts.flat());
      setAlchemyNfts(expanded);
    } catch (err) {
      console.error("NFT fetch failed:", err);
      setAlchemyNfts([]);
    } finally {
      setBusy(false);
      setTimeout(() => setShow(true), 200);
    }
  }, [ready, address, allCollections, publicClient]);

  useEffect(() => { 
    loadNfts();
    loadPacks();
  }, [loadNfts, loadPacks]);

  // Handle opening a pack
  const handleOpenPack = async (packAddress: string, packName: string) => {
    if (!publicClient || !address) return;
    
    try {
      const pack = packs.find(p => p.packAddress === packAddress);
      if (!pack) return;

      // Get packSize and cardCount from contract to know how many cards to expect
      const [cardCount, packSize] = await Promise.all([
        publicClient.readContract({
          address: packAddress as `0x${string}`,
          abi: CONTRACTS.packCollectionAbi,
          functionName: 'cardCount',
        }).catch(() => 0n) as Promise<bigint>,
        publicClient.readContract({
          address: packAddress as `0x${string}`,
          abi: CONTRACTS.packCollectionAbi,
          functionName: 'packSize',
        }).catch(() => 0n) as Promise<bigint>,
      ]);

      console.log(`📦 Pack info: cardCount=${cardCount}, packSize=${packSize}`);

      // Validate cardCount
      if (cardCount === 0n) {
        console.error('Invalid cardCount: 0. Contract may not be initialized.');
        setSelectedPack({
          packAddress: packAddress,
          name: packName,
          nftMetadata: []
        });
        setShowPackView(true);
        return;
      }

      // Wait a moment for the transaction to be mined and state to update
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check balance for all possible card token IDs (1 to cardCount)
      // to find which random cards were actually minted
      const cardCountNum = Number(cardCount);
      
      if (cardCountNum === 0 || cardCountNum > 10000) {
        console.error(`Invalid cardCount: ${cardCountNum}`);
        setSelectedPack({
          packAddress: packAddress,
          name: packName,
          nftMetadata: []
        });
        setShowPackView(true);
        return;
      }
      
      const allCardIds = Array.from({ length: cardCountNum }, (_, i) => BigInt(i + 1));
      
      // Limit batch size to avoid RPC timeouts (max 100 at a time)
      const BATCH_SIZE = 100;
      const receivedCardIds: bigint[] = [];
      
      console.log(`🔍 Checking balances for ${cardCountNum} possible cards...`);
      
      for (let i = 0; i < allCardIds.length; i += BATCH_SIZE) {
        const batchIds = allCardIds.slice(i, i + BATCH_SIZE);
        const accounts = Array(batchIds.length).fill(address);
        
        try {
          const balances = await Promise.race([
            publicClient.readContract({
              address: packAddress as `0x${string}`,
              abi: CONTRACTS.packCollectionAbi,
              functionName: 'balanceOfBatch',
              args: [accounts as `0x${string}`[], batchIds],
            }),
            new Promise<bigint[]>((_, reject) => 
              setTimeout(() => reject(new Error('Balance query timeout')), 15000)
            )
          ]) as bigint[];

          // Find which card token IDs the user actually received (balance > 0)
          for (let j = 0; j < batchIds.length; j++) {
            if (balances[j] > 0n) {
              receivedCardIds.push(batchIds[j]);
            }
          }
        } catch (error) {
          console.warn(`Error checking balances for batch ${i}-${i + BATCH_SIZE}:`, error);
          // Continue with next batch even if one fails
        }
      }

      console.log(`🎴 Received ${receivedCardIds.length} cards:`, receivedCardIds.map(id => id.toString()));

      // If we didn't find any cards, try checking again after a longer delay
      if (receivedCardIds.length === 0) {
        console.warn('⚠️ No cards found on first check. Waiting longer and retrying...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        console.log(`🔄 Retrying balance check for ${cardCountNum} cards...`);
        
        // Retry with smaller batches
        receivedCardIds.length = 0;
        for (let i = 0; i < allCardIds.length; i += BATCH_SIZE) {
          const batchIds = allCardIds.slice(i, i + BATCH_SIZE);
          const accounts = Array(batchIds.length).fill(address);
          
          try {
            const retryBalances = await Promise.race([
              publicClient.readContract({
                address: packAddress as `0x${string}`,
                abi: CONTRACTS.packCollectionAbi,
                functionName: 'balanceOfBatch',
                args: [accounts as `0x${string}`[], batchIds],
              }),
              new Promise<bigint[]>((_, reject) => 
                setTimeout(() => reject(new Error('Balance query timeout')), 15000)
              )
            ]) as bigint[];

            for (let j = 0; j < batchIds.length; j++) {
              if (retryBalances[j] > 0n) {
                receivedCardIds.push(batchIds[j]);
              }
            }
          } catch (error) {
            console.warn(`Error retrying balances for batch ${i}-${i + BATCH_SIZE}:`, error);
          }
        }
      }

      // Get URIs for the cards that were actually received
      const tokenURIs = await Promise.all(
        receivedCardIds.map((tokenId) =>
          publicClient.readContract({
            address: packAddress as `0x${string}`,
            abi: CONTRACTS.packCollectionAbi,
            functionName: 'uri',
            args: [tokenId],
          }).catch(() => null)
        )
      );

      // Fetch metadata for each received card
      const nftMetadataPromises = tokenURIs.map(async (tokenUri, index) => {
        const tokenId = Number(receivedCardIds[index]);
        
        if (!tokenUri || tokenUri === 'ipfs://...' || tokenUri.includes('...')) {
          return {
            name: `Card #${tokenId}`,
            description: '',
            image: '/cardifyN.png',
            attributes: []
          };
        }

        try {
          let httpUrl = tokenUri as string;
          if (httpUrl.startsWith('ipfs://')) {
            httpUrl = `https://gateway.pinata.cloud/ipfs/${httpUrl.replace('ipfs://', '')}`;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(httpUrl, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const metadata = await response.json();
            return metadata;
          }
        } catch (error) {
          console.warn(`Error fetching metadata for token ID ${tokenId}:`, error);
        }

        return {
          name: `Card #${tokenId}`,
          description: '',
          image: '/cardifyN.png',
          attributes: []
        };
      });

      const nftMetadata = await Promise.all(nftMetadataPromises);

      console.log(`✅ Final nftMetadata:`, nftMetadata);
      console.log(`📊 Number of cards to display:`, nftMetadata.length);

      // If no cards found, show a message or placeholder
      if (nftMetadata.length === 0) {
        console.warn('⚠️ No cards found after opening pack. Showing placeholder.');
        // Show placeholder cards based on packSize
        const placeholderCards = Array.from({ length: Number(packSize || 5n) }, (_, i) => ({
          name: `Card #${i + 1}`,
          description: 'Card metadata loading...',
          image: '/cardifyN.png',
          attributes: []
        }));
        
        setSelectedPack({
          packAddress: packAddress,
          name: packName,
          nftMetadata: placeholderCards
        });
      } else {
        setSelectedPack({
          packAddress: packAddress,
          name: packName,
          nftMetadata: nftMetadata
        });
      }
      
      setShowPackView(true);
      
      setTimeout(() => {
        loadPacks();
        loadNfts();
      }, 3000);
    } catch (error) {
      console.error('Error opening pack:', error);
      // Even on error, show something so user knows the pack was opened
      setSelectedPack({
        packAddress: packAddress,
        name: packName,
        nftMetadata: [{
          name: 'Pack Opened',
          description: 'Cards are being processed. Please refresh to see your new cards.',
          image: '/cardifyN.png',
          attributes: []
        }]
      });
      setShowPackView(true);
    }
  };

  // Handle viewing pack contents
  const handlePackClick = async (pack: { 
    packAddress: string; 
    name: string;
    allTokenUris?: string[];
    nftImageUris?: string[];
  }) => {
    if (!publicClient) return;
    
    try {
      const cardTokenIds = [1n, 2n, 3n, 4n, 5n];
      let tokenURIs: (string | null)[] = [];
      
      if (pack.allTokenUris && pack.allTokenUris.length === 6) {
        // Database has: [nft1, nft2, nft3, nft4, nft5, packCover]
        // We need indices 0-4 (first 5 items)
        tokenURIs = pack.allTokenUris.slice(0, 5);
      } else if (pack.allTokenUris && pack.allTokenUris.length >= 5) {
        tokenURIs = pack.allTokenUris.slice(0, 5);
      } else {
        tokenURIs = await Promise.all(
          cardTokenIds.map((tokenId) =>
            publicClient.readContract({
              address: pack.packAddress as `0x${string}`,
              abi: CONTRACTS.packCollectionAbi,
              functionName: 'uri',
              args: [tokenId],
            }).catch(() => null)
          )
        );
      }

      const nftMetadataPromises = tokenURIs.map(async (tokenUri, index) => {
        const tokenId = Number(cardTokenIds[index]); // 1, 2, 3, 4, 5
        // nftImageUris array: [img1, img2, img3, img4, img5]
        // Use index directly (0-4) since arrays are parallel
        const imageUriIndex = index;
        const imageUri = pack.nftImageUris?.[imageUriIndex];
        
        if (!tokenUri || tokenUri === 'ipfs://...' || tokenUri.includes('...')) {
          const fallbackImage = imageUri 
            ? (imageUri.startsWith('ipfs://') 
                ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '')}`
                : imageUri)
            : '/cardifyN.png';
          
          return {
            name: `NFT ${tokenId}`,
            description: '',
            image: fallbackImage,
            attributes: []
          };
        }

        try {
          let httpUrl = tokenUri as string;
          if (httpUrl.startsWith('ipfs://')) {
            httpUrl = `https://gateway.pinata.cloud/ipfs/${httpUrl.replace('ipfs://', '')}`;
          }

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000);

          const response = await fetch(httpUrl, { 
            signal: controller.signal,
            headers: { 'Accept': 'application/json' }
          });
          clearTimeout(timeoutId);

          if (response.ok) {
            const metadata = await response.json();
            if (!metadata.image && imageUri) {
              metadata.image = imageUri.startsWith('ipfs://') 
                ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '')}`
                : imageUri;
            }
            return metadata;
          }
        } catch (error) {
          console.warn(`Error fetching metadata for token ID ${tokenId}:`, error);
        }

        const fallbackImage = imageUri 
          ? (imageUri.startsWith('ipfs://') 
              ? `https://gateway.pinata.cloud/ipfs/${imageUri.replace('ipfs://', '')}`
              : imageUri)
          : '/cardifyN.png';

        return {
          name: `NFT ${tokenId}`,
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

  // Event watchers
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

  const loading = !ready || singleLoading || erc1155Loading || busy || !show;

  if (loading) return <FullPageLoader message="Loading NFTs…"/>;
  if (!address) return <Empty label="🔗 Connect your wallet to view NFTs." />;
  if (!allCollections.length && !packs.length) return <Empty label="No Collections Found" />;
  if (!alchemyNfts.length && !packs.length) return <Empty label="😢 No Cardify NFTs or packs owned yet." />;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Your NFTs</h1>
        
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

      {selectedPack && (
        <PackOpeningAnimation
          isOpen={showPackView}
          onClose={() => {
            setShowPackView(false);
            setSelectedPack(null);
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

function Empty({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-2xl text-zinc-400">{label}</p>
    </div>
  );
}
