/* --------------------------------------------------------------------
 *  app/collection/page.tsx – unified, flicker‑free version
 * ------------------------------------------------------------------ */
"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  useReadContract,
  usePublicClient,
} from "wagmi"
import { usePrivy } from "@privy-io/react-auth"

import FullPageLoader from "@/components/FullPageLoader"
import useEnsureBase from "@/hooks/useEnsureNetwork"
import CollectionCard from "@/components/CollectionCard"
import { CONTRACTS } from "@/lib/contract"

/* ------------------------------------------------------------------ */
const Empty = ({ msg }: { msg: string }) => (
  <div className="min-h-screen flex items-center justify-center text-gray-400 text-center px-4">
    {msg}
  </div>
)

type View = "loading" | "ready" | "empty" | "error"

/* ------------------------------------------------------------------ */
function Inner() {
  /* enforce Base‑Sepolia */
  useEnsureBase()

  /* external hooks */
  const { ready } = usePrivy()
  const searchParams = useSearchParams()
  const keyword = (searchParams.get("search") || "").toLowerCase()
  const publicClient = usePublicClient({ chainId: 84532 })

  /* ───── factory counters (two independent hooks) ───── */
  const {
    data: erc1155Total = 0n,
    isPending: erc1155Pending,
    error: erc1155Error,
  } = useReadContract({
    address: CONTRACTS.factoryERC1155,
    abi: CONTRACTS.factoryERC1155Abi,
    functionName: "totalCollections",
    query: { enabled: !!CONTRACTS.factoryERC1155 },
  })

  const {
    data: singleTotal = 0n,
    isPending: singlePending,
    error: singleError,
  } = useReadContract({
    address: CONTRACTS.singleFactory,
    abi: CONTRACTS.singleFactoryAbi,
    functionName: "totalCollections",
    query: { enabled: !!CONTRACTS.singleFactory },
  })

  /* ───── state ───── */
  const [collections, setCollections] = useState<
    { address: string; type: "erc1155" | "single" }[]
  >([])
  const [meta, setMeta] = useState<Record<string, any>>({})

  /* ───── fetch collection addresses ───── */
  useEffect(() => {
    if (!publicClient || !ready) return
    ;(async () => {
      const list: { address: string; type: "erc1155" | "single" }[] = []

      for (let i = 0; i < Number(erc1155Total); i++) {
        const addr = await publicClient.readContract({
          address: CONTRACTS.factoryERC1155,
          abi: CONTRACTS.factoryERC1155Abi,
          functionName: "allCollections",
          args: [BigInt(i)],
        })
        list.push({ address: addr as string, type: "erc1155" })
      }

      for (let i = 0; i < Number(singleTotal); i++) {
        const addr = await publicClient.readContract({
          address: CONTRACTS.singleFactory,
          abi: CONTRACTS.singleFactoryAbi,
          functionName: "allCollections",
          args: [BigInt(i)],
        })
        list.push({ address: addr as string, type: "single" })
      }

      setCollections(list)
    })()
  }, [erc1155Total, singleTotal, publicClient, ready])

  /* ───── fetch metadata for each collection ───── */
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
              publicClient.readContract({ address: address as `0x${string}`, abi, functionName: "name" }),
              publicClient.readContract({ address: address as `0x${string}`, abi, functionName: "symbol" }),
            ])
            m[address] = { name, symbol, type }
          } catch {
            m[address] = { name: address.slice(0, 6), symbol: "??", type }
          }
        })
      )
      setMeta(m)
    })()
  }, [collections, publicClient])

  /* ───── view state derivation ───── */
  const view: View = useMemo(() => {
    if (!ready || erc1155Pending || singlePending) return "loading"
    if (erc1155Error || singleError) return "error"
    if (erc1155Total === 0n && singleTotal === 0n) return "empty"
    if (Object.keys(meta).length < collections.length) return "loading"
    return "ready"
  }, [
    ready,
    erc1155Pending,
    singlePending,
    erc1155Error,
    singleError,
    erc1155Total,
    singleTotal,
    meta,
    collections.length,
  ])

  /* ───── keyword filter ───── */
  const visible = useMemo(() => {
    const base = collections.map(c => ({ ...c, ...meta[c.address] }))
    if (!keyword) return base
    return base.filter(col => col.name?.toLowerCase().includes(keyword))
  }, [collections, meta, keyword])

  /* ───── renders ───── */
  if (view === "loading") return <FullPageLoader message="Loading collections…" />
  if (view === "error")   return <Empty msg="Error loading factory counters." />
  if (view === "empty")   return <Empty msg="No collections yet." />
  // show empty state **only** after everything is ready **and** a real keyword exists
if (view === "ready" && keyword && keyword.trim().length > 0 && visible.length === 0) {
  return <Empty msg={`No results for “${keyword}”.`} />
}
if (!keyword && visible.length === 0) return <FullPageLoader message="Loading collections…" />;

  return (
    <div className="min-h-screen bg-black">
      <div className="container mx-auto px-6 py-20">
        <h1 className="text-3xl font-bold text-white mb-8">Collections</h1>
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map(({ address, type }) => (
            <CollectionCard
              key={address}
              address={address}
              preview={CONTRACTS.collectionPreview(address as `0x${string}`)}
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
