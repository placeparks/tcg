"use client"

import Link from "next/link"
import { useCollectionMeta } from "@/hooks/useCollectionMeta"
import { ArrowRight, Sparkles, Eye, ExternalLink } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
// Removed resolveDisplayImageUrl import - now using server-side API route

interface Props {
  address: string
  preview: string
  tokenId?: bigint | number // default 0 for collection cover if you want
  type?: 'erc1155' | 'single' | 'pack' // collection type for hybrid badge
}

export default function CollectionCard({ address, preview, tokenId = 0n, type = 'single' }: Props) {
  const { name, symbol, imageUri, isLoading, isError } = useCollectionMeta(address as `0x${string}`, type)
  const [isHovered, setIsHovered] = useState(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [resolvedSrc, setResolvedSrc] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!imageUri) {
        if (mounted) setResolvedSrc(null)
        return
      }
      
      try {
        // Use server-side API route to avoid CORS issues
        const response = await fetch(
          `/api/ipfs-metadata?src=${encodeURIComponent(imageUri)}&tokenId=${tokenId.toString()}`
        )
        
        if (response.ok) {
          const data = await response.json()
          if (mounted) setResolvedSrc(data.imageUrl || null)
        } else {
          console.error('Failed to resolve image URL:', response.statusText)
          if (mounted) setResolvedSrc(null)
        }
      } catch (error) {
        console.error('Error resolving image URL:', error)
        if (mounted) setResolvedSrc(null)
      }
    })()
    return () => { mounted = false }
  }, [imageUri, tokenId])

  const fallback = useMemo(() => preview || "/cardifyN.png", [preview])

  const proxySrc = useMemo(() => {
    if (!resolvedSrc) return fallback;
    // If it's a non-IPFS HTTP URL (e.g., Arweave), use it directly
    const isHttp = /^https?:\/\//i.test(resolvedSrc);
    const isHttpIpfsGateway = /^https?:\/\/[^/]+\/ipfs\//i.test(resolvedSrc);
    if (isHttp && !isHttpIpfsGateway) return resolvedSrc;
    // Normalize any HTTP IPFS gateway back to ipfs:// for the proxy
    const ipfsish = isHttpIpfsGateway
      ? resolvedSrc.replace(/^https?:\/\/[^/]+\/ipfs\//i, "ipfs://")
      : resolvedSrc;
    if (/^ipfs:\/\//i.test(ipfsish)) {
      return `/api/ipfs-image?src=${encodeURIComponent(ipfsish)}`;
    }
    return fallback;
  }, [resolvedSrc, fallback]);

  return (
    <Link
      href={`/${address}`}
      className="group block w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden border border-white/20 hover:border-white/40 group-hover:scale-[1.02] group-hover:shadow-2xl group-hover:shadow-purple-500/20">
        
        {/* Image Container */}
        <div className="relative aspect-square overflow-hidden">
          {/* Hybrid Badge for ERC1155 collections */}
          {type === 'erc1155' && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                Hybrid
              </div>
            </div>
          )}
          {/* Pack Badge for Pack collections */}
          {type === 'pack' && (
            <div className="absolute top-3 right-3 z-10">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow-lg">
                Pack
              </div>
            </div>
          )}
          <img
            key={proxySrc}
            src={proxySrc}
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            alt={name || "NFT Collection"}
            className={`w-full h-full object-cover transition-all duration-500 group-hover:scale-105 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
            onLoad={() => setImageLoaded(true)}
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallback
              setImageLoaded(true)
            }}
          />
          
          {/* Loading State */}
          {(!imageLoaded || isLoading) && (
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center animate-spin">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
            </div>
          )}
          
          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300 flex items-center justify-center">
            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-2 group-hover:translate-y-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-full p-3 shadow-lg border border-white/30">
                <ExternalLink className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-white text-xl mb-2 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300 truncate">
                {isLoading ? (
                  <div className="h-6 bg-gray-600/50 rounded animate-pulse"></div>
                ) : (
                  name || "Unnamed Collection"
                )}
              </h3>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <div className="h-4 w-16 bg-gray-600/50 rounded animate-pulse"></div>
                ) : (
                  <span className="text-sm text-gray-400 uppercase tracking-wider font-medium">
                    {symbol || "SYMBOL"}
                  </span>
                )}
                <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-400 font-medium">Active</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <div className="w-6 h-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
                <Eye className="w-3 h-3 text-white" />
              </div>
              <span>View Collection</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-gray-500 font-mono bg-white/10 backdrop-blur-sm px-2 py-1 rounded border border-white/20">
                {address.slice(0, 6)}...{address.slice(-4)}
              </div>
              <div className={`text-xs px-2 py-1 rounded font-medium ${
                type === 'erc1155' 
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' 
                  : type === 'pack'
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
              }`}>
                {type === 'erc1155' ? 'ERC1155' : type === 'pack' ? 'Pack' : 'Single'}
              </div>
            </div>
          </div>
        </div>

        {/* Gradient glow effect */}
        <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-blue-500/20 blur-xl" />
        </div>
      </div>
    </Link>
  )
}
