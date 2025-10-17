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

/* ------------------------------------------------------------------ */
/* constants + helpers                                                */
const CHAIN_ID = 84532;                          // Base-Sepolia
type FlatNFT = { contractAddress: string; tokenId: string };

/* ------------------------------------------------------------------ */
export default function Dashboard() {
  /* wallet ---------------------------------------------------------------- */
  const { ready }     = usePrivy();
  const { address }   = useAccount();
  const publicClient  = usePublicClient({ chainId: CHAIN_ID });

  /* ui state -------------------------------------------------------------- */
  const [busy,  setBusy ] = useState(false);     // fetch in progress
  const [show,  setShow ] = useState(false);     // gate to avoid flicker

  /* data state ------------------------------------------------------------ */
  const [allCollections, setAllCollections] = useState<string[]>([]);
  const [alchemyNfts,    setAlchemyNfts   ] = useState<AlchemyNFT[]>([]);

  /* ------------------------------------------------------------------ */
  /* read total collections counts (2 factories)                        */
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

  /* ------------------------------------------------------------------ */
  /* 1/3  – pull every collection address once we know the totals       */
  useEffect(() => {
    if (!publicClient || (!singleTotal && !erc1155Total)) return;

    (async () => {
      const list: string[] = [];

      /* single-mint collections */
      if (singleTotal) {
        const n = Number(singleTotal as bigint);
        for (let i = 0; i < n; i++) {
          const addr = await publicClient.readContract({
            address: CONTRACTS.singleFactory,
            abi:     CONTRACTS.singleFactoryAbi,
            functionName: "allCollections",
            args:   [BigInt(i)],
          });
          list.push(addr as string);
        }
      }

      /* ERC-1155 collections */
      if (erc1155Total) {
        const n = Number(erc1155Total as bigint);
        for (let i = 0; i < n; i++) {
          const addr = await publicClient.readContract({
            address: CONTRACTS.factoryERC1155,
            abi:     CONTRACTS.factoryERC1155Abi,
            functionName: "allCollections",
            args:   [BigInt(i)],
          });
          list.push(addr as string);
        }
      }

      setAllCollections(list);
    })();
  }, [singleTotal, erc1155Total, publicClient]);

  /* ------------------------------------------------------------------ */
  /* 2/3  – core loader (Alchemy -> on-chain)                            */
  const loadNfts = useCallback(async () => {
    if (!ready || !address || !allCollections.length) return;

    setBusy(true);          // spinning loader
    setShow(false);         // hide UI until we’re done

    try {
      const alch = await getNFTsForOwner(address, allCollections);

      /* keep only tokens from our factories just in case               */
      const factories = new Set(allCollections.map(c => c.toLowerCase()));
      const filtered  = alch.filter(nft =>
        factories.has(nft.contract.address.toLowerCase()),
      );

      /* duplicate entries for ERC-1155 balances                        */
      const expanded: AlchemyNFT[] = [];
      filtered.forEach(nft => {
        const bal = nft.tokenType === "ERC1155"
          ? Number((nft as any).balance ?? 1)
          : 1;
        for (let i = 0; i < bal; i++) {
          expanded.push({
            ...nft,
            uniqueId: `${nft.contract.address}-${nft.tokenId}-${i}`,
          });
        }
      });

      setAlchemyNfts(expanded);
    } catch (err) {
      console.error("NFT fetch failed:", err);
      setAlchemyNfts([]);
    } finally {
      setBusy(false);
      /* give React 1-2 frames before showing to avoid flicker          */
      setTimeout(() => setShow(true), 200);
    }
  }, [ready, address, allCollections]);

  /* loader runs at start + whenever its deps change ------------------ */
  useEffect(() => { loadNfts(); }, [loadNfts]);

  /* ------------------------------------------------------------------ */
  /* 3/3  – live refresh when something sells or is cancelled           */
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Sold1155",
    listener() { loadNfts(); },
  });
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Cancelled1155",
    listener() { loadNfts(); },
  });

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  const initialLoad =
    !ready ||
    singleLoading || erc1155Loading ||
    busy        ||
    !show;

  if (initialLoad)           return <FullPageLoader message="Loading NFTs…" />;
  if (!address)              return <p className="text-center mt-12 text-zinc-400">🔗 Connect your wallet to view NFTs.</p>;
  if (!allCollections.length)return <EmptyState label="No Collections Found" />;
  if (!alchemyNfts.length)   return <EmptyState label="😢 No Cardify NFTs owned yet." />;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Your NFTs</h1>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alchemyNfts.map(nft => (
            <AlchemyNFTCard key={nft.uniqueId} nft={nft}/>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
function EmptyState({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-2xl text-zinc-400">{label}</p>
    </div>
  );
}
