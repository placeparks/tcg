"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Wallet, Globe, Star, Sparkles, ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function NFTMarketplace() {
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [active, setActive] = useState(0)
  const [hasSpun, setHasSpun] = useState(false)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  // Prevent mobile bounce without locking body scroll
  useEffect(() => {
    const prevOverscrollBehavior = document.body.style.overscrollBehavior
    
    // Prevent mobile bounce but allow scrolling
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overscrollBehavior = "none"
    
    return () => {
      document.documentElement.style.overscrollBehavior = ""
      document.body.style.overscrollBehavior = prevOverscrollBehavior
    }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setMouse({ x: (e as any).clientX, y: (e as any).clientY })
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  const handleConnectWallet = () => setIsWalletConnected(v => !v)

  const scenes = useMemo(
    () => [
      { title: "Trading Cards", src: "/clip2.mp4", hint: "Scroll for AI-Generated" },
      { title: "NFT", src: "/clip3.mp4", hint: "Scroll for Trading Cards" },
      { title: "Exchange", src: "/clip4.mp4", hint: "Scroll to continue" },
    ],
    []
  )

  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const videoRefs = useRef<Array<HTMLVideoElement | null>>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Play first video immediately so it's visible without scrolling
  useEffect(() => {
    const v0 = videoRefs.current[0]
    if (v0) {
      v0.classList.add("video-fade-in")
      v0.play().catch(() => {})
    }
  }, [])

  // Handle touch events to prevent bounce (non-passive)
  useEffect(() => {
    const scrollElement = scrollRef.current
    if (!scrollElement) return

    const handleTouchMove = (e: TouchEvent) => {
      const el = e.currentTarget as HTMLElement
      // Only prevent default at the very edges to allow normal scrolling
      if (
        (el.scrollTop <= 0 && e.touches[0].clientY > 0) ||
        (el.scrollTop + el.clientHeight >= el.scrollHeight && e.touches[0].clientY < 0)
      ) {
        e.preventDefault()
      }
    }

    // Add passive event listener for better mobile performance
    scrollElement.addEventListener('touchmove', handleTouchMove, { passive: true })
    
    return () => {
      scrollElement.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  useEffect(() => {
    const rootEl = scrollRef.current
    if (!rootEl) return

    // Handle scroll-based text zoom
    const handleScroll = () => {
      const scrollTop = rootEl.scrollTop
      const viewportHeight = window.innerHeight
      
      // Apply zoom effect based on scroll position
      sectionRefs.current.forEach((el, idx) => {
        if (!el) return
        
        const textContainer = el.querySelector(".text-container") as HTMLElement | null
        if (textContainer) {
          // Calculate how much of this section is visible
          const sectionTop = idx * viewportHeight
          const sectionBottom = (idx + 1) * viewportHeight
          const sectionCenter = sectionTop + (viewportHeight / 2)
          
          // Calculate progress based on how close scroll is to section center
          const distanceFromCenter = Math.abs(scrollTop + (viewportHeight / 2) - sectionCenter)
          const maxDistance = viewportHeight / 2
          const sectionProgress = Math.max(0, 1 - (distanceFromCenter / maxDistance))
          
          // Apply smooth zoom effect
          const scale = 0.7 + (sectionProgress * 0.5) // Scale from 0.7 to 1.2
          const opacity = 0.5 + (sectionProgress * 0.5) // Opacity from 0.5 to 1.0
          const translateY = (1 - sectionProgress) * 100
          
          textContainer.style.transform = `scale(${scale}) translateY(${translateY}px)`
          textContainer.style.opacity = `${opacity}`
        }
      })
    }

    // Handle video visibility with intersection observer
    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const idxAttr = entry.target.getAttribute("data-index")
          if (!idxAttr) return
          const idx = Number(idxAttr)

          const v = videoRefs.current[idx]
          if (v) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              v.classList.remove("video-fade-out")
              v.classList.add("video-fade-in")
              v.play().catch(() => {})
            } else {
              v.classList.remove("video-fade-in")
              v.classList.add("video-fade-out")
              setTimeout(() => v.pause(), 500)
            }
          }

          if (entry.isIntersecting && entry.intersectionRatio > 0.9) setActive(idx)
        })
      },
      {
        root: rootEl,
        threshold: [0.2, 0.5, 0.8, 0.9, 1.0],
        rootMargin: "0px 0px 0px 0px",
      }
    )

    // Add scroll listener
    rootEl.addEventListener('scroll', handleScroll)
    sectionRefs.current.forEach(el => el && io.observe(el))
    
    // Set initial state
    handleScroll()
    
    return () => {
      rootEl.removeEventListener('scroll', handleScroll)
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    if (active === 2 && !hasSpun) setHasSpun(true)
  }, [active, hasSpun])

  const FloatingOrb = ({ size, color, delay }:{ size:string;color:string;delay:string }) => (
    <div
      className={`pointer-events-none absolute ${size} ${color} rounded-full blur-xl opacity-20`}
      style={{
        transition: "transform 200ms linear",
        transform: `translate(${mouse.x * 0.02}px, ${mouse.y * 0.02}px)`,
        animation: `pulse 3s ease-in-out infinite`,
        animationDelay: delay,
      }}
    />
  )

  return (
    <div className="bg-black text-white overflow-hidden overflow-x-hidden min-h-screen relative w-full max-w-full">
      <style jsx global>{`
        html, body {
          height: auto;
          overflow-x: hidden;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch !important;
          width: 100%;
          max-width: 100vw;
        }
        
        * {
          box-sizing: border-box;
        }
        @keyframes spinOnce { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin-once { animation: spinOnce 0.9s ease-in-out 1 both; }
        @keyframes sheen {
          0% { transform: translateX(-150%) skewX(-20deg); opacity: 0; }
          50% { opacity: .25; }
          100% { transform: translateX(150%) skewX(-20deg); opacity: 0; }
        }
        .sheen:after {
          content:""; position:absolute; top:0; left:-25%; height:100%; width:25%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.25), transparent);
          animation: sheen 1.4s ease-in-out infinite; pointer-events:none;
        }
        @keyframes pulse { 0%,100%{opacity:.2;} 50%{opacity:.35;} }

        /* Video visibility defaults */
        .video-fade-in  { opacity: 0.9 !important; transition: opacity .5s ease; }
        .video-fade-out { opacity: 0.3 !important; transition: opacity .5s ease; }
        .video-base     { opacity: 0.9; } /* initial state so first scene is visible */

        .snap-y {
          overscroll-behavior-y: contain !important;
          scroll-snap-type: y proximity;
          touch-action: pan-y;
          min-height: 100vh;
        }
        
        .snap-start {
          scroll-snap-align: start;
          scroll-snap-stop: always;
          height: 100vh;
          min-height: 100vh;
        }
      `}</style>

      {/* fixed flourish layer */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <FloatingOrb size="w-96 h-96" color="bg-purple-500" delay="0s" />
        <FloatingOrb size="w-64 h-64" color="bg-pink-500" delay="0.8s" />
        <FloatingOrb size="w-80 h-80" color="bg-blue-500" delay="1.6s" />
      </div>

      {/* the only scroller */}
      <main
        ref={scrollRef}
        className="relative z-10 snap-y snap-proximity min-h-screen overflow-y-auto overflow-x-hidden overscroll-none touch-pan-y scroll-smooth w-full"
        style={{
          overscrollBehaviorY: "contain",
          overscrollBehaviorX: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {scenes.map((sc, i) => (
          <section
            key={i}
            data-index={i}
            ref={el => { sectionRefs.current[i] = el }}
            className="relative snap-start h-dvh w-full max-w-full flex items-center justify-center overflow-x-hidden"
          >
            {/* Background Video */}
            <div className="absolute inset-0 -z-10">
              <video
                ref={el => { videoRefs.current[i] = el }}
                className="h-full w-full object-cover video-base"
                src={sc.src}
                muted
                playsInline
                loop
                preload="metadata"
              />
              {/* lighter overlay so video stays visible */}
              <div className="absolute inset-0 bg-black/10" />
            </div>

            {/* Text */}
            <div
              className="container mx-auto px-6 text-center select-none text-container"
              style={{ transition: "transform .4s ease, opacity .4s ease" }}
            >
              <h1
                className={[
                  "relative text-6xl md:text-8xl font-serif font-black leading-tight mx-auto max-w-5xl",
                  i === 1 ? "sheen" : "",
                  i === 2 && active === 2 && !hasSpun ? "spin-once" : "",
                ].join(" ")}
                style={{
                  transform:
                    i === 0
                      ? "perspective(1200px) translateZ(0) scale(1.02)"
                      : i === 1
                      ? "perspective(1200px) translateZ(0) rotateX(2deg) rotateY(3deg)"
                      : "perspective(1200px) translateZ(0)",
                }}
              >
                <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                  {sc.title}
                </span>
              </h1>

              <p className="text-xl md:text-2xl text-gray-200/90 mt-8 max-w-3xl mx-auto">
                {i === 0 && <>Dive into a marketplace where <span className="text-transparent bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text font-semibold">design meets rarity</span> and every card is a collectible masterpiece.</>}
                {i === 1 && <>Generate stylistically consistent, AI-crafted characters and turn them into limited-run collectibles.</>}
                {i === 2 && <>Claim drops, print premium cards, and build your collection for the Cardify Club.</>}
              </p>

              <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center items-center">
                {i === 0 ? (
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
                ) : (
                  <div className="text-sm text-gray-300">{sc.hint}</div>
                )}
              </div>
            </div>
          </section>
        ))}

        {/* CONTENT AFTER HERO (still inside the scroller) */}
        <section id="why" className="relative w-full max-w-full h-screen flex items-center justify-center overflow-x-hidden overflow-y-hidden">
          <div className="container mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-5xl font-bold mb-6">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">Why Choose</span>{" "}
                <span className="text-white">Cardify CLUB?</span>
              </h2>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Everything you need to browse, design, and order exclusive AI-generated trading cards in one collection-specific marketplace.
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
              {[
                {
                  icon: Sparkles,
                  title: "AI-Consistent Card Creation",
                  description: "Turn prompts into collectible cards with stylistically consistent, AI-generated characters—no design skills required.",
                  gradient: "from-green-500 to-emerald-500",
                },
                {
                  icon: Badge,
                  title: "Studio-Grade Card Printing",
                  description: "Premium stock, holographic foil, matte finishes, and double-sided customization—shipped globally.",
                  gradient: "from-blue-500 to-cyan-500",
                },
                {
                  icon: Globe,
                  title: "Built for Collectors",
                  description: "Curated collections, limited drops, and a community-driven marketplace for digital + physical cards.",
                  gradient: "from-purple-500 to-pink-500",
                },
              ].map((feature, index) => (
                <div key={index} className="group cursor-pointer">
                  <Card className="relative overflow-hidden bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl border border-white/20 hover:border-white/40 transition-all duration-500 group-hover:scale-105 h-full">
                    <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
                    <CardContent className="p-8 relative z-10">
                      <div className={`w-16 h-16 bg-gradient-to-r ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 group-hover:rotate-12 transition-transform duration-300`}>
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
          </div>
        </section>

        <section className="relative w-full max-w-full h-screen flex items-center justify-center overflow-x-hidden overflow-y-hidden">
          <div className="container mx-auto px-6">
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/20 via-pink-600/20 to-blue-600/20 backdrop-blur-2xl border border-white/20 rounded-3xl p-12 text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10 animate-pulse" />
              <div className="relative z-10">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 backdrop-blur-xl border border-yellow-500/30 rounded-full px-6 py-2 mb-8">
                  <Sparkles className="w-4 h-4 text-yellow-400 animate-spin" />
                  <span className="text-sm font-medium text-yellow-300">Limited Drop Access</span>
                </div>

                <h2 className="text-5xl font-bold mb-6">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">Create. Collect. Customize.</span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">Start Your Cardify Journey</span>
                </h2>

                <p className="text-xl text-gray-300 mb-10 max-w-2xl mx-auto">
                  Join a fast-growing community crafting AI-generated trading cards—collect, print, and share your creations.
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
          </div>
        </section>

      </main>
    </div>
  )
}
