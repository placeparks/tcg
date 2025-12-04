
"use client";

import React, { useState, useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";
import { 
  Search, Filter, Activity, Layers, 
  ShoppingCart, Zap, RefreshCw, AlertTriangle 
} from "lucide-react";
import toast from "react-hot-toast";

// Internal Components
import AlchemyNFTCard from "@/components/AlchemyNFTCard";
import SectionHeader from "@/components/SectionHeader";
import {Button} from "@/components/ui/button";
import FullPageLoader from "@/components/FullPageLoader";

// Hooks & Libs
import { useMarketplaceListings, ListedItem } from "@/hooks/useMarketplaceListings";
import { AlchemyNFT } from "@/lib/alchemy";

const CHAIN_ID = 84532; // Base Sepolia

// Convert ListedItem to AlchemyNFT format
function convertToListedNFT(item: ListedItem): AlchemyNFT {
  return {
    contract: { address: item.collection },
    tokenId: item.id.toString(),
    name: item.metadata?.name,
    description: item.metadata?.description,
    raw: {
      metadata: item.metadata,
    },
  };
}

export default function BuyPage() {
  const { address } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  // Custom hook to fetch listing data from events
  const { listings, loading, firstFetchDone, refetch } = useMarketplaceListings({});

  // Calculate stats from listings
  const stats = {
    activeCount: listings.length,
  };

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("All"); // All, Robot, Weapon, etc. (based on attributes if available)
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Network Check
  const isWrongNetwork = chainId !== CHAIN_ID;

  // Manual Refresh Handler
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 800);
    toast.success("Marketplace data updated");
  };

  // Filter Logic
  const filteredListings = listings.filter((nft) => {
    const matchesSearch = (nft.metadata?.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (nft.metadata?.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    
    // Example Type Filtering (relies on metadata attributes having a 'Type' trait)
    // If your metadata doesn't have this, you can remove this check or adapt it
    const matchesType = filterType === "All" ? true : 
        nft.metadata?.attributes?.some((attr: any) => 
            attr.trait_type === "Type" && attr.value === filterType
        );

    return matchesSearch && matchesType;
  });

  // Show loader only if first fetch hasn't completed yet
  if (!firstFetchDone || (loading && !isRefreshing)) {
    return <FullPageLoader message="Scanning Neural Net for Listings..." />;
  }

  return (
    <div className="min-h-screen bg-[#030014] relative overflow-hidden md:px-20">
      {/* ----------------- Background Ambience ----------------- */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-purple/50 to-transparent" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-neon-blue/10 rounded-full blur-[120px]" />
        <div className="absolute top-20 left-[-10%] w-[600px] h-[600px] bg-neon-purple/10 rounded-full blur-[120px]" />
        {/* Cyber Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
      </div>

      <div className="container mx-auto px-4 py-24 relative z-10">
        
        {/* ----------------- Header & Stats ----------------- */}
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-8">
            <div>
                <SectionHeader title="System Market" subtitle="Live Feed" />
                <div className="flex items-center gap-6 mt-4 text-sm font-mono text-gray-400">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-neon-blue" />
                        <span className="text-white font-bold">{stats.activeCount}</span> ACTIVE LISTINGS
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                        NETWORK: <span className={isWrongNetwork ? "text-red-500" : "text-green-500"}>
                            {isWrongNetwork ? "MISMATCH" : "STABLE"}
                        </span>
                    </div>
                </div>
            </div>

            {/* Network Warning Banner if wrong chain */}
            {isWrongNetwork && (
                <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 flex items-center gap-4 max-w-md animate-pulse">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                    <div>
                        <h4 className="font-bold text-white text-sm">NETWORK ERROR</h4>
                        <p className="text-red-200 text-xs mb-2">Please switch to Base Sepolia to trade.</p>
                        <Button onClick={() => switchChain({ chainId: CHAIN_ID })} variant="outline" className="!py-1 !px-3 text-xs border-red-500 text-red-400 hover:bg-red-500/20">
                            Switch Network
                        </Button>
                    </div>
                </div>
            )}
        </div>

        {/* ----------------- Toolbar ----------------- */}
        <div className="bg-gray-900/60 backdrop-blur-xl border border-white/10 rounded-2xl p-4 mb-8 sticky top-24 z-30 shadow-2xl">
            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center">
                
                {/* Search */}
                <div className="relative w-full lg:w-96 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 group-focus-within:text-neon-purple transition-colors" />
                    <input 
                        type="text" 
                        placeholder="SEARCH ITEM DB..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-neon-purple focus:ring-1 focus:ring-neon-purple/50 outline-none font-mono placeholder:text-gray-600 transition-all"
                    />
                </div>

                <div className="flex gap-3 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
                    {/* Refresh */}
                    <button 
                        onClick={handleRefresh}
                        className={`p-3 rounded-xl border border-white/10 bg-black/40 text-neon-blue hover:bg-neon-blue/10 transition-colors ${isRefreshing ? 'animate-spin' : ''}`}
                        title="Refresh Listings"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                    
                    {/* Filters (Mock functionality for demonstration) */}
                    <div className="flex items-center bg-black/40 border border-white/10 rounded-xl p-1">
                        {['All', 'Robot', 'Weapon'].map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilterType(f)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                                    filterType === f 
                                    ? 'bg-neon-purple text-white shadow-lg' 
                                    : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {/* ----------------- Listings Grid ----------------- */}
        <div className="min-h-[400px]">
            {filteredListings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 text-white">
                    {filteredListings.map((item) => {
                        const nft = convertToListedNFT(item);
                        return (
                            <div key={`${item.collection}-${item.id}`} className="animate-fade-in-up">
                                {/* We use AlchemyNFTCard because it handles the specific "Buy" vs "Cancel" logic internally based on listing status */}
                                <AlchemyNFTCard nft={nft} />
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center h-96 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 relative overflow-hidden group">
                    <div className="absolute inset-0 bg-scanlines opacity-10 pointer-events-none" />
                    <div className="relative z-10 text-center">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-500">
                            <ShoppingCart className="w-8 h-8 text-gray-600 group-hover:text-neon-blue transition-colors" />
                        </div>
                        <h3 className="text-2xl font-display font-bold text-white mb-2">Market Offline</h3>
                        <p className="text-gray-400 font-mono text-sm max-w-md mx-auto">
                            No matching listings found in the sector. <br />
                            Try adjusting filters or check back later.
                        </p>
                        <Button onClick={handleRefresh} variant="outline" className="mt-8 text-black">
                            Re-scan Sector
                        </Button>
                    </div>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}
