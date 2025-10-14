"use client"

import Link from "next/link"
import { usePrivy } from "@privy-io/react-auth"
import Jazzicon from "react-jazzicon"
import { Wallet, Menu, X, Search, Sparkles, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { shortAddress } from "@/lib/utils"
import { useState, KeyboardEventHandler } from "react"  
import { useRouter } from "next/navigation"

function Avatar({ address }: { address: string }) {
  const seed = parseInt(address.slice(2, 10), 16)
  return <Jazzicon seed={seed} diameter={20} />
}

export default function Navbar() {
    const [query, setQuery] = useState("")
  const router = useRouter()  
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const { ready, authenticated, login, logout, user } = usePrivy()
  const addr = user?.wallet?.address as `0x${string}` | undefined

    const goSearch = () => {
    if (query.trim()) router.push(`/collection?search=${encodeURIComponent(query.trim())}`)
  }

  const handleKeyDown: KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") {
      e.preventDefault()
      goSearch()
    }
  }

  return (
    <header className="relative z-50 border-b border-white/10 backdrop-blur-2xl bg-black/40 sticky top-0">
      <div className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
       <Link
  href="/"
  className="flex items-center space-x-3 group cursor-pointer select-none"
>
  {/* icon */}
  <div className="relative">
    <div
      className="w-10 h-10 rounded-xl bg-gradient-to-r
                 from-purple-500 via-pink-500 to-blue-500
                 flex items-center justify-center
                 transform transition-transform duration-300
                 group-hover:rotate-12"
    >
      <Sparkles className="w-6 h-6 text-white" />
    </div>
    <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-green-400 animate-pulse" />
  </div>

  {/* text */}
  <div>
    <h1 className="text-2xl font-bold leading-none">
      <span className="mr-1 bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">TCG</span>
      <span>
        META
      </span>
    </h1>
    <p className="text-xs text-gray-400">NFT&nbsp;Marketplace</p>
  </div>
</Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
                 <Link href="/collection" className="relative text-gray-300 hover:text-white transition-all duration-300 group py-2">
                  Collections
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300" />
                </Link>
              <Link href="/mint-now" className="relative text-gray-300 hover:text-white transition-all duration-300 group py-2">
                <span className="flex items-center gap-2">
                  Mint Now
                  <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white">New</span>
                </span>
                <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300" />
              </Link>
              {authenticated && addr && (
                <>
                <Link href="/dashboard" className="relative text-gray-300 hover:text-white transition-all duration-300 group py-2">
                  My NFTs
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300" />
                </Link>
                <Link href="/buy" className="relative text-gray-300 hover:text-white transition-all duration-300 group py-2">
                  Buy
                  <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-pink-500 group-hover:w-full transition-all duration-300" />
                </Link>
              </>
            )}
         
          </nav>

          {/* Search + Wallet */}
          <div className="hidden lg:flex items-center space-x-4">
         {/* 🔍 Search box */}
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full blur opacity-30 group-hover:opacity-50 transition-opacity" />
              <div className="relative bg-black/50 backdrop-blur-xl border border-white/20 rounded-full p-3 flex items-center space-x-3">
                <Search
                  onClick={goSearch}                     // ⬅️ click-to-search
                  className="w-4 h-4 text-gray-400 cursor-pointer"
                />
              <Input
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      onKeyDown={handleKeyDown}   
      placeholder="Search collections..."
      className="bg-transparent border-none text-white placeholder-gray-400 w-48 focus:ring-0"
    />
              </div>
            </div>


            {ready ? (
              authenticated && addr ? (
                <Button
                  onClick={logout}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full font-semibold hover:scale-105 transition"
                >
                  <Avatar address={addr} />
                  <span className="font-mono text-sm">{shortAddress(addr)}</span>
                  <LogOut className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  onClick={login}
                  className="bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 text-white px-6 py-2 rounded-full font-semibold hover:scale-105 transition"
                >
                  Connect Wallet
                </Button>
              )
            ) : (
              <div className="animate-pulse h-9 w-28 rounded-lg bg-white/10" />
            )}
          </div>

          {/* Mobile Menu Toggle */}
          <button
            className="lg:hidden relative z-10 p-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/20"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-2xl border-b border-white/10 p-6">
            <nav className="flex flex-col space-y-6">
              <Link href="/collection" className="text-gray-300 hover:text-white transition-colors text-lg">
                Collections
              </Link>
              <Link href="/mint-now" className="text-gray-300 hover:text-white transition-colors text-lg flex items-center gap-2">
                Mint Now
                <span className="px-2 py-0.5 text-xs bg-gradient-to-r from-purple-500 to-pink-500 rounded-full text-white">New</span>
              </Link>
              {authenticated && addr && (
                <>
                  <Link href="/dashboard" className="text-gray-300 hover:text-white transition-colors text-lg">
                    My NFTs
                  </Link>
                  <Link href="/buy" className="text-gray-300 hover:text-white transition-colors text-lg">
                    Buy
                  </Link>
                </>
              )}
             
              <div className="pt-4 border-t border-white/10">
                {ready ? (
                  authenticated && addr ? (
                    <Button
                      onClick={logout}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 rounded-full py-3"
                    >
                      <Avatar address={addr} />
                      <span className="ml-2">{shortAddress(addr)}</span>
                      <LogOut className="ml-auto w-4 h-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={login}
                      className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full py-3"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Connect Wallet
                    </Button>
                  )
                ) : (
                  <div className="animate-pulse h-9 w-full rounded-lg bg-white/10" />
                )}
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  )
}
