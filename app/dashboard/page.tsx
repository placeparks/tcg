/* app/dashboard/page.tsx  ───────────────────────────────────────────── */
/* full replacement – drop in and replace existing file                 */

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
/* component                                                          */
/* ------------------------------------------------------------------ */
export default function Dashboard() {
  /* wallets */
  const { ready } = usePrivy();
  const { address } = useAccount();

  /* state */
  const [busy, setBusy] = useState(false);
  const [owned, setOwned] = useState<
    { collection: `0x${string}`; name: string; ids: bigint[] }[]
  >([]);
  const [alchemyNfts, setAlchemyNfts] = useState<AlchemyNFT[]>([]);
  const [allCollections, setAllCollections] = useState<string[]>([]);
  const [collectionsLoaded, setCollectionsLoaded] = useState(false); // NEW
  const [showContent, setShowContent] = useState(false);

  /* ------------------------------------------------------------------ */
  /* contract reads – totals                                            */
  /* ------------------------------------------------------------------ */
  const { data: singleNftTotal, isPending: singleLoading, error: singleErr } =
    useReadContract({
      address: CONTRACTS.singleFactory as `0x${string}`,
      abi: CONTRACTS.singleFactoryAbi,
      functionName: "totalCollections",
      query: { enabled: !!address },
    });

  const { data: erc1155Total, isPending: erc1155Loading, error: erc1155Err } =
    useReadContract({
      address: CONTRACTS.factoryERC1155 as `0x${string}`,
      abi: CONTRACTS.factoryERC1155Abi,
      functionName: "totalCollections",
      query: { enabled: !!address },
    });

  const publicClient = usePublicClient({ chainId: CHAIN_ID });

  /* ------------------------------------------------------------------ */
  /* fetch all collections once totals are known                        */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!publicClient || (!singleNftTotal && !erc1155Total)) return;

    const fetchAll = async () => {
      setCollectionsLoaded(false);
      const collections: string[] = [];

      // single-NFT factory
      if (singleNftTotal) {
        for (let i = 0; i < Number(singleNftTotal); i++) {
          try {
            const c = await publicClient.readContract({
              address: CONTRACTS.singleFactory as `0x${string}`,
              abi: CONTRACTS.singleFactoryAbi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            collections.push(c as string);
          } catch (e) {
            console.error("single factory read error", i, e);
          }
        }
      }

      // ERC-1155 factory
      if (erc1155Total) {
        for (let i = 0; i < Number(erc1155Total); i++) {
          try {
            const c = await publicClient.readContract({
              address: CONTRACTS.factoryERC1155 as `0x${string}`,
              abi: CONTRACTS.factoryERC1155Abi,
              functionName: "allCollections",
              args: [BigInt(i)],
            });
            collections.push(c as string);
          } catch (e) {
            console.error("1155 factory read error", i, e);
          }
        }
      }

      setAllCollections(collections);
      setCollectionsLoaded(true);
    };

    fetchAll();
  }, [singleNftTotal, erc1155Total, publicClient]);

  /* ------------------------------------------------------------------ */
  /* debounce small flash while nothing is loading                      */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const loading = singleLoading || erc1155Loading || busy;
    if (!loading) {
      const id = setTimeout(() => setShowContent(true), 300);
      return () => clearTimeout(id);
    }
  }, [singleLoading, erc1155Loading, busy]);

  /* ------------------------------------------------------------------ */
  /* load NFTs from Alchemy                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    if (!ready || !address || allCollections.length === 0) return;

    const run = async () => {
      setBusy(true);

      try {
        const alchemy = await getNFTsForOwner(address, allCollections);

        if (!alchemy.length) {
          setOwned([]);
          setAlchemyNfts([]);
          return;
        }

        /* simple filter + flatten for 1155 balances */
        const factories = new Set(allCollections.map((x) => x.toLowerCase()));
        const filtered = alchemy.filter((n) =>
          factories.has(n.contract.address.toLowerCase())
        );

        const expanded: AlchemyNFT[] = [];
        filtered.forEach((n) => {
          if (n.tokenType === "ERC1155") {
            const bal = parseInt((n as any).balance ?? "1");
            for (let i = 0; i < bal; i++)
              expanded.push({ ...n, uniqueId: `${n.contract.address}-${n.tokenId}-${i}` });
          } else {
            expanded.push(n);
          }
        });

        setAlchemyNfts(expanded);

        /* group by contract for legacy UI */
        const map: Record<string, bigint[]> = {};
        expanded.forEach((n) => {
          const key = n.contract.address.toLowerCase();
          (map[key] ??= []).push(BigInt(n.tokenId));
        });

        const out = Object.entries(map).map(([c, ids]) => ({
          collection: c as `0x${string}`,
          name: `Collection ${c.slice(2, 6)}`, // quick placeholder name
          ids,
        }));

        setOwned(out);
      } catch (e) {
        console.error("load NFTs failed", e);
        setOwned([]);
        setAlchemyNfts([]);
      } finally {
        setBusy(false);
      }
    };

    run();
  }, [ready, address, allCollections]);

  /* ------------------------------------------------------------------ */
  /* gates & loaders                                                    */
  /* ------------------------------------------------------------------ */
  const isLoading =
    !ready || singleLoading || erc1155Loading || busy || !showContent;

  if (isLoading) return <FullPageLoader message="Loading NFTs…" />;

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

  if (owned.length === 0)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-2xl text-zinc-400">😢 No Cardify NFTs owned yet.</p>
      </div>
    );

  /* ------------------------------------------------------------------ */
  /* render                                                             */
  /* ------------------------------------------------------------------ */
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
