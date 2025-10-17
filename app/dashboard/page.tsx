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
      const raw = await getNFTsForOwner(address, allCollections);

      const factories = new Set(allCollections.map(c => c.toLowerCase()));
      const kept      = raw.filter(nft =>
        factories.has(nft.contract.address.toLowerCase()),
      );

      const expanded: AlchemyNFT[] = [];
      kept.forEach(nft => {
        const count = nft.tokenType === "ERC1155"
          ? Number((nft as any).balance ?? 1)
          : 1;
        for (let i = 0; i < count; i++) {
          expanded.push({ ...nft, uniqueId: `${nft.contract.address}-${nft.tokenId}-${i}` });
        }
      });

      setAlchemyNfts(expanded);
    } catch (err) {
      console.error("NFT fetch failed:", err);
      setAlchemyNfts([]);
    } finally {
      setBusy(false);
      setTimeout(() => setShow(true), 200);   // anti-flicker
    }
  }, [ready, address, allCollections]);

  useEffect(() => { loadNfts(); }, [loadNfts]);

  /* ------------------------------------------------------------------ */
  /* 3/3 – refresh on Sold / Cancelled events                           */
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Sold1155",
    onLogs() { loadNfts(); },
  });
  useWatchContractEvent({
    address: CONTRACTS.marketplace,
    abi:     CONTRACTS.marketplaceAbi,
    eventName: "Cancelled1155",
    onLogs() { loadNfts(); },
  });

  /* ------------------------------------------------------------------ */
  /* RENDER                                                             */
  const loading =
    !ready ||
    singleLoading || erc1155Loading ||
    busy || !show;

  if (loading)                 return <FullPageLoader message="Loading NFTs…"/>;
  if (!address)                return <Empty label="🔗 Connect your wallet to view NFTs." />;
  if (!allCollections.length)  return <Empty label="No Collections Found" />;
  if (!alchemyNfts.length)     return <Empty label="😢 No Cardify NFTs owned yet." />;

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
function Empty({ label }: { label: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-2xl text-zinc-400">{label}</p>
    </div>
  );
}
