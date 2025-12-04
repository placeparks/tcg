"use client"

import Link from "next/link"
import { useCollectionMeta } from "@/hooks/useCollectionMeta"
import { ArrowRight, Sparkles, Eye, ExternalLink, Activity, Layers, Box } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import TiltCard from "@/components/ui/TiltCard"

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
  
  // Get theme colors based on type
  const themeColors = useMemo(() => {
    if (type === 'erc1155') {
      return {
        border: 'border-neon-purple/40',
        hoverBorder: 'hover:border-neon-purple/60',
        glow: 'rgba(176, 38, 255, 0.4)',
        badge: 'bg-gradient-to-r from-neon-purple/20 to-neon-purple/5 border-neon-purple/40',
        text: 'text-neon-purple',
        icon: 'text-neon-purple',
      }
    } else if (type === 'pack') {
      return {
        border: 'border-neon-pink/40',
        hoverBorder: 'hover:border-neon-pink/60',
        glow: 'rgba(255, 0, 255, 0.4)',
        badge: 'bg-gradient-to-r from-neon-pink/20 to-neon-pink/5 border-neon-pink/40',
        text: 'text-neon-pink',
        icon: 'text-neon-pink',
      }
    } else {
      return {
        border: 'border-neon-blue/40',
        hoverBorder: 'hover:border-neon-blue/60',
        glow: 'rgba(0, 243, 255, 0.4)',
        badge: 'bg-gradient-to-r from-neon-blue/20 to-neon-blue/5 border-neon-blue/40',
        text: 'text-neon-blue',
        icon: 'text-neon-blue',
      }
    }
  }, [type])

  // For pack collections, prioritize preview (pack_image_uri from database) over contract URI
  const effectiveImageUri = useMemo(() => {
    if (type === 'pack' && preview && (preview.startsWith('http://') || preview.startsWith('https://') || preview.startsWith('ipfs://'))) {
      // preview is pack_image_uri from database (HTTP or IPFS URL), use it directly
      return preview;
    }
    return imageUri;
  }, [type, preview, imageUri]);

  useEffect(() => {
    let mounted = true
    ;(async () => {
      // For pack collections with direct HTTP URL in preview, use it directly
      if (type === 'pack' && preview && (preview.startsWith('http://') || preview.startsWith('https://'))) {
        if (mounted) setResolvedSrc(preview);
        return;
      }
      
      if (!effectiveImageUri) {
        if (mounted) setResolvedSrc(null)
        return
      }
      
      try {
        // Use server-side API route to avoid CORS issues
        const response = await fetch(
          `/api/ipfs-metadata?src=${encodeURIComponent(effectiveImageUri)}&tokenId=${tokenId.toString()}`
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
  }, [effectiveImageUri, tokenId, type, preview])

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

  // Build the URL with type filter
  const collectionUrl = useMemo(() => {
    const typeParam = type === 'erc1155' ? 'erc1155' : type === 'pack' ? 'pack' : 'single';
    return `/collection?type=${typeParam}`;
  }, [type]);

  return (
    <Link
      href={collectionUrl}
      className="group block w-full"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <TiltCard className="h-full w-full" glowColor={themeColors.glow}>
        <div 
          className={`relative bg-gradient-to-br from-gray-900/95 via-gray-900/90 to-black/95 backdrop-blur-xl rounded-xl overflow-hidden border ${themeColors.border} ${themeColors.hoverBorder} transition-all duration-300 shadow-[0_0_20px_rgba(0,0,0,0.3)]`}
          style={{ 
            boxShadow: isHovered ? `0 0 30px ${themeColors.glow}` : '0 0 20px rgba(0,0,0,0.3)'
          }}
        >
          
          {/* Image Container */}
          <div className="relative aspect-square overflow-hidden bg-gray-900">
            {/* Type Badge */}
            <div className="absolute top-4 right-4 z-20">
              <div className={`${themeColors.badge} rounded-lg px-3 py-1.5 border backdrop-blur-sm shadow-lg`}>
                <div className="flex items-center gap-2">
                  {type === 'erc1155' && <Layers className={`w-3.5 h-3.5 ${themeColors.icon}`} />}
                  {type === 'pack' && <Box className={`w-3.5 h-3.5 ${themeColors.icon}`} />}
                  {type === 'single' && <Activity className={`w-3.5 h-3.5 ${themeColors.icon}`} />}
                  <span className={`text-[10px] font-display font-bold uppercase tracking-widest ${themeColors.text}`}>
                    {type === 'erc1155' ? 'HYBRID' : type === 'pack' ? 'PACK' : 'SINGLE'}
                  </span>
                </div>
              </div>
            </div>

            {/* Decorative Tech Lines */}
            <div className="absolute top-4 left-4 w-16 h-[1px] bg-gradient-to-r from-white/50 to-transparent z-10" />
            <div className="absolute top-4 left-4 w-[1px] h-16 bg-gradient-to-b from-white/50 to-transparent z-10" />
            
            <img
              key={proxySrc}
              src={proxySrc}
              crossOrigin="anonymous"
              referrerPolicy="no-referrer"
              alt={name || "NFT Collection"}
              className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setImageLoaded(true)}
              onError={(e) => {
                (e.target as HTMLImageElement).src = fallback
                setImageLoaded(true)
              }}
            />
            
            {/* Gradient Overlays */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80" />
            
            {/* Loading State */}
            {(!imageLoaded || isLoading) && (
              <div className="absolute inset-0 bg-gray-900 flex items-center justify-center z-10">
                <div className="relative">
                  <div className={`w-12 h-12 rounded-full border-2 ${themeColors.border} animate-spin`} style={{ borderTopColor: 'transparent' }} />
                  <Sparkles className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 ${themeColors.icon} animate-pulse`} />
                </div>
              </div>
            )}
            
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center z-10">
              <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                <div className="bg-white/10 backdrop-blur-md rounded-full p-4 shadow-[0_0_20px_rgba(0,0,0,0.5)] border border-white/20">
                  <ExternalLink className={`w-6 h-6 ${themeColors.icon}`} />
                </div>
              </div>
            </div>

            {/* Bottom glow line on hover */}
            <div className={`absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700 bg-gradient-to-r from-transparent via-white to-transparent`} />
          </div>

          {/* Content */}
          <div className="p-5 bg-gradient-to-b from-gray-900/80 to-black/90 relative">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:20px_20px] opacity-20 pointer-events-none" />
            
            <div className="relative z-10">
              <div className="mb-4">
                <h3 className="font-display font-bold text-xl text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300 transition-all duration-300 truncate">
                  {isLoading ? (
                    <div className="h-6 bg-gray-700/50 rounded animate-pulse"></div>
                  ) : (
                    name || "Unnamed Collection"
                  )}
                </h3>
                <div className="flex items-center gap-3">
                  {isLoading ? (
                    <div className="h-4 w-20 bg-gray-700/50 rounded animate-pulse"></div>
                  ) : (
                    <span className="text-xs font-mono text-gray-400 uppercase tracking-widest font-bold">
                      {symbol || "SYMBOL"}
                    </span>
                  )}
                  <div className="w-1 h-1 bg-gray-600 rounded-full"></div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
                    <span className="text-[10px] text-green-400 font-mono font-bold uppercase tracking-wider">ACTIVE</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/10">
                <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
                  <Eye className={`w-4 h-4 ${themeColors.icon}`} />
                  <span className="uppercase tracking-wider">View</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-[10px] text-gray-500 font-mono bg-black/60 backdrop-blur-sm px-2 py-1 rounded border border-white/10">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </div>
                  <ArrowRight className={`w-4 h-4 ${themeColors.icon} group-hover:translate-x-1 transition-transform`} />
                </div>
              </div>
            </div>
          </div>

          {/* Outer glow effect */}
          <div className="absolute -inset-1 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none -z-10 blur-md" style={{ background: `linear-gradient(135deg, ${themeColors.glow}, transparent)` }} />
        </div>
      </TiltCard>
    </Link>
  )
}
