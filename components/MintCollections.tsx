import { useEffect, useState } from 'react';
import { useReadContract, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';
import { ethers } from 'ethers';
import { CONTRACTS } from '@/lib/contract';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import toast from 'react-hot-toast';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Helper function to convert IPFS URI to HTTP URL
const ipfsToHttp = (uri: string): string => {
  if (!uri) return '/cardifyN.png';
  if (uri.startsWith('ipfs://')) {
    return `https://gateway.pinata.cloud/ipfs/${uri.replace('ipfs://', '')}`;
  }
  return uri;
};

interface CollectionInfo {
  collectionAddress: string;
  name: string;
  symbol: string;
  baseURI: string;
  maxSupply: bigint;
  mintPrice: bigint;
  owner: string;
}

export default function MintCollections() {
  const [collections, setCollections] = useState<CollectionInfo[]>([]);

  // Debug contract address
  console.log('Factory Contract Address:', CONTRACTS.singleFactory);

  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();

  // Get all collections with their info in one call
  const { data: collectionsData, isLoading: isLoadingCollections, error: collectionsError } = useReadContract({
    address: CONTRACTS.singleFactory as `0x${string}`,
    abi: CONTRACTS.singleFactoryAbi,
    functionName: 'getAllCollectionsWithInfo',
  });

  useEffect(() => {
    console.log('Collections Data:', collectionsData);
    if (collectionsData) {
      console.log('Base URIs:', (collectionsData as CollectionInfo[]).map(c => c.baseURI));
    }
    
    if (collectionsError) {
      console.error('Error fetching collections:', collectionsError);
      toast.error('Failed to load collections. Please check your network connection.');
      return;
    }

    if (collectionsData) {
      setCollections(collectionsData as CollectionInfo[]);
    }
  }, [collectionsData, collectionsError]);

  const { writeContract, isError: mintError, isPending: isMinting, isSuccess: mintSuccess } = useWriteContract();

  /* ensure network ------------------------------------------ */
  async function ensureNetwork(wallet: any) {
    if (wallet.walletClientType === 'privy') await wallet.switchChain(84532)
    else await switchInjectedWallet(await wallet.getEthereumProvider())
  }

  /* helper to switch MetaMask or other injected wallets */
  async function switchInjectedWallet(eth: any) {
    const cur = await eth.request({ method: 'eth_chainId' })
    if (cur === '0x14A34') return
    try {
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x14A34' }],
      })
    } catch (e: any) {
      if (e.code === 4902) {
        await eth.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: '0x14A34',
            chainName: 'Base Sepolia',
            rpcUrls: ['https://sepolia.base.org'],
            nativeCurrency: { name: 'Sepolia Ether', symbol: 'ETH', decimals: 18 },
            blockExplorerUrls: ['https://sepolia.basescan.org'],
          }],
        })
        await eth.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x14A34' }],
        })
      } else {
        throw e
      }
    }
  }

  // helper ──────────────────────────────────────────────────────────
  async function getSigner(wallet: any): Promise<ethers.Signer> {
    if (wallet.walletClientType === 'privy') {
      const prov = await wallet.getEthersProvider({ chainId: 84532 })
      return prov.getSigner()
    }
    const eth = await wallet.getEthereumProvider()
    const prov = new ethers.BrowserProvider(eth)
    return prov.getSigner()
  }

  const handleMint = async (collection: CollectionInfo) => {
    if (!ready || !authenticated || !wallets.length) {
      toast.error('Please connect your wallet first');
      return;
    }

    let toastId = toast.loading('Preparing to mint...');
    const wallet = wallets[0];
    
    try {
      // First ensure we're on the right network
      toast.loading('Switching to Base Sepolia...', { id: toastId });
      await ensureNetwork(wallet);

      // Get signer and create contract
      toast.loading('Please confirm the transaction...', { id: toastId });
      const signer = await getSigner(wallet);
      const contract = new ethers.Contract(
        collection.collectionAddress,
        CONTRACTS.singleCollectionAbi,
        signer
      );

      // Send mint transaction
      const tx = await contract.mint(0n, 1n, '0x', { value: collection.mintPrice });
      toast.loading(`Transaction sent: ${tx.hash.slice(0, 10)}...`, { id: toastId });
      
      // Wait for confirmation
      await tx.wait();
      toast.success('NFT successfully minted!', { id: toastId });
    } catch (error: any) {
      console.error('Mint error:', error);
      toast.error(
        error?.code === 4001
          ? 'Transaction was rejected'
          : error?.message?.includes('message channel closed')
          ? 'Wallet closed before finishing'
          : error?.reason || error?.message || 'Failed to mint NFT',
        { id: toastId }
      );
    }
  };

  // Handle transaction states
  useEffect(() => {
    if (isMinting) {
      toast.loading('Transaction is being processed...', { id: 'mint-status' });
    }
    if (mintSuccess) {
      toast.success('NFT successfully minted!', { id: 'mint-status' });
    }
    if (mintError) {
      toast.error('Transaction failed. Please try again.', { id: 'mint-status' });
    }
  }, [isMinting, mintSuccess, mintError]);

  if (isLoadingCollections) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent mb-4">
          Mint Now
        </h2>
        <p className="text-gray-400 max-w-2xl mx-auto">
          Explore and mint from our curated collection of unique NFTs. Each collection offers exclusive digital assets with unique properties.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {collections.map((collection) => (
          <Card 
            key={collection.collectionAddress} 
            className="overflow-hidden bg-gradient-to-b from-gray-900 to-black border border-gray-800 hover:border-purple-500 transition-all duration-300"
          >
            {/* Image placeholder - you'll need to implement proper image loading */}
            <div className="relative h-48 bg-gradient-to-r from-purple-500/20 to-pink-500/20">
              <div className="relative w-full h-full">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20" />
                <img
                  src={ipfsToHttp(collection.baseURI)}
                  alt={collection.name}
                  className="absolute inset-0 w-full h-full object-cover rounded-t-lg transition-opacity duration-300"
                  style={{ opacity: 0 }}
                  onLoad={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.style.opacity = '1';
                  }}
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.src = '/cardifyN.png';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-2xl font-bold text-white mb-1">{collection.name}</h3>
                <p className="text-gray-400 text-sm">{collection.symbol}</p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="bg-purple-500/10 border-purple-500/50 text-white">
                  {collection.symbol}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/10 border-blue-500/50 text-white">
                  Max Supply: {collection.maxSupply?.toString() || '0'}
                </Badge>
                <Badge variant="outline" className="bg-pink-500/10 border-pink-500/50 text-white">
                  {collection.mintPrice > 0n ? `${(Number(collection.mintPrice) / 1e18).toFixed(4)} ETH` : 'Free'}
                </Badge>
              </div>

              {/* Collection Owner */}
              <div className="text-sm text-gray-400 mt-2">
                Created by: {collection.owner.slice(0, 6)}...{collection.owner.slice(-4)}
              </div>

              {!authenticated ? (
                <Button
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                  onClick={login}
                >
                  Connect Wallet
                </Button>
              ) : (
              <Button 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white"
                onClick={() => handleMint(collection)}
                  disabled={isMinting}
              >
                  {isMinting ? 'Minting...' : 'Mint Now'}
              </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
