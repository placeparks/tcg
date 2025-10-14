// app/[nft]/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWriteContract,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { useParams, useRouter } from "next/navigation";
import { parseEther, decodeErrorResult } from "viem";
import toast from "react-hot-toast";
import { CONTRACTS } from "@/lib/contract";
import { Sparkles } from "lucide-react";

import useEnsureBaseSepolia, {
  BASE_SEPOLIA,
} from "@/hooks/useEnsureNetwork";
import FullPageLoader from "@/components/FullPageLoader";
import { Button } from "@/components/ui/button";

/* ─── constants ─── */
const CHAIN_ID = 84532;       

const IPFS_GATEWAYS = [
  "https://gateway.pinata.cloud/ipfs/",
  "https://cloudflare-ipfs.com/ipfs/",
  "https://ipfs.io/ipfs/",
  "https://w3s.link/ipfs/"
];

const ipfsToHttp = (u: string) => {
  if (u.startsWith('ipfs://')) {
    return u.replace(/^ipfs:\/\//, IPFS_GATEWAYS[0]);
  }
  if (u.startsWith('https://') || u.startsWith('http://')) {
    return u;
  }
  // If it's just a CID or path, assume it needs the gateway prefix
  if (u.startsWith('Qm') || u.startsWith('baf')) {
    return `${IPFS_GATEWAYS[0]}${u}`;
  }
  return u;
};

const tryMultipleGateways = async (originalUri: string) => {
  const urls = IPFS_GATEWAYS.map(gateway => {
    if (originalUri.startsWith('ipfs://')) {
      return originalUri.replace(/^ipfs:\/\//, gateway);
    }
    if (originalUri.startsWith('Qm') || originalUri.startsWith('baf')) {
      return `${gateway}${originalUri}`;
    }
    return originalUri;
  });

  for (const url of urls) {
    try {
      console.log('🔍 Trying gateway:', url);
      const response = await fetch(url);
      if (response.ok) {
        console.log('✅ Success with gateway:', url);
        return response;
      }
    } catch (error) {
      console.log('❌ Gateway failed:', url, error);
    }
  }
  throw new Error('All IPFS gateways failed');
};

export default function ListingPage() {
  /* enforce network globally */
  useEnsureBaseSepolia();

  const { nft, id } = useParams();
  const router       = useRouter();

  const [price,    setPrice]    = useState("");
  const [metadata, setMetadata] = useState<{ image?: string; name?: string } | null>(null);
  const [busy,     setBusy]     = useState(false);

  const { address }            = useAccount();
  const chainId                = useChainId();
  const { switchChainAsync }   = useSwitchChain();
  const { writeContractAsync } = useWriteContract();
  const publicClient           = usePublicClient({ chainId: CHAIN_ID })!;

  const tokenId = BigInt(id as string);
  const nftAddr = nft as `0x${string}`;

  /* tokenURI - using ERC1155 uri instead */
  const { data: tokenUri } = useReadContract({
    address: nftAddr,
    abi:     CONTRACTS.nft1155Abi, // Using ERC1155 ABI instead of commented out nftAbi
    functionName: "uri", // ERC1155 uses uri instead of tokenURI
    args:   [tokenId],
  });

  /* fetch metadata */
  useEffect(() => {
    if (!tokenUri) return;
    setBusy(true);
    console.log('🔍 Fetching metadata from URI:', tokenUri);
    
    const fetchMetadata = async () => {
      try {
        // First try the primary gateway
        const metadataUrl = ipfsToHttp(tokenUri as string);
        console.log('🔍 Converted to HTTP URL:', metadataUrl);
        
        const response = await fetch(metadataUrl);
        console.log('🔍 Metadata fetch response:', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          url: response.url
        });
        
        if (response.ok) {
          // Check content type before parsing
          const contentType = response.headers.get('content-type');
          console.log('🔍 Response content type:', contentType);
          
          // Check if it's an image or other binary content first
          if (contentType && (contentType.includes('image/') || contentType.includes('video/') || contentType.includes('audio/'))) {
            console.log('🔍 Content appears to be binary (image/video/audio), not JSON metadata');
            console.log('🔍 Creating fallback metadata with image URL');
            
            // Create fallback metadata when IPFS points directly to an image
            const fallbackMetadata = {
              name: `NFT #${tokenId.toString()}`,
              description: `Token ID: ${tokenId.toString()}`,
              image: response.url, // Use the IPFS URL as the image
              external_url: response.url
            };
            
            console.log('🔍 Fallback metadata created:', fallbackMetadata);
            setMetadata(fallbackMetadata);
            return;
          }
          
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Response is not JSON, content type:', contentType);
            // Try to get text first to see what we're dealing with
            const text = await response.text();
            console.log('🔍 Raw response text:', text.substring(0, 200) + '...');
            
            // Try to parse as JSON anyway (sometimes content-type is wrong)
            try {
              const data = JSON.parse(text);
              console.log('🔍 Metadata data received:', data);
              setMetadata(data);
              return;
            } catch (parseError) {
              console.error('❌ Failed to parse as JSON:', parseError);
              throw new Error(`Invalid JSON response. Content type: ${contentType}. Raw content preview: ${text.substring(0, 100)}`);
            }
          }
          
          const data = await response.json();
          console.log('🔍 Metadata data received:', data);
          setMetadata(data);
          return;
        }
        
        // If primary gateway fails, try multiple gateways
        console.log('🔄 Primary gateway failed, trying multiple gateways...');
        const fallbackResponse = await tryMultipleGateways(tokenUri as string);
        
        // Check content type for fallback response too
        const fallbackContentType = fallbackResponse.headers.get('content-type');
        console.log('🔍 Fallback response content type:', fallbackContentType);
        
        // Check if fallback is also an image first
        if (fallbackContentType && (fallbackContentType.includes('image/') || fallbackContentType.includes('video/') || fallbackContentType.includes('audio/'))) {
          console.log('🔍 Fallback content is also binary, creating fallback metadata');
          
          const fallbackMetadata = {
            name: `NFT #${tokenId.toString()}`,
            description: `Token ID: ${tokenId.toString()}`,
            image: fallbackResponse.url,
            external_url: fallbackResponse.url
          };
          
          console.log('🔍 Fallback metadata created:', fallbackMetadata);
          setMetadata(fallbackMetadata);
          return;
        }
        
        if (!fallbackContentType || !fallbackContentType.includes('application/json')) {
          console.warn('⚠️ Fallback response is not JSON, content type:', fallbackContentType);
          const text = await fallbackResponse.text();
          console.log('🔍 Raw fallback response text:', text.substring(0, 200) + '...');
          
          try {
            const data = JSON.parse(text);
            console.log('🔍 Metadata data received from fallback:', data);
            setMetadata(data);
            return;
          } catch (parseError) {
            console.error('❌ Failed to parse fallback as JSON:', parseError);
            throw new Error(`Invalid JSON response from fallback. Content type: ${fallbackContentType}`);
          }
        }
        
        const data = await fallbackResponse.json();
        console.log('🔍 Metadata data received from fallback:', data);
        setMetadata(data);
        
      } catch (error: any) {
        console.error('❌ Failed to load metadata:', error);
        console.error('❌ Token URI:', tokenUri);
        toast.error(`Failed to load metadata: ${error?.message || 'Unknown error'}`);
      } finally {
        setBusy(false);
      }
    };
    
    fetchMetadata();
  }, [tokenUri]);

  /* ---------------- list flow ---------------- */
  async function listItem() {
    if (!price || isNaN(Number(price))) {
      toast.error("Enter a valid price");
      return;
    }
    if (!address) {
      toast.error("Connect a wallet");
      return;
    }

    /* if user manually changed networks, prompt a switch */
    if (chainId !== BASE_SEPOLIA) {
      try { 
        console.log('🔍 Switching to Base-Sepolia chain...');
        await switchChainAsync({ chainId: BASE_SEPOLIA }); 
        console.log('✅ Successfully switched to Base-Sepolia');
      }
      catch (error) { 
        console.error('❌ Failed to switch chain:', error);
        toast.error("Please switch to Base-Sepolia"); 
        return; 
      }
    }

    console.log('🔍 Starting listing process with:', {
      address,
      chainId,
      nftAddr,
      tokenId: tokenId.toString(),
      price
    });

    try {
      setBusy(true);
      toast.loading("Checking approval…", { id: "tx" });

      // Check approval - try both ERC1155 and ERC721
      let approved = false;
      let detectedTokenType = 'ERC1155'; // Default assumption
      
      try {
        // Try ERC1155 isApprovedForAll first
        approved = (await publicClient.readContract({
        address: nftAddr,
          abi: CONTRACTS.nft1155Abi,
        functionName: "isApprovedForAll",
        args: [address, CONTRACTS.marketplace],
      })) as boolean;
        console.log('🔍 ERC1155 approval status:', approved);
      } catch (erc1155ApprovalErr) {
        console.log('🔍 Not ERC1155, trying ERC721 getApproved');
        try {
          // Try ERC721 getApproved
          const approvedAddress = await publicClient.readContract({
            address: nftAddr,
            abi: [
              {
                "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                "name": "getApproved",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: "getApproved",
            args: [tokenId],
          });
          approved = approvedAddress.toLowerCase() === CONTRACTS.marketplace.toLowerCase();
          detectedTokenType = 'ERC721';
          console.log('🔍 ERC721 approval status:', approved, 'approved address:', approvedAddress);
        } catch (erc721ApprovalErr) {
          console.error('❌ Could not check approval with either ERC1155 or ERC721:', { erc1155ApprovalErr, erc721ApprovalErr });
          // Assume ERC1155 and proceed
          console.log('🔍 Assuming ERC1155 and proceeding...');
        }
      }

      if (!approved) {
        toast.loading("Approving NFT…", { id: "tx" });
        if (detectedTokenType === 'ERC721') {
          console.log('🔍 Setting ERC721 approval...');
          try {
            await writeContractAsync({
              address: nftAddr,
              abi: [
                {
                  "inputs": [
                    {"internalType": "address", "name": "to", "type": "address"},
                    {"internalType": "uint256", "name": "tokenId", "type": "uint256"}
                  ],
                  "name": "approve",
                  "outputs": [],
                  "stateMutability": "nonpayable",
                  "type": "function"
                }
              ],
              functionName: "approve",
              args: [CONTRACTS.marketplace, tokenId],
            });
            console.log('✅ ERC721 approval set successfully');
          } catch (approvalError: any) {
            console.error('❌ ERC721 approval failed:', approvalError);
            throw new Error(`Failed to set ERC721 approval: ${approvalError?.message || 'Unknown error'}`);
          }
        } else {
          console.log('🔍 Setting approval for all (ERC1155)...');
          try {
            await writeContractAsync({
              address: nftAddr,
              abi: CONTRACTS.nft1155Abi,
              functionName: "setApprovalForAll",
              args: [CONTRACTS.marketplace, true],
            });
            console.log('✅ ERC1155 approval set successfully');
          } catch (approvalError: any) {
            console.error('❌ ERC1155 approval failed:', approvalError);
            throw new Error(`Failed to set approval: ${approvalError?.message || 'Unknown error'}`);
          }
        }
      }

      // Check if user owns the NFT and has enough balance
      toast.loading("Checking NFT ownership…", { id: "tx" });
      
      try {
        // First try ERC1155 balanceOf
        let balance;
        let isERC721 = false;
        
        try {
          balance = await publicClient.readContract({
            address: nftAddr,
            abi: CONTRACTS.nft1155Abi,
            functionName: "balanceOf",
            args: [address, tokenId],
          });
          console.log('🔍 ERC1155 balance:', balance);
          
          // If ERC1155 balance is 0, try ERC721 ownerOf as fallback
          if (balance === 0n) {
            console.log('🔍 ERC1155 balance is 0, trying ERC721 ownerOf as fallback');
            try {
              const owner = await publicClient.readContract({
                address: nftAddr,
                abi: [
                  {
                    "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                    "name": "ownerOf",
                    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                  }
                ],
                functionName: "ownerOf",
                args: [tokenId],
              });
              console.log('🔍 ERC721 owner:', owner);
              if (owner.toLowerCase() === address.toLowerCase()) {
                balance = 1n;
                isERC721 = true;
                console.log('🔍 Found ownership via ERC721 ownerOf');
              }
            } catch (erc721FallbackErr) {
              console.log('🔍 ERC721 fallback also failed:', erc721FallbackErr);
              
              // Try alternative ownership checks
              console.log('🔍 Trying alternative ownership verification methods...');
              
              // Try to check if the token exists at all
              try {
                const tokenExists = await publicClient.readContract({
                  address: nftAddr,
                  abi: [
                    {
                      "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                      "name": "exists",
                      "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
                      "stateMutability": "view",
                      "type": "function"
                    }
                  ],
                  functionName: "exists",
                  args: [tokenId],
                });
                console.log('🔍 Token exists check:', tokenExists);
              } catch (existsErr) {
                console.log('🔍 Token exists check failed:', existsErr);
                
                // Try to check maxSupply and totalMinted for your contracts
                try {
                  const maxSupply = await publicClient.readContract({
                    address: nftAddr,
                    abi: [
                      {
                        "inputs": [],
                        "name": "maxSupply",
                        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                        "stateMutability": "view",
                        "type": "function"
                      }
                    ],
                    functionName: "maxSupply",
                    args: [],
                  });
                  console.log('🔍 Max supply:', maxSupply);
                } catch (maxSupplyErr) {
                  console.log('🔍 Max supply check failed:', maxSupplyErr);
                }
                
                try {
                  const totalMinted = await publicClient.readContract({
                    address: nftAddr,
                    abi: [
                      {
                        "inputs": [],
                        "name": "totalMinted",
                        "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                        "stateMutability": "view",
                        "type": "function"
                      }
                    ],
                    functionName: "totalMinted",
                    args: [],
                  });
                  console.log('🔍 Total minted:', totalMinted);
                } catch (totalMintedErr) {
                  console.log('🔍 Total minted check failed:', totalMintedErr);
                }
              }
              
              // Try to get total supply to see if contract is working
              try {
                const totalSupply = await publicClient.readContract({
                  address: nftAddr,
                  abi: [
                    {
                      "inputs": [],
                      "name": "totalSupply",
                      "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                      "stateMutability": "view",
                      "type": "function"
                    }
                  ],
                  functionName: "totalSupply",
                  args: [],
                });
                console.log('🔍 Total supply:', totalSupply);
              } catch (supplyErr) {
                console.log('🔍 Total supply check failed:', supplyErr);
              }
              
              // Try to check if this is a valid token ID by checking token URI
              try {
                const tokenURI = await publicClient.readContract({
                  address: nftAddr,
                  abi: CONTRACTS.nft1155Abi,
                  functionName: "uri",
                  args: [tokenId],
                });
                console.log('🔍 Token URI:', tokenURI);
              } catch (uriErr) {
                console.log('🔍 Token URI check failed:', uriErr);
              }
              
              // Check if token ID 0 exists (first token in your contracts)
              try {
                const balance0 = await publicClient.readContract({
                  address: nftAddr,
                  abi: CONTRACTS.nft1155Abi,
                  functionName: "balanceOf",
                  args: [address, 0n],
                });
                console.log('🔍 Balance of token ID 0:', balance0);
              } catch (balance0Err) {
                console.log('🔍 Balance of token ID 0 failed:', balance0Err);
              }
              
              // Check if you own any tokens at all by checking a range
              for (let i = 0; i < 5; i++) {
                try {
                  const balance = await publicClient.readContract({
                    address: nftAddr,
                    abi: CONTRACTS.nft1155Abi,
                    functionName: "balanceOf",
                    args: [address, BigInt(i)],
                  });
                  if (balance > 0n) {
                    console.log(`🔍 Found balance > 0 for token ID ${i}:`, balance);
                  }
                } catch (rangeErr) {
                  // Ignore individual errors
                }
              }
            }
          }
        } catch (erc1155Err) {
          console.log('🔍 ERC1155 balanceOf failed, trying ERC721 ownerOf');
          // Try ERC721 ownerOf instead
          try {
            const owner = await publicClient.readContract({
              address: nftAddr,
              abi: [
                {
                  "inputs": [{"internalType": "uint256", "name": "tokenId", "type": "uint256"}],
                  "name": "ownerOf",
                  "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                  "stateMutability": "view",
                  "type": "function"
                }
              ],
              functionName: "ownerOf",
              args: [tokenId],
            });
            console.log('🔍 ERC721 owner:', owner);
            balance = owner.toLowerCase() === address.toLowerCase() ? 1n : 0n;
            isERC721 = true;
          } catch (erc721Err) {
            console.error('❌ Could not check ownership with either ERC1155 or ERC721:', { erc1155Err, erc721Err });
            
            // Try one more approach - check if the contract has any tokens at all
            console.log('🔍 Trying to verify contract functionality...');
            try {
              // Check if contract has any tokens by trying to get the first token
              const firstToken = await publicClient.readContract({
                address: nftAddr,
                abi: [
                  {
                    "inputs": [{"internalType": "uint256", "name": "index", "type": "uint256"}],
                    "name": "tokenByIndex",
                    "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "stateMutability": "view",
                    "type": "function"
                  }
                ],
                functionName: "tokenByIndex",
                args: [0n],
              });
              console.log('🔍 First token by index:', firstToken);
            } catch (tokenByIndexErr) {
              console.log('🔍 Token by index check failed:', tokenByIndexErr);
            }
            
            throw new Error('Could not verify NFT ownership - contract may not be ERC1155 or ERC721');
          }
        }
        
        console.log('🔍 Final balance check:', balance, 'isERC721:', isERC721);
        
        if (balance < 1n) {
          toast.dismiss("tx");
          toast.error("You don't own this NFT or don't have enough balance. Please verify the token ID and contract address.");
          return;
        }
        
        // Update the detected token type for later use
        if (isERC721) {
          detectedTokenType = 'ERC721';
          console.log('🔍 Setting token type to ERC721 for subsequent operations');
        }
      } catch (balanceErr: any) {
        console.error('❌ Could not check NFT balance:', balanceErr);
        toast.dismiss("tx");
        toast.error(`Could not verify NFT ownership: ${balanceErr.message}`);
        return;
      }

      // Check if NFT is already listed
      toast.loading("Checking if NFT is already listed…", { id: "tx" });
      
      try {
        const existingListing = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "listings1155",
          args: [nftAddr, tokenId],
        });
        
        console.log('🔍 Existing listing:', existingListing);
        
        // Check if already listed (has a price > 0)
        if (existingListing && existingListing[1] > 0n) {
          toast.dismiss("tx");
          toast.error("This NFT is already listed for sale");
          return;
        }
      } catch (listingErr: any) {
        console.log('🔍 Could not check existing listing (this is normal for unlisted NFTs):', listingErr);
      }

      // Check if marketplace is paused
      toast.loading("Checking marketplace status…", { id: "tx" });
      
      try {
        const isPaused = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "paused",
        });
        
        console.log('🔍 Marketplace paused status:', isPaused);
        
        if (isPaused) {
          toast.dismiss("tx");
          toast.error("Marketplace is currently paused");
          return;
        }
      } catch (pauseErr: any) {
        console.log('🔍 Could not check pause status (this might be normal):', pauseErr);
      }

      // Check if NFT contract supports the required interface
      toast.loading("Checking NFT contract interface…", { id: "tx" });
      
      try {
        // Try to check if the NFT contract supports ERC1155 interface
        // Use a more generic ABI that includes supportsInterface
        const supportsInterface = await publicClient.readContract({
          address: nftAddr,
          abi: [
            {
              "inputs": [{"internalType": "bytes4", "name": "interfaceId", "type": "bytes4"}],
              "name": "supportsInterface",
              "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: "supportsInterface",
          args: ["0xd9b67a26"], // ERC1155 interface ID
        });
        
        console.log('🔍 NFT supports ERC1155 interface:', supportsInterface);
        
        if (!supportsInterface) {
          toast.dismiss("tx");
          toast.error("This NFT contract doesn't support the required ERC1155 interface");
          return;
        }
      } catch (interfaceErr: any) {
        console.log('🔍 Could not check interface support (contract may not implement ERC165):', interfaceErr);
        // Don't fail here - some contracts may not implement supportsInterface
        // but still work with the marketplace
        console.log('🔍 Proceeding without interface check...');
      }

      // Try to verify this is actually an ERC1155 contract by checking basic functions
      toast.loading("Verifying ERC1155 compatibility…", { id: "tx" });
      
      try {
        // Try to call uri function (basic ERC1155 function)
        const tokenUri = await publicClient.readContract({
          address: nftAddr,
          abi: CONTRACTS.nft1155Abi,
          functionName: "uri",
          args: [tokenId],
        });
        
        console.log('🔍 NFT URI:', tokenUri);
        console.log('🔍 Contract appears to be ERC1155 compatible');
      } catch (uriErr: any) {
        console.log('🔍 Could not verify ERC1155 compatibility:', uriErr);
        // This might be normal for some contracts
        console.log('🔍 Proceeding with listing attempt...');
      }

      // Check if the marketplace recognizes this NFT contract
      toast.loading("Checking marketplace compatibility…", { id: "tx" });
      
      try {
        // Try to read a basic marketplace function to see if it works
        const marketplaceOwner = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "owner",
        });
        
        console.log('🔍 Marketplace owner:', marketplaceOwner);
        console.log('🔍 Marketplace contract is accessible');
      } catch (marketplaceErr: any) {
        console.log('🔍 Could not access marketplace contract:', marketplaceErr);
        toast.dismiss("tx");
        toast.error("Could not access marketplace contract");
        return;
      }

      // PROPER SOLUTION: Check if NFT contract was created by allowed factories
      toast.loading("Validating NFT contract origin…", { id: "tx" });
      
      let isFromAllowedFactory = false;
      let factoryType = '';
      
      try {
        console.log('🔍 Checking if NFT contract was created by allowed factories...');
        
        // Check Factory A (ERC1155 Factory) - Contract A
        try {
          const factoryACollections = await publicClient.readContract({
            address: CONTRACTS.factoryERC1155,
            abi: [
              {
                "inputs": [],
                "name": "getAllCollections",
                "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: "getAllCollections",
          });
          
          console.log('🔍 Factory A collections:', factoryACollections);
          const isInFactoryA = (factoryACollections as string[]).includes(nftAddr.toLowerCase()) || 
                               (factoryACollections as string[]).includes(nftAddr);
          console.log('🔍 NFT contract is in Factory A collections:', isInFactoryA);
          console.log('🔍 Factory A - lowercase match:', (factoryACollections as string[]).includes(nftAddr.toLowerCase()));
          console.log('🔍 Factory A - original case match:', (factoryACollections as string[]).includes(nftAddr));
          
          if (isInFactoryA) {
            isFromAllowedFactory = true;
            factoryType = 'Factory A (ERC1155)';
          }
        } catch (factoryAErr) {
          console.log('🔍 Could not check Factory A collections:', factoryAErr);
        }
        
        // Check Factory B (Single Factory) - Contract B
        if (!isFromAllowedFactory) {
          try {
            const factoryBCollectionsInfo = await publicClient.readContract({
              address: CONTRACTS.singleFactory,
              abi: [
                {
                  "inputs": [],
                  "name": "getAllCollectionsWithInfo",
                  "outputs": [{
                    "internalType": "tuple[]",
                    "name": "",
                    "type": "tuple[]",
                    "components": [
                      {"internalType": "address", "name": "collectionAddress", "type": "address"},
                      {"internalType": "string", "name": "name", "type": "string"},
                      {"internalType": "string", "name": "symbol", "type": "string"},
                      {"internalType": "string", "name": "baseURI", "type": "string"},
                      {"internalType": "uint256", "name": "maxSupply", "type": "uint256"},
                      {"internalType": "uint256", "name": "mintPrice", "type": "uint256"},
                      {"internalType": "address", "name": "owner", "type": "address"}
                    ]
                  }],
                  "stateMutability": "view",
                  "type": "function"
                }
              ],
              functionName: "getAllCollectionsWithInfo",
            });
            
            console.log('🔍 Factory B collections info:', factoryBCollectionsInfo);
            
            // Extract collection addresses from the info array
            const factoryBCollections = (factoryBCollectionsInfo as any[]).map((col: any) => col.collectionAddress);
            console.log('🔍 Factory B collection addresses:', factoryBCollections);
            
            const isInFactoryB = factoryBCollections.includes(nftAddr.toLowerCase()) || 
                                 factoryBCollections.includes(nftAddr);
            console.log('🔍 NFT contract is in Factory B collections:', isInFactoryB);
            console.log('🔍 Checking both cases - lowercase match:', factoryBCollections.includes(nftAddr.toLowerCase()));
            console.log('🔍 Checking both cases - original case match:', factoryBCollections.includes(nftAddr));
            
            if (isInFactoryB) {
              isFromAllowedFactory = true;
              factoryType = 'Factory B (Single)';
            }
          } catch (factoryBErr) {
            console.log('🔍 Could not check Factory B collections:', factoryBErr);
          }
        }
        
        console.log('🔍 Final validation result:', {
          isFromAllowedFactory,
          factoryType,
          nftContract: nftAddr
        });
        
        // Additional debugging to help identify the issue
        console.log('🔍 Debugging info:');
        console.log('🔍 - NFT contract address:', nftAddr);
        console.log('🔍 - NFT contract address (lowercase):', nftAddr.toLowerCase());
        console.log('🔍 - Factory A address:', CONTRACTS.factoryERC1155);
        console.log('🔍 - Factory B address:', CONTRACTS.singleFactory);
        
        if (!isFromAllowedFactory) {
          toast.dismiss("tx");
          toast.error("This NFT contract was not created by any allowed factory");
          return;
        } else {
          console.log('✅ NFT contract validation passed - created by', factoryType);
        }
        
      } catch (validationErr: any) {
        console.log('🔍 Could not validate NFT contract origin:', validationErr);
        toast.dismiss("tx");
        toast.error("Could not validate NFT contract origin");
        return;
      }

      // Check if the marketplace recognizes this NFT contract
      toast.loading("Checking marketplace NFT recognition…", { id: "tx" });
      
      try {
        // Check if the marketplace recognizes this NFT as a valid Cardify NFT
        const isCardify1155 = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: [
            {
              "inputs": [{"internalType": "address", "name": "nft", "type": "address"}],
              "name": "isCardify1155",
              "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
              "stateMutability": "view",
              "type": "function"
            }
          ],
          functionName: "isCardify1155",
          args: [nftAddr],
        });
        
        console.log('🔍 Marketplace recognizes NFT as Cardify1155:', isCardify1155);
        
        if (!isCardify1155) {
          toast.dismiss("tx");
          toast.error("The marketplace does not recognize this NFT contract as a valid Cardify NFT. The marketplace factory configuration may need to be updated.");
          console.log('❌ This is the root cause of the listItem1155 reversion!');
          console.log('❌ The marketplace contract does not recognize your NFT contract as being created by an allowed factory.');
          console.log('❌ You need to update the marketplace factory configuration to include your factory addresses.');
          return;
        }
        
        console.log('✅ Marketplace recognizes the NFT contract');
        
        // Additional debugging: Check what factories are registered in the marketplace
        try {
          const marketplaceFactories = await publicClient.readContract({
            address: CONTRACTS.marketplace,
            abi: [
              {
                "inputs": [],
                "name": "factories1155Count",
                "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: "factories1155Count",
          });
          
          console.log('🔍 Marketplace has', marketplaceFactories.toString(), 'registered 1155 factories');
          
          // Try to get the first few factory addresses
          for (let i = 0; i < Math.min(Number(marketplaceFactories), 5); i++) {
            try {
              const factoryAddress = await publicClient.readContract({
                address: CONTRACTS.marketplace,
                abi: [
                  {
                    "inputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
                    "name": "factories1155",
                    "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                    "stateMutability": "view",
                    "type": "function"
                  }
                ],
                functionName: "factories1155",
                args: [BigInt(i)],
              });
              console.log(`🔍 Marketplace factory ${i}:`, factoryAddress);
            } catch (factoryErr) {
              console.log(`🔍 Could not get factory ${i}:`, factoryErr);
            }
          }
        } catch (factoryCountErr) {
          console.log('🔍 Could not check marketplace factory count:', factoryCountErr);
        }
        
      } catch (recognitionErr: any) {
        console.log('🔍 Could not check marketplace NFT recognition:', recognitionErr);
        toast.dismiss("tx");
        toast.error("Could not verify NFT recognition with marketplace");
        return;
      }

      // Check if there are any other requirements or restrictions
      toast.loading("Checking additional requirements…", { id: "tx" });
      
      try {
        // Check if the marketplace has any other requirements
        const feeDenominator = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "FEE_DENOMINATOR",
        });
        
        console.log('🔍 Marketplace fee denominator:', feeDenominator);
        
        // Check if there are any other restrictions
        const factory721 = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "factory721",
        });
        
        console.log('🔍 Marketplace factory721:', factory721);
        
        // Note: canBuy721 function doesn't exist in the marketplace contract
        // This check has been removed to prevent errors
        
      } catch (addReqErr: any) {
        console.log('🔍 Could not check additional requirements:', addReqErr);
      }

      // Simulate the transaction first to catch errors early
      toast.loading("Validating transaction…", { id: "tx" });
      
      // Use the detected token type for simulation
      console.log('🔍 Validating: Using detected token type:', detectedTokenType);
      console.log('🔍 Validating transaction with NFT contract address:', nftAddr);
      
      try {
        if (detectedTokenType === 'ERC721') {
          await publicClient.simulateContract({
            account: address,
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
            functionName: "listItem721",
            args: [nftAddr, tokenId, parseEther(price)],
          });
        } else {
          await publicClient.simulateContract({
            account: address,
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
            functionName: "listItem1155",
            args: [nftAddr, tokenId, parseEther(price), 1n],
          });
        }
      } catch (simErr: any) {
        console.error('❌ Transaction failed:', simErr);
        console.error('❌ Full error object:', simErr);
        toast.dismiss("tx");
        
        let errorMessage = "Transaction failed";
        try {
          // Try to decode the error from different possible locations
          let errorData = simErr?.data?.data || simErr?.cause?.data || simErr?.data;
          console.log('🔍 Error data found:', errorData);
          
          if (errorData && errorData !== '0x') {
            console.log('🔍 Attempting to decode error data:', errorData);
            const decoded = decodeErrorResult({
              abi: CONTRACTS.marketplaceAbi,
              data: errorData,
            });
            errorMessage = `Cannot list: ${decoded.errorName}`;
            console.log('🔍 Decoded error:', decoded);
          } else {
            // Try to extract error message from the error object
            const errorMsg = simErr?.shortMessage || simErr?.message || simErr?.cause?.message;
            console.log('🔍 Error message found:', errorMsg);
            if (errorMsg) {
              errorMessage = `Transaction failed: ${errorMsg}`;
            } else {
              // Check if it's a specific revert reason
              if (simErr?.cause?.reason) {
                errorMessage = `Cannot list: ${simErr.cause.reason}`;
              } else if (simErr?.reason) {
                errorMessage = `Cannot list: ${simErr.reason}`;
              }
            }
          }
        } catch (decodeErr) {
          console.error('Failed to decode transaction error:', decodeErr);
          console.error('Original error:', simErr);
        }
        
        toast.error(errorMessage);
        return;
      }

      toast.loading("Listing NFT…", { id: "tx" });
      
      // Debug the parameters
      console.log('🔍 Listing parameters:', {
        nftContract: nftAddr,
        tokenId,
        price: parseEther(price),
        amount: 1n,
        marketplace: CONTRACTS.marketplace,
        factoryType: factoryType
      });
      
      // Use the detected token type for listing
      console.log('🔍 Listing: Using detected token type:', detectedTokenType);
      console.log('🔍 Listing: Using validated NFT contract address:', nftAddr);
      
      let hash;
      if (detectedTokenType === 'ERC721') {
        console.log('🔍 Creating ERC721 listing with validated contract');
        
        try {
          hash = await writeContractAsync({
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
            functionName: "listItem721",
            args: [nftAddr, tokenId, parseEther(price)],
          });
          console.log('✅ ERC721 listing transaction submitted:', hash);
        } catch (listingError: any) {
          console.error('❌ ERC721 listing failed:', listingError);
          throw new Error(`Failed to create ERC721 listing: ${listingError?.message || 'Unknown error'}`);
        }
      } else {
        console.log('🔍 Creating ERC1155 listing with validated contract');
        
        try {
          hash = await writeContractAsync({
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
            functionName: "listItem1155",
            args: [nftAddr, tokenId, parseEther(price), 1n],
          });
          console.log('✅ ERC1155 listing transaction submitted:', hash);
        } catch (listingError: any) {
          console.error('❌ ERC1155 listing failed:', listingError);
          throw new Error(`Failed to create ERC1155 listing: ${listingError?.message || 'Unknown error'}`);
        }
      }

      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      if (receipt.status !== "success") {
        console.error('❌ Transaction failed:', receipt);
        throw new Error("Listing reverted");
      }

      toast.dismiss("tx");
      toast.success("NFT listed!");
      router.push("/dashboard");
    } catch (err: any) {
      toast.dismiss("tx");
      console.error('❌ Listing error:', err);
      
      // Try to decode the error for better user feedback
      let errorMessage = err?.shortMessage || err.message || "Transaction failed";
      
      try {
        if (err?.data?.data) {
          const decoded = decodeErrorResult({
            abi: CONTRACTS.marketplaceAbi,
            data: err.data.data,
          });
          errorMessage = `Listing failed: ${decoded.errorName}`;
        }
      } catch (decodeErr) {
        console.error('Failed to decode error:', decodeErr);
      }
      
      toast.error(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  /* ------------- UI states ------------- */
  if (busy) return <FullPageLoader message="Loading NFT metadata…" />;

  if (!metadata)
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        Loading…
      </div>
    );

  /* ------------- page ------------- */
  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* ⭐ background gradients omitted for brevity ⭐ */}

      <div className="relative z-10 max-w-2xl mx-auto p-6">
        <h1 className="text-5xl font-black text-center mb-10 bg-gradient-to-r
                       from-purple-500 via-pink-500 to-blue-500 bg-clip-text
                       text-transparent animate-pulse">
          List Your NFT
        </h1>

        <div className="bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                        border border-white/10 rounded-3xl p-8 shadow-lg relative">
          <div className="absolute -inset-1 rounded-3xl blur-xl opacity-25
                          bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500
                          z-[-1]" />

          {metadata.image && (
            <img
              src={ipfsToHttp(metadata.image)}
              alt={metadata.name || "NFT"}
              className="w-full max-w-md h-auto rounded-xl mx-auto border border-purple-500/30 shadow-md"
            />
          )}

          <div className="text-center my-6 space-y-1">
            <h2 className="text-2xl font-bold text-white">{metadata.name}</h2>
            <p className="text-sm text-zinc-400">Token #{tokenId.toString()}</p>
            <p className="text-xs text-zinc-500 break-all">{nftAddr}</p>
          </div>

          <div className="mb-4">
            <label className="block text-sm mb-1 text-purple-300 font-medium">
              Price in ETH
            </label>
            <input
              type="number"
              placeholder="e.g. 0.05"
              value={price}
              onChange={e => setPrice(e.target.value)}
              className="w-full rounded-lg bg-zinc-800 px-4 py-2 border
                         border-purple-500/30 text-white focus:outline-none
                         focus:border-pink-500 transition-all"
            />
          </div>

          <Button
            onClick={listItem}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600
                       hover:from-purple-700 hover:via-pink-700 hover:to-blue-700
                       border border-purple-500/30 hover:border-purple-400/70
                       font-semibold py-3 rounded-full transition duration-300
                       group"
          >
            List NFT
            <span className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Sparkles className="w-4 h-4" />
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
}
