/* -------------------------------------------------------------------- *
 *  app/collection/page.tsx
 * ------------------------------------------------------------------ */
"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import {
  useReadContract,
  usePublicClient,
} from "wagmi"
import { usePrivy }    from "@privy-io/react-auth"
import { Sparkles }    from "lucide-react"

import FullPageLoader  from "@/components/FullPageLoader"
import useEnsureBase   from "@/hooks/useEnsureNetwork"
import CollectionCard  from "@/components/CollectionCard"
import { CONTRACTS }   from "@/lib/contract"

/* ---------- tiny helpers ---------- */
const Empty = ({ msg }: { msg: string }) => (
  <div className="min-h-screen flex items-center justify-center">
    <p className="text-gray-400 text-center">{msg}</p>
  </div>
)

/* ---------- finite states ---------- */
type View = "loading" | "ready" | "empty"

/* ------------------------------------------------------------------ */
function Inner() {
  useEnsureBase()

  /* wagmi / privy */
  const { ready } = usePrivy()
  const publicClient = usePublicClient({ chainId: 84532 })
  const [{ data: erc1155Total = 0n }, { data: singleTotal = 0n }] =
    useReadContract({
      address:      CONTRACTS.factoryERC1155,
      abi:          CONTRACTS.factoryERC1155Abi,
      functionName: "totalCollections",
    }).concat(
      useReadContract({
        address:      CONTRACTS.singleFactory,
        abi:          CONTRACTS.singleFactoryAbi,
        functionName: "totalCollections",
      })
    )

  /* ---------- collections + metadata ---------- */
  const [collections, setCollections] = useState<
    { address: string; type: "erc1155" | "single" }[]
  >([])
  const [meta, setMeta] = useState<Record<string, any>>({})

  /* ---------- 1. fetch collection addresses ---------- */
  useEffect(() => {
    if (!publicClient || !ready) return
    ;(async () => {
      const all: { address: string; type: "erc1155" | "single" }[] = []

      for (let i = 0; i < Number(erc1155Total); i++) {
        const addr = await publicClient.readContract({
          address: CONTRACTS.factoryERC1155,
          abi: CONTRACTS.factoryERC1155Abi,
          functionName: "allCollections",
          args: [BigInt(i)],
        })
        all.push({ address: addr as string, type: "erc1155" })
      }
      for (let i = 0; i < Number(singleTotal); i++) {
        const addr = await publicClient.readContract({
          address: CONTRACTS.singleFactory,
          abi: CONTRACTS.singleFactoryAbi,
          functionName: "allCollections",
          args: [BigInt(i)],
        })
        all.push({ address: addr as string, type: "single" })
      }
      setCollections(all)
    })()
  }, [erc1155Total, singleTotal, publicClient, ready])

  /* ---------- 2. fetch metadata ---------- */
  useEffect(() => {
    if (!publicClient || collections.length === 0) return
    ;(async () => {
      const m: Record<string, any> = {}
      await Promise.all(
        collections.map(async ({ address, type }) => {
          const abi =
            type === "erc1155" ? CONTRACTS.nft1155Abi : CONTRACTS.singleCollectionAbi
          try {
            const [name, symbol] = await Promise.all([
              publicClient.readContract({ address, abi, functionName: "name" }),
              publicClient.readContract({ address, abi, functionName: "symbol" }),
            ])
            m[address] = { name, symbol, type }
          } catch {
            m[address] = { name: address.slice(0, 6), symbol: "???", type }
          }
        })
      )
      setMeta(m)
    })()
  }, [collections, publicClient])

  /* ---------- derived view ---------- */
  const view: View = useMemo(() => {
    if (!ready || collections.length === 0 && (erc1155Total > 0n || singleTotal > 0n))
      return "loading"
    if (collections.length === 0) return "empty"
    if (Object.keys(meta).length < collections.length) return "loading"
    return "ready"
  }, [ready, collections, meta, erc1155Total, singleTotal])

  /* ---------- render ---------- */
  if (view === "loading") return <FullPageLoader message="Loading collections…" />
  if (view === "empty")   return <Empty msg="No collections yet." />

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Collections</h1>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {collections.map(({ address, type }) => (
            <CollectionCard
              key={address}
              address={address}
              preview={CONTRACTS.collectionPreview(address)}
              type={type}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
export default function CollectionPage() {
  return (
    <Suspense fallback={<FullPageLoader message="Loading collections…" />}>
      <Inner />
    </Suspense>
  )
}
