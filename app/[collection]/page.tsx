/* --------------------------------------------------------------------
 *  app/collection/[collection]/page.tsx
 * ------------------------------------------------------------------ */
"use client";

import { Suspense }            from "react";
import { useParams }           from "next/navigation";
import { useReadContract }     from "wagmi";
import { usePrivy }            from "@privy-io/react-auth";

import FullPageLoader          from "@/components/FullPageLoader";
import NFTCard                 from "@/components/NFTCard";
import useEnsureBaseSepolia    from "@/hooks/useEnsureNetwork";
import { CONTRACTS }           from "@/lib/contract";

/* make Next.js skip prerendering for this dynamic route */
export const dynamic = "force-dynamic";

/* ------------------------------------------------------------------ */
/*                              <Inner />                             */
/* ------------------------------------------------------------------ */
function Inner() {
  /* keeps user on Base-Sepolia */
  useEnsureBaseSepolia();

  /* dynamic route param */
  const { collection } = useParams() as { collection: `0x${string}` };

  /* Privy ready flag */
  const { ready } = usePrivy();

  /* on-chain total supply (poll every 10 s) - using ERC1155 instead of ERC721 */
  const { data, isPending } = useReadContract({
    address:       collection,
    abi:           CONTRACTS.nft1155Abi, // Using ERC1155 ABI instead of commented out nftAbi
    functionName:  "totalMinted", // ERC1155 uses totalMinted instead of tokenIdCounter
    query:         { refetchInterval: 10_000 },
  });

  /* derived */
  const total = Number(data ?? 0);
  const ids   = Array.from({ length: total }, (_, i) => BigInt(i));

  /* ---------------- loading ---------------- */
  if (!ready || isPending) {
    return <FullPageLoader message="Loading NFTs…" />;
  }

  /* ---------------- empty collection ---------------- */
  if (total === 0) {
    return (
      <p className="text-center mt-12 text-zinc-400">
        😢 No NFTs minted yet.
      </p>
    );
  }

  /* ---------------- main render ---------------- */
  return (
    <div className="p-6 md:p-8 grid gap-6 grid-cols-[repeat(auto-fill,minmax(260px,1fr))]">
      {ids.map(id => (
        <NFTCard key={id.toString()} collection={collection} id={id} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*                    Suspense wrapper + fallback                      */
/* ------------------------------------------------------------------ */
export default function CollectionPage() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading NFTs…" />}>
      <Inner />
    </Suspense>
  );
}
