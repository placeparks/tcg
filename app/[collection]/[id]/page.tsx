
"use client";

import { Suspense, useEffect, useState } from "react";
import { useParams }                   from "next/navigation";
import { usePublicClient }             from "wagmi";

import FullPageLoader                  from "@/components/FullPageLoader";
import BuyCard                         from "@/components/BuyCard";
import useEnsureBaseSepolia            from "@/hooks/useEnsureNetwork";
import { CONTRACTS }                   from "@/lib/contract";

const ipfsToHttp = (u: string) =>
  u.replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/");

function Inner() {
  useEnsureBaseSepolia();

  const { collection, id } = useParams() as {
    collection: `0x${string}`;
    id:         string;
  };

  const client = usePublicClient({ chainId: 84532 })!;
  const [nft, setNft] = useState<
    | null
    | {
        collection: `0x${string}`;
        id:         number;
        price:      bigint;
        metadata:   any;
      }
  >(null);

  useEffect(() => {
    (async () => {
      try {
        const tokenId   = BigInt(id);
        const listing   = (await client.readContract({
          address:       CONTRACTS.marketplace,
          abi:           CONTRACTS.marketplaceAbi,
          functionName:  "listings1155",
          args:          [collection, tokenId],
        })) as readonly [`0x${string}`, bigint];

        const uri       = (await client.readContract({
          address:       collection,
          abi:           CONTRACTS.nft1155Abi, // Using ERC1155 ABI instead of commented out nftAbi
          functionName:  "uri", // ERC1155 uses uri instead of tokenURI
          args:          [tokenId],
        })) as string;

        const metadata  = await fetch(ipfsToHttp(uri)).then(r => r.json());

        setNft({
          collection,
          id:     Number(id),
          price:  listing[1], // price is the second element (index 1) in the tuple
          metadata,
        });
      } catch (err) {
        console.error("Failed to load NFT", err);
      }
    })();
  }, [client, collection, id]);

  /* still fetching */
  if (!nft) return <FullPageLoader message="Loading NFT…" />;

  /* ready */
  return <BuyCard item={nft} />;
}

/* tell Next.js this route is always dynamic (no static prerender) */
export const dynamic = "force-dynamic";

/* wrap inner component in Suspense so CSR hooks don’t bail out */
export default function NftDetail() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading NFT…" />}>
      <Inner />
    </Suspense>
  );
}
