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
    abi:     CONTRACTS.nft1155Abi,
    functionName: "uri",
    args:   [tokenId],
  });

  /* fetch metadata */
  useEffect(() => {
    if (!tokenUri) return;
    setBusy(true);
    console.log('🔍 Fetching metadata from URI:', tokenUri);
    
    const fetchMetadata = async () => {
      try {
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
          const contentType = response.headers.get('content-type');
          console.log('🔍 Response content type:', contentType);
          
          if (contentType && (contentType.includes('image/') || contentType.includes('video/') || contentType.includes('audio/'))) {
            console.log('🔍 Content appears to be binary, creating fallback metadata');
            
            const fallbackMetadata = {
              name: `NFT #${tokenId.toString()}`,
              description: `Token ID: ${tokenId.toString()}`,
              image: response.url,
              external_url: response.url
            };
            
            console.log('🔍 Fallback metadata created:', fallbackMetadata);
            setMetadata(fallbackMetadata);
            return;
          }
          
          if (!contentType || !contentType.includes('application/json')) {
            console.warn('⚠️ Response is not JSON, content type:', contentType);
            const text = await response.text();
            console.log('🔍 Raw response text:', text.substring(0, 200) + '...');
            
            try {
              const data = JSON.parse(text);
              console.log('🔍 Metadata data received:', data);
              setMetadata(data);
              return;
            } catch (parseError) {
              console.error('❌ Failed to parse as JSON:', parseError);
              throw new Error(`Invalid JSON response. Content type: ${contentType}`);
            }
          }
          
          const data = await response.json();
          console.log('🔍 Metadata data received:', data);
          setMetadata(data);
          return;
        }
        
        console.log('🔄 Primary gateway failed, trying multiple gateways...');
        const fallbackResponse = await tryMultipleGateways(tokenUri as string);
        
        const fallbackContentType = fallbackResponse.headers.get('content-type');
        console.log('🔍 Fallback response content type:', fallbackContentType);
        
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
          console.warn('⚠️ Fallback response is not JSON');
          const text = await fallbackResponse.text();
          console.log('🔍 Raw fallback response text:', text.substring(0, 200) + '...');
          
          try {
            const data = JSON.parse(text);
            console.log('🔍 Metadata data received from fallback:', data);
            setMetadata(data);
            return;
          } catch (parseError) {
            console.error('❌ Failed to parse fallback as JSON:', parseError);
            throw new Error(`Invalid JSON response from fallback`);
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
  }, [tokenUri, tokenId]);

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
      // Use the token ID from the route directly
      const listingId = tokenId;

      setBusy(true);
      toast.loading("Checking approval…", { id: "tx" });

      // Check ERC1155 approval
      let approved = false;
      
      try {
        approved = (await publicClient.readContract({
          address: nftAddr,
          abi: CONTRACTS.nft1155Abi,
          functionName: "isApprovedForAll",
          args: [address, CONTRACTS.marketplace],
        })) as boolean;
        console.log('🔍 ERC1155 approval status:', approved);
      } catch (approvalErr) {
        console.error('❌ Could not check approval:', approvalErr);
        toast.dismiss("tx");
        toast.error("Could not check NFT approval status");
        return;
      }

      if (!approved) {
        toast.loading("Approving NFT…", { id: "tx" });
        console.log('🔍 Setting approval for all (ERC1155)...');
        
        try {
          const approvalHash = await writeContractAsync({
            address: nftAddr,
            abi: CONTRACTS.nft1155Abi,
            functionName: "setApprovalForAll",
            args: [CONTRACTS.marketplace, true],
          });
          
          console.log('🔍 Approval transaction submitted:', approvalHash);
          
          // Wait for approval to be confirmed
          toast.loading("Waiting for approval confirmation…", { id: "tx" });
          const approvalReceipt = await publicClient.waitForTransactionReceipt({ 
            hash: approvalHash 
          });
          
          if (approvalReceipt.status !== "success") {
            console.error('❌ Approval transaction failed:', approvalReceipt);
            toast.dismiss("tx");
            toast.error("Approval transaction failed");
            return;
          }
          
          console.log('✅ ERC1155 approval confirmed on-chain');
          
          // Verify approval was actually set
          const nowApproved = await publicClient.readContract({
            address: nftAddr,
            abi: CONTRACTS.nft1155Abi,
            functionName: "isApprovedForAll",
            args: [address, CONTRACTS.marketplace],
          });
          
          console.log('🔍 Approval verification after setting:', nowApproved);
          
          if (!nowApproved) {
            toast.dismiss("tx");
            toast.error("Approval was not set correctly. Please try again.");
            return;
          }
        } catch (approvalError: any) {
          console.error('❌ ERC1155 approval failed:', approvalError);
          toast.dismiss("tx");
          toast.error(`Failed to approve NFT: ${approvalError?.message || 'Unknown error'}`);
          return;
        }
      }

      // Check NFT ownership and balance
      toast.loading("Checking NFT ownership…", { id: "tx" });
      
      try {
        const balance = await publicClient.readContract({
          address: nftAddr,
          abi: CONTRACTS.nft1155Abi,
          functionName: "balanceOf",
          args: [address, listingId],
        });
        
        console.log('🔍 ERC1155 balance:', balance);
        console.log('🔍 Balance check - Your address:', address);
        console.log('🔍 Balance check - Token ID:', tokenId.toString());
        console.log('🔍 Balance check - NFT contract:', nftAddr);
        
        if (balance < 1n) {
          toast.dismiss("tx");
          
          // Provide helpful message about Pack vs Card tokens
          if (tokenId > 0n) {
            toast.error(`You don't own token #${tokenId}. Note: Card tokens (ID 1+) are only created when you open packs. Try listing a pack (token ID 0) or open a pack first to get cards.`);
          } else {
            toast.error("You don't own this NFT. Please verify the token ID.");
          }
          return;
        }
        
        console.log('✅ Balance check passed - you own', balance.toString(), 'of token ID', tokenId.toString());
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
          args: [nftAddr, listingId],
        });
        
        console.log('🔍 Existing listing:', existingListing);
        
        // Check if already listed (has a price > 0)
        if (existingListing && existingListing[1] > 0n) {
          toast.dismiss("tx");
          toast.error("This NFT is already listed for sale");
          return;
        }
      } catch (listingErr: any) {
        console.log('🔍 Could not check existing listing:', listingErr);
      }

      // Validate NFT contract origin - check all allowed factories
      toast.loading("Validating NFT contract origin…", { id: "tx" });
      
      let isFromAllowedFactory = false;
      const factoryChecks: Array<{ name: string; address: string; result: boolean }> = [];
      
      // Check Factory A (factoryERC1155)
      if (CONTRACTS.factoryERC1155) {
        try {
          console.log('🔍 Checking Factory A (factoryERC1155)...');
          const isFactoryA = await publicClient.readContract({
            address: CONTRACTS.factoryERC1155,
            abi: CONTRACTS.factoryERC1155Abi,
            functionName: "isCardifyCollection",
            args: [nftAddr as `0x${string}`],
          });
          factoryChecks.push({ name: "Factory A", address: CONTRACTS.factoryERC1155, result: isFactoryA });
          if (isFactoryA) {
            console.log('✅ NFT contract recognized by Factory A');
            isFromAllowedFactory = true;
          }
        } catch (err: any) {
          console.error('❌ Factory A check failed:', err);
          factoryChecks.push({ name: "Factory A", address: CONTRACTS.factoryERC1155, result: false });
        }
      }
      
      // Check Factory B (singleFactory)
      if (!isFromAllowedFactory && CONTRACTS.singleFactory) {
        try {
          console.log('🔍 Checking Factory B (singleFactory)...');
          const isFactoryB = await publicClient.readContract({
            address: CONTRACTS.singleFactory,
            abi: CONTRACTS.singleFactoryAbi,
            functionName: "isCardifyCollection",
            args: [nftAddr as `0x${string}`],
          });
          factoryChecks.push({ name: "Factory B", address: CONTRACTS.singleFactory, result: isFactoryB });
          if (isFactoryB) {
            console.log('✅ NFT contract recognized by Factory B');
            isFromAllowedFactory = true;
          }
        } catch (err: any) {
          console.error('❌ Factory B check failed:', err);
          factoryChecks.push({ name: "Factory B", address: CONTRACTS.singleFactory, result: false });
        }
      }
      
      // Check Pack Factory
      if (!isFromAllowedFactory && CONTRACTS.packFactory) {
        try {
          console.log('🔍 Checking Pack Factory...');
          const isPackFactory = await publicClient.readContract({
            address: CONTRACTS.packFactory,
            abi: CONTRACTS.packFactoryAbi,
            functionName: "isCardifyCollection",
            args: [nftAddr as `0x${string}`],
          });
          factoryChecks.push({ name: "Pack Factory", address: CONTRACTS.packFactory, result: isPackFactory });
          if (isPackFactory) {
            console.log('✅ NFT contract recognized by Pack Factory');
            isFromAllowedFactory = true;
          }
        } catch (err: any) {
          console.error('❌ Pack Factory check failed:', err);
          factoryChecks.push({ name: "Pack Factory", address: CONTRACTS.packFactory, result: false });
        }
      }
      
      console.log('🔍 Factory validation summary:', factoryChecks);
      
      if (!isFromAllowedFactory) {
        toast.dismiss("tx");
        const factoryNames = factoryChecks.map(f => f.name).join(", ");
        toast.error(`This NFT contract was not created by any allowed factory (${factoryNames})`);
        return;
      }

      // Check basic marketplace functionality
      toast.loading("Checking marketplace status…", { id: "tx" });
      
      try {
        // Verify marketplace is accessible and get owner
        const marketplaceOwner = await publicClient.readContract({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "owner",
        });
        
        console.log('🔍 Marketplace owner:', marketplaceOwner);
        
        // Check if the NFT collection has the marketplace set correctly
        try {
          const collectionMarketplace = await publicClient.readContract({
            address: nftAddr,
            abi: [
              {
                "inputs": [],
                "name": "marketplace",
                "outputs": [{"internalType": "address", "name": "", "type": "address"}],
                "stateMutability": "view",
                "type": "function"
              }
            ],
            functionName: "marketplace",
          });
          
          console.log('🔍 Collection\'s configured marketplace:', collectionMarketplace);
          console.log('🔍 Expected marketplace:', CONTRACTS.marketplace);
          
          if (collectionMarketplace.toLowerCase() !== CONTRACTS.marketplace.toLowerCase()) {
            console.warn('⚠️ Collection marketplace mismatch!');
            console.warn('  Collection has:', collectionMarketplace);
            console.warn('  Expected:', CONTRACTS.marketplace);
            toast.dismiss("tx");
            toast.error("This collection is configured for a different marketplace. Auto-approval won't work.");
            return;
          }
          
          console.log('✅ Collection marketplace matches - auto-approval should work');
        } catch (mpCheckErr) {
          console.log('🔍 Could not check collection marketplace setting:', mpCheckErr);
        }
        
        // Check if marketplace is paused
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
        } catch (pauseErr) {
          console.log('🔍 Could not check pause status (function may not exist)');
        }
      } catch (marketplaceErr: any) {
        console.error('❌ Could not access marketplace contract:', marketplaceErr);
        toast.dismiss("tx");
        toast.error("Could not access marketplace contract");
        return;
      }

      // Check if PackFactory is registered in marketplace
      // This is important because the marketplace's internal _isCardify1155() checks if the collection
      // comes from a registered factory. Even though PackFactory recognizes the collection,
      // the marketplace won't accept it unless PackFactory is registered.
      if (CONTRACTS.packFactory) {
        try {
          const isFactoryRegistered = await publicClient.readContract({
            address: CONTRACTS.marketplace,
            abi: CONTRACTS.marketplaceAbi,
            functionName: 'isFactory1155',
            args: [CONTRACTS.packFactory],
          });
          console.log('🔍 PackFactory registered in marketplace:', isFactoryRegistered);
          if (!isFactoryRegistered) {
            toast.dismiss("tx");
            toast.error('PackFactory is not registered in the marketplace. The marketplace owner needs to call addFactory1155() to register it.');
            return;
          }
        } catch (factoryCheckErr) {
          console.log('🔍 Could not check factory registration:', factoryCheckErr);
          // Continue anyway - the transaction simulation will catch the error
        }
      }

      // Simulate the transaction to catch errors early
      toast.loading("Validating transaction…", { id: "tx" });
      
      console.log('🔍 Simulating transaction with parameters:', {
        marketplace: CONTRACTS.marketplace,
        nftAddr,
        tokenId: listingId.toString(),
        price: parseEther(price).toString(),
        account: address
      });
      
      try {
        await publicClient.simulateContract({
          account: address,
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "listItem1155",
          args: [nftAddr, listingId, parseEther(price)],
        });
        console.log('✅ Transaction simulation successful');
      } catch (simErr: any) {
        console.error('❌ Transaction simulation failed:', simErr);
        console.error('❌ Full error object:', simErr);
        toast.dismiss("tx");
        
        let errorMessage = "Transaction validation failed";
        
        // Try to extract a meaningful error message
        try {
          // Check for revert reason in various locations
          const errorData = simErr?.data?.data || simErr?.cause?.data || simErr?.data;
          const errorMsg = simErr?.shortMessage || simErr?.message || simErr?.cause?.message;
          const revertReason = simErr?.cause?.reason || simErr?.reason;
          
          console.log('🔍 Error details:', {
            errorData,
            errorMsg,
            revertReason,
            cause: simErr?.cause
          });
          
          if (errorData && errorData !== '0x') {
            console.log('🔍 Attempting to decode error data:', errorData);
            try {
              const decoded = decodeErrorResult({
                abi: CONTRACTS.marketplaceAbi,
                data: errorData,
              });
              errorMessage = `Cannot list: ${decoded.errorName || 'Unknown error'}`;
              console.log('🔍 Decoded error:', decoded);
            } catch (decodeErr) {
              console.log('🔍 Could not decode error data');
            }
          }
          
          // If no decoded error, use the error message
          if (errorMessage === "Transaction validation failed") {
            if (revertReason) {
              errorMessage = `Cannot list: ${revertReason}`;
            } else if (errorMsg) {
              // Extract the most relevant part of the error message
              if (errorMsg.includes('reverted')) {
                errorMessage = "Transaction would revert. Possible reasons: NFT already listed, not approved, or token doesn't exist";
              } else {
                errorMessage = `Validation failed: ${errorMsg.substring(0, 100)}`;
              }
            }
          }
        } catch (parseErr) {
          console.error('Failed to parse error:', parseErr);
        }
        
        toast.error(errorMessage);
        
        // Provide helpful debugging info
        console.log('🔍 Debugging info:');
        console.log('  - NFT Contract:', nftAddr);
        console.log('  - Token ID:', listingId.toString());
        console.log('  - Price:', parseEther(price).toString());
        console.log('  - Your Address:', address);
        console.log('  - Marketplace:', CONTRACTS.marketplace);
        console.log('  - Chain ID:', chainId);
        
        return;
      }

      toast.loading("Listing NFT…", { id: "tx" });
      
      console.log('🔍 Creating ERC1155 listing with validated contract');
      
      let hash;
      try {
        hash = await writeContractAsync({
          address: CONTRACTS.marketplace,
          abi: CONTRACTS.marketplaceAbi,
          functionName: "listItem1155",
          args: [nftAddr, listingId, parseEther(price)],
        });
        console.log('✅ ERC1155 listing transaction submitted:', hash);
      } catch (listingError: any) {
        console.error('❌ ERC1155 listing failed:', listingError);
        toast.dismiss("tx");
        toast.error(`Failed to create listing: ${listingError?.message || 'Unknown error'}`);
        return;
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
