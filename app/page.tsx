"use client"

import { useState, useEffect } from "react"
import {
  Wallet,
  Globe,
  Star,
  Sparkles,
  ArrowRight,
  Play,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function NFTMarketplace() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  const handleConnectWallet = () => {
    setIsWalletConnected(!isWalletConnected)
  }

  const FloatingOrb = ({ size, color, delay }: { size: string; color: string; delay: string }) => (
    <div
      className={`absolute ${size} ${color} rounded-full blur-xl opacity-20 animate-pulse`}
      style={{
        animationDelay: delay,
        transform: `translate(${mousePosition.x * 0.02}px, ${mousePosition.y * 0.02}px)`,
      }}
    />
  )

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated Background */}
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <FloatingOrb size="w-96 h-96" color="bg-purple-500" delay="0s" />
        <FloatingOrb size="w-64 h-64" color="bg-pink-500" delay="2s" />
        <FloatingOrb size="w-80 h-80" color="bg-blue-500" delay="4s" />
        <div className="absolute top-1/4 right-1/4 w-2 h-2 bg-white rounded-full animate-ping" />
        <div className="absolute top-3/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-pulse" />
        <div className="absolute top-1/2 right-1/3 w-1.5 h-1.5 bg-pink-400 rounded-full animate-bounce" />
      </div>

     {/* Hero Section */}
<section className="relative z-10 container mx-auto px-6 py-20">
  <div className="text-center max-w-6xl mx-auto">
    {/* Floating Badge */}
    <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-xl border border-white/20 rounded-full px-6 py-2 mb-8">
      <Star className="w-4 h-4 text-yellow-400" />
      <span className="text-sm font-medium">Exclusive Card Collection</span>
      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-black font-bold">LIVE</Badge>
    </div>

    <h1 className="text-6xl md:text-8xl font-serif font-black mb-8 leading-tight">
      <span className="block bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
        Explore
      </span>
      <span className="block bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent animate-pulse">
        AI-Generated
      </span>
      <span className="block bg-gradient-to-r from-white via-pink-200 to-white bg-clip-text text-transparent">
        Trading Cards
      </span>
    </h1>

    <p className="text-xl md:text-2xl text-gray-300 mb-12 max-w-3xl mx-auto leading-relaxed">
      Dive into a marketplace where{" "}
      <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-semibold">
        design meets rarity
      </span>{" "}
      and every card is a collectible masterpiece.
    </p>

    {/* Action Buttons */}
    <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
  <Button
  asChild                                
  size="lg"
  className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:scale-105 transition-all duration-300 px-12 py-4 text-lg font-bold rounded-full"
>
  <Link href="/collection">
    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
    <Play className="w-5 h-5 mr-2" />
    Browse Collection
    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
  </Link>
</Button>

    </div>

  </div>
</section>


      {/* Features Grid */}
    <section className="relative z-10 container mx-auto px-6 py-20">
  <div className="text-center mb-16">
    <h2 className="text-5xl font-bold mb-6">
      <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
        Why Choose
      </span>{" "}
      <span className="text-white">Cardify CLUB?</span>
    </h2>
    <p className="text-xl text-gray-300 max-w-2xl mx-auto">
      Everything you need to browse, design, and order exclusive AI‑generated trading cards in one collection‑specific marketplace.
    </p>
  </div>

<div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
  {[
    {
      icon: Sparkles,
      title: "AI-Consistent Card Creation",
      description:
        "Turn text prompts into collectible trading cards with stylistically consistent, AI-generated characters — no design skills required.",
      gradient: "from-green-500 to-emerald-500",
      delay: "0s",
    },
    {
      icon: Badge,
      title: "Studio-Grade Card Printing",
      description:
        "Print your cards on premium stock with options like holographic foil, matte finishes, and double-sided customization — shipped globally.",
      gradient: "from-blue-500 to-cyan-500",
      delay: "0.2s",
    },
    {
      icon: Globe,
      title: "Built for Collectors",
      description:
        "Browse curated collections, claim limited drops, and showcase your physical or digital cards in a community-driven marketplace.",
      gradient: "from-purple-500 to-pink-500",
      delay: "0.4s",
    },
  ].map((feature, index) => (
    <div key={index} className="group cursor-pointer" style={{ animationDelay: feature.delay }}>
      <Card className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all duration-500 group-hover:scale-105 h-full">
        <div
          className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`}
        />
        <CardContent className="p-8 relative z-10">
          <div
            className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300`}
          >
            <feature.icon className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-2xl font-bold text-white mb-4 group-hover:text-transparent group-hover:bg-gradient-to-r group-hover:from-purple-400 group-hover:to-pink-400 group-hover:bg-clip-text transition-all duration-300">
            {feature.title}
          </h3>
          <p className="text-gray-300 text-lg leading-relaxed">{feature.description}</p>
        </CardContent>
      </Card>
    </div>
  ))}
</div>

</section>


      {/* CTA Section */}
   <section className="relative z-10 container mx-auto px-6 py-20">
  <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 backdrop-blur-2xl border border-white/20 rounded-3xl p-12 text-center">
    <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 animate-pulse" />
    <div className="relative z-10">
      <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-full px-6 py-2 mb-8">
        <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
        <span className="text-sm font-medium text-yellow-300">Limited Drop Access</span>
      </div>

      <h2 className="text-5xl font-bold mb-6">
        <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
          Create. Collect. Customize.
        </span>
        <br />
        <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
          Start Your Cardify Journey
        </span>
      </h2>

      <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
        Join a fast-growing community crafting AI-generated trading cards—collect, print, and share your creations with the world.
      </p>

      <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
  <Button
  onClick={handleConnectWallet}
  size="lg"
  className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:scale-105 transition-all duration-300 px-12 py-4 text-lg font-bold rounded-full"
>
  <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
  <Wallet className="w-5 h-5 mr-2" />
  {isWalletConnected ? "Wallet Connected" : "Connect Wallet"}
  <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
</Button>

        <div className="text-sm text-gray-400">
          🎴 <span className="text-white font-semibold">New cards dropping daily</span>
        </div>
      </div>
    </div>
  </div>
</section>


    </div>
  )
}
