/* app/dashboard/page.tsx  ───────────────────────────────────────── */
/* COMPLETE FILE – replace your current Dashboard component        */

"use client";

import { useEffect, useState } from "react";
import { usePrivy } from "@privy-io/react-auth";
import {
  useAccount,
  useReadContract,
  usePublicClient,
} from "wagmi";

import FullPageLoader from "@/components/FullPageLoader";
import AlchemyNFTCard from "@/components/AlchemyNFTCard";
import { CONTRACTS } from "@/lib/contract";
import { getNFTsForOwner, AlchemyNFT } from "@/lib/alchemy";

/* ------------------------------------------------------------------ */
/* constants                                                          */
/* ------------------------------------------------------------------ */
const CHAIN_ID = 84532; // Base-Sepolia

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  /* wallet / auth */
  const { ready } = usePrivy();
  const { address } = useAccount();

  /* ---------------------------------------------------------------- */
  /* state                                                            */
  /* ---------------------------------------------------------------- */
  const [busy, setBusy] = useState(false);            // network work in progress
  const [collectionsLoaded, setCollectionsLoaded] = useState(false);
  const [nftsLoaded, setNftsLoaded] = useState(false);
  const [allCollections, setAllCollections] = useState<string[]>([]);
  const [alchemyNfts, setAlchemyNfts] = useState<AlchemyNFT[]>([]);
  const [owned, setOwned] = useState<
    { collection: `0x${string}`; name: string; ids: bigint[] }[]
  >([]);

  /* debounce tiny flashes */
  const [showContent, setShowContent] = useState(false);

  /* ---------------------------------------------------------------- */
  /* contract reads – factory totals                                  */
  /* ---------------------------------------------------------------- */
  const {
    data: singleTotal,
    isPending: singleLoading,
    error: singleErr,
  } = useReadContract({
    address: CONTRACTS.singleFactory as `0x${string}`,
    abi: CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query: { enabled: !!address },
  });

  const {
    data: erc1155Total,
    isPending: erc1155Loading,
    error: erc1155Err,
  } = useReadContract({
    address: CONTRACTS.factoryERC1155 as `0x${string}`,
    abi: CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query: { enabled: !!address },
  });

  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  /* ---------------------------------------------------------------- */
  /* fetch all collection addresses                                   */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!publicClient || (!singleTotal && !erc1155Total)) return;

    const fetchAll = async () => {
      setCollectionsLoaded(false);
      const list: string[] = [];

      /* single-NFT factory */
      if (singleTotal) {
        for (let i = 0; i < Number(singleTotal); i++) {
          try {
            const c = await publicClient.readContract({
              address: CONTRACTS.singleFactory as `0x${string}`,
              abi: CONTRACTS.singleFactoryAbi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            list.push(c as string);
          } catch (e) {
            console.error("single factory read error", i, e);
          }
        }
      }

      /* 1155 factory */
      if (erc1155Total) {
        for (let i = 0; i < Number(erc1155Total); i++) {
          try {
            const c = await publicClient.readContract({
              address: CONTRACTS.factoryERC1155 as `0x${string}`,
              abi: CONTRACTS.factoryERC1155Abi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            list.push(c as string);
          } catch (e) {
            console.error("1155 factory read error", i, e);
          }
        }
      }

      setAllCollections(list);
      setCollectionsLoaded(true);
    };

    fetchAll();
  }, [singleTotal, erc1155Total, publicClient]);

  /* ---------------------------------------------------------------- */
  /* debounce loader-to-content transition                            */
  /* ---------------------------------------------------------------- */
  const hardLoading =
    !ready ||
    singleLoading ||
    erc1155Loading ||
    busy ||
    !collectionsLoaded ||
    !nftsLoaded;

  useEffect(() => {
    if (hardLoading) {
      setShowContent(false);
      return;
    }
    const id = setTimeout(() => setShowContent(true), 300);
    return () => clearTimeout(id);
  }, [hardLoading]);

  /* ---------------------------------------------------------------- */
  /* fetch NFTs from Alchemy                                          */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    if (!ready || !address || allCollections.length === 0) return;

    const run = async () => {
      setBusy(true);
      setNftsLoaded(false);

      try {
        const alchemy = await getNFTsForOwner(address, allCollections);

        /* filter to our factories */
        const factories = new Set(allCollections.map((x) => x.toLowerCase()));
        const onlyFactory = alchemy.filter((n) =>
          factories.has(n.contract.address.toLowerCase())
        );

        /* expand 1155 balances */
        const expanded: AlchemyNFT[] = [];
        for (const n of onlyFactory) {
          if (n.tokenType === "ERC1155") {
            const bal = parseInt((n as any).balance ?? "1");
            for (let i = 0; i < bal; i++)
              expanded.push({
                ...n,
                uniqueId: `${n.contract.address}-${n.tokenId}-${i}`,
              });
          } else {
            expanded.push(n);
          }
        }

        setAlchemyNfts(expanded);

        /* group for legacy grid */
        const map: Record<string, bigint[]> = {};
        expanded.forEach((n) => {
          const key = n.contract.address.toLowerCase();
          (map[key] ??= []).push(BigInt(n.tokenId));
        });

        const grouped = Object.entries(map).map(([c, ids]) => ({
          collection: c as `0x${string}`,
          name: `Collection ${c.slice(2, 6)}`,
          ids,
        }));

        setOwned(grouped);
      } catch (e) {
        console.error("NFT load failed", e);
        setAlchemyNfts([]);
        setOwned([]);
      } finally {
        setBusy(false);
        setNftsLoaded(true);
      }
    };

    run();
  }, [ready, address, allCollections]);

  /* ---------------------------------------------------------------- */
  /* UI guards                                                         */
  /* ---------------------------------------------------------------- */
  if (!showContent) return <FullPageLoader message="Loading NFTs…" />;

  if (!address)
    return (
      <p className="text-center mt-12 text-zinc-400">
        🔗 Connect your wallet to view NFTs.
      </p>
    );

  if (allCollections.length === 0 && collectionsLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-3xl font-playfair font-bold text-zinc-400 mb-4">
            No Collections Found
          </h1>
          <p className="text-zinc-400">
            No collections are available from the factory contracts.
          </p>
        </div>
      </div>
    );

  if (owned.length === 0 && nftsLoaded)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-zinc-400">😢 No Cardify NFTs owned yet.</p>
      </div>
    );

  /* ---------------------------------------------------------------- */
  /* render grid                                                       */
  /* ---------------------------------------------------------------- */
  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Your NFTs</h1>

        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {alchemyNfts.map((nft, idx) => (
            <AlchemyNFTCard
              key={nft.uniqueId ?? `${nft.contract.address}-${nft.tokenId}-${idx}`}
              nft={nft}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
