/* -------------------------------------------------------------------------- */
/*  app/(routes)/dashboard/page.tsx                                           */
/*  — fixed version: no more one–frame “No NFTs” flash                        */
/* -------------------------------------------------------------------------- */

"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWatchContractEvent,
} from "wagmi";

import FullPageLoader from "@/components/FullPageLoader";
import AlchemyNFTCard   from "@/components/AlchemyNFTCard";
import { CONTRACTS }    from "@/lib/contract";
import {
  getNFTsForOwner,
  AlchemyNFT,
}                       from "@/lib/alchemy";

/* ----------------------------- constants ---------------------------------- */
const CHAIN_ID = 84532;        // Base-Sepolia

export default function Dashboard() {
  /* ------------------------------------------------------------------------
     Wallet / basic context
  ------------------------------------------------------------------------ */
  const { ready }      = usePrivy();
  const { address }    = useAccount();
  const publicClient   = usePublicClient({ chainId: CHAIN_ID });

  /* ------------------------------------------------------------------------
     Local state
  ------------------------------------------------------------------------ */
  const [busy, setBusy]                     = useState(false);              // fetch in progress
  const [showContent, setShowContent]       = useState(false);              // 300 ms UX delay
  const [nftsLoaded, setNftsLoaded]         = useState(false);              // loader ⟶ data flag
  const [allCollections, setAllCollections] = useState<string[]>([]);
  const [alchemyNfts, setAlchemyNfts]       = useState<AlchemyNFT[]>([]);
  const [owned, setOwned]                   = useState<
    { collection: `0x${string}`; name: string; ids: bigint[] }[]
  >([]);

  /* ------------------------------------------------------------------------
     Factory collection counts
  ------------------------------------------------------------------------ */
  const { data: totalSingle } = useReadContract({
    address: CONTRACTS.singleFactory,
    abi:     CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query: { enabled: !!address },
  });

  const { data: total1155 } = useReadContract({
    address: CONTRACTS.factoryERC1155,
    abi:     CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query: { enabled: !!address },
  });

  /* ------------------------------------------------------------------------
     Fetch collection addresses once counts are known
  ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!publicClient || (!totalSingle && !total1155)) return;

    (async () => {
      const list: string[] = [];

      if (totalSingle) {
        for (let i = 0; i < Number(totalSingle); i++) {
          const addr = await publicClient.readContract({
            address: CONTRACTS.singleFactory,
            abi:     CONTRACTS.singleFactoryAbi,
            functionName: "allCollections",
            args: [BigInt(i)],
          });
          list.push(addr as string);
        }
      }

      if (total1155) {
        for (let i = 0; i < Number(total1155); i++) {
          const addr = await publicClient.readContract({
            address: CONTRACTS.factoryERC1155,
            abi:     CONTRACTS.factoryERC1155Abi,
            functionName: "allCollections",
            args: [BigInt(i)],
          });
          list.push(addr as string);
        }
      }

      setAllCollections(list);
    })();
  }, [totalSingle, total1155, publicClient]);

  /* ------------------------------------------------------------------------
     Load NFTs — main worker
  ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!ready || !address || allCollections.length === 0) return;

    let cancelled = false;
    const load = async () => {
      setBusy(true);
      setNftsLoaded(false);          // mark “data not ready” as soon as we start

      try {
        const nfts = await getNFTsForOwner(address, allCollections);
        if (cancelled) return;

        /* keep only NFTs from our factories */
        const factories = allCollections.map(c => c.toLowerCase());
        const ownedNfts = nfts.filter(n =>
          factories.includes(n.contract.address.toLowerCase()),
        );

        setAlchemyNfts(ownedNfts);

        /* collate for UI sidebar etc. */
        const grouped = ownedNfts.reduce<Record<string, bigint[]>>((m, nft) => {
          const key = nft.contract.address.toLowerCase();
          (m[key] ??= []).push(BigInt(nft.tokenId));
          return m;
        }, {});

        const arr = Object.entries(grouped).map(([c, ids]) => ({
          collection: c as `0x${string}`,
          name:       `Collection ${c.slice(2, 6)}`,  // simple placeholder
          ids,
        }));

        setOwned(arr);
      } finally {
        if (!cancelled) {
          /* queueMicrotask ensures owned[] is already committed
             before nftsLoaded flips to true → no empty-flash  */
          queueMicrotask(() => setNftsLoaded(true));
          setBusy(false);
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [ready, address, allCollections]);

  /* ------------------------------------------------------------------------
     Live refresh on marketplace events
  ------------------------------------------------------------------------ */
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: ["Sold1155", "Cancelled1155"],
    listener() {
      if (ready && address) setBusy(true);   // retriggers loader effect above
    },
  });

  /* ------------------------------------------------------------------------
     300 ms grace to avoid “flash” on extremely fast fetches
  ------------------------------------------------------------------------ */
  useEffect(() => {
    if (!busy) {
      const t = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(t);
    }
  }, [busy]);

  /* ------------------------------------------------------------------------
     Render guards
  ------------------------------------------------------------------------ */
  if (!ready || busy || !showContent || !nftsLoaded) {
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-zinc-400">😢 No Cardify NFTs owned yet.</p>
      </div>
    );

  /* ------------------------------------------------------------------------
     Main grid
  ------------------------------------------------------------------------ */
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Your NFTs</h1>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alchemyNfts.map((nft, i) => (
            <AlchemyNFTCard
              key={nft.uniqueId || `${nft.contract.address}-${nft.tokenId}-${i}`}
              nft={nft}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
