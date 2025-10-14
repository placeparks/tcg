// components/BuyCard.tsx
"use client";

import { useState } from "react";
import Image               from "next/image";
import toast               from "react-hot-toast";
import {
  useAccount,
  useWriteContract,
  useSwitchChain,
  useChainId,
} from "wagmi";
import { formatEther }      from "viem";

import FullPageLoader       from "@/components/FullPageLoader";
import { Button }           from "@/components/ui/button";
import useEnsureBaseSepolia from "@/hooks/useEnsureNetwork";
import { CONTRACTS }        from "@/lib/contract";
import { watchAccount } from "@wagmi/core";
import { wagmi }  from "../app/providers";

const CHAIN_ID = 84532;

/* small helper */
const ipfsToHttp = (u: string) =>
  u.replace(/^ipfs:\/\//, "https://gateway.pinata.cloud/ipfs/");

export default function BuyCard({ item }: { item: any }) {
  /* ─── network guard ─── */
  useEnsureBaseSepolia();

  const { address }            = useAccount();
  const chainId                = useChainId();
  const { switchChainAsync }   = useSwitchChain();
  const { writeContractAsync } = useWriteContract();

  const [busy, setBusy] = useState(false);

  async function handleBuy() {
    if (!address) return toast.error("Connect wallet first");

    /* auto-switch network if needed */
    if (chainId !== CHAIN_ID) {
      try { 
     await switchChainAsync({ chainId: CHAIN_ID });
        // 🔐 wait until the wallet *really* moved
        await new Promise<void>((res, rej) => {
          const unwatch = watchAccount(wagmi, {
            onChange(acct) {
              if (!acct.isConnected) { unwatch(); rej(); }
              if (acct.chainId === CHAIN_ID) { unwatch(); res(); }
            },
          });
        });
       } catch {
         return toast.error("Please switch to Base-Sepolia");
       }
     }

    setBusy(true);
    toast.loading("Buying NFT…");

    try {
      // Assume ERC1155 for now - could be enhanced to detect token type
      await writeContractAsync({
        address:      CONTRACTS.marketplace,
        abi:          CONTRACTS.marketplaceAbi,
        functionName: "buy1155",
        args:   [item.collection, BigInt(item.id), 1n], // amount = 1 for ERC1155
        value:  item.price,
      });

      toast.dismiss();
      toast.success("NFT purchased!");
    } catch (err: any) {
      toast.dismiss();
      toast.error(err?.shortMessage || "Buy failed");
    } finally {
      setBusy(false);
    }
  }

  /* show global loader while tx is pending */
  if (busy) return <FullPageLoader message="Processing purchase…" />;

  /* ─── styled card ─── */
  return (
    <div className="relative mx-auto mt-16 max-w-sm group">

      {/* neon glow layers */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r
                      from-purple-500 via-pink-500 to-blue-500 opacity-0
                      blur-lg transition-opacity duration-700 group-hover:opacity-70" />
      <div className="absolute -inset-0.5 rounded-3xl bg-gradient-to-r
                      from-blue-500 via-purple-500 to-pink-500 opacity-0
                      blur-md transition-opacity duration-700 group-hover:opacity-40"
           style={{ animationDelay: "0.15s" }} />

      {/* glass card */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20
                      bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl
                      shadow-xl">
        {/* subtle inner glow on hover */}
        <div className="pointer-events-none absolute inset-0 rounded-3xl
                        bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10
                        opacity-0 transition-opacity duration-700 group-hover:opacity-100" />

        {/* image */}
        {item.metadata?.image && (
          <div className="relative">
            <Image
              src={ipfsToHttp(item.metadata.image)}
              alt={item.metadata?.name}
              width={600}
              height={600}
              className="object-cover w-full h-auto aspect-square rounded-t-3xl
                         transition-transform duration-700 group-hover:scale-105"
              priority
            />
          </div>
        )}

        {/* content */}
        <div className="p-6 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-white mb-1">
              {item.metadata?.name || "Untitled"}
            </h2>
            <p className="text-sm text-zinc-400">Token #{item.id}</p>
          </div>

          {/* price pill */}
          <div className="flex items-center justify-between bg-gradient-to-r
                          from-purple-500/20 to-pink-500/20 rounded-xl p-3">
            <span className="text-sm text-zinc-400">Price</span>
            <span className="text-lg font-bold bg-gradient-to-r
                             from-purple-400 to-pink-400 bg-clip-text text-transparent">
              {formatEther(item.price)} ETH
            </span>
          </div>

          <Button
            onClick={handleBuy}
            className="w-full bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600
                       hover:from-purple-700 hover:via-pink-700 hover:to-blue-700
                       border border-purple-500/50 hover:border-purple-400/70
                       font-semibold py-3 rounded-full transition-all duration-300"
          >
            Buy Now
          </Button>
        </div>
      </div>
    </div>
  );
}
