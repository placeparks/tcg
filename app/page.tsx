"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Wallet, Sparkles, ArrowRight, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export default function NFTMarketplace() {
  /* ------------------------------------------------------------------ */
  /* State & refs                                                        */
  /* ------------------------------------------------------------------ */
  const [isWalletConnected, setIsWalletConnected] = useState(false)
  const [active,            setActive]            = useState(0)
  const [hasSpun,           setHasSpun]           = useState(false)
  const [mouse,             setMouse]             = useState({ x: 0, y: 0 })

  const sectionRefs = useRef<Array<HTMLElement | null>>([])
  const videoRefs   = useRef<Array<HTMLVideoElement | null>>([])
  const scrollRef   = useRef<HTMLDivElement | null>(null)

  /* ------------------------------------------------------------------ */
  /* Input / sensor effects                                             */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const prev = document.body.style.overscrollBehavior
    document.documentElement.style.overscrollBehavior = "none"
    document.body.style.overscrollBehavior            = "none"
    return () => {
      document.documentElement.style.overscrollBehavior = ""
      document.body.style.overscrollBehavior            = prev
    }
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) =>
      setMouse({ x: (e as any).clientX, y: (e as any).clientY })
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  /* ------------------------------------------------------------------ */
  /* Demo data                                                          */
  /* ------------------------------------------------------------------ */
  const scenes = useMemo(
    () => [
      { title: "Trading Cards", src: "/clip2.mp4", hint: "Scroll for AI-Generated" },
      { title: "NFT",           src: "/clip3.mp4", hint: "Scroll for Trading Cards" },
      { title: "Exchange",      src: "/clip4.mp4", hint: "Scroll to continue"     },
    ],
    []
  )

  /* ------------------------------------------------------------------ */
  /* Autoplay the first video                                           */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const v0 = videoRefs.current[0]
    v0?.classList.add("video-fade-in")
    v0?.play().catch(() => {})
  }, [])

  /* ------------------------------------------------------------------ */
  /* Scroll + IO logic                                                  */
  /* ------------------------------------------------------------------ */
  useEffect(() => {
    const rootEl = scrollRef.current
    if (!rootEl) return

    const handleScroll = () => {
      const y   = rootEl.scrollTop
      const vh  = window.innerHeight
      sectionRefs.current.forEach((el, idx) => {
        if (!el) return
        const text = el.querySelector(".text-container") as HTMLElement | null
        if (!text) return

        const sectionTop     = idx * vh
        const sectionCenter  = sectionTop + vh / 2
        const d              = Math.abs(y + vh / 2 - sectionCenter)
        const prog           = Math.max(0, 1 - d / (vh / 2))

        const scale      = 0.7 + prog * 0.5
        const opacity    = 0.55 + prog * 0.45

        text.style.transform = `scale(${scale})`
        text.style.opacity   = `${opacity}`
      })
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const idx = Number(entry.target.getAttribute("data-index"))
          const vid = videoRefs.current[idx]
          if (vid) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
              vid.classList.replace("video-fade-out", "video-fade-in")
              vid.play().catch(() => {})
            } else {
              vid.classList.replace("video-fade-in", "video-fade-out")
              setTimeout(() => vid.pause(), 500)
            }
          }
          if (entry.isIntersecting && entry.intersectionRatio > 0.9) setActive(idx)
        })
      },
      { root: rootEl, threshold: [0.2, 0.5, 0.8, 0.9, 1] }
    )

    rootEl.addEventListener("scroll", handleScroll)
    sectionRefs.current.forEach(el => el && io.observe(el))
    handleScroll()

    return () => {
      rootEl.removeEventListener("scroll", handleScroll)
      io.disconnect()
    }
  }, [])

  useEffect(() => {
    if (active === 2 && !hasSpun) setHasSpun(true)
  }, [active, hasSpun])

  /* ------------------------------------------------------------------ */
  /* Helpers                                                            */
  /* ------------------------------------------------------------------ */
  const FloatingOrb = ({
    size,
    color,
    delay,
  }: {
    size: string
    color: string
    delay: string
  }) => (
    <div
      className={`pointer-events-none absolute ${size} ${color} rounded-full blur-xl opacity-20`}
      style={{
        transform: `translate(${mouse.x * 0.02}px, ${mouse.y * 0.02}px)`,
        transition: "transform 200ms linear",
        animation: `pulse 3s ease-in-out infinite`,
        animationDelay: delay,
      }}
    />
  )

  /* ------------------------------------------------------------------ */
  /* Render                                                             */
  /* ------------------------------------------------------------------ */
  return (
    <div className="relative w-full max-w-full min-h-screen overflow-x-hidden bg-black text-white">
      {/* ---------- global tweaks ---------- */}
      <style jsx global>{`
        html,
        body {
          width: 100%;
          max-width: 100vw;
          height: auto;
          overflow-x: hidden;
          overscroll-behavior: none;
          -webkit-overflow-scrolling: touch !important;
        }
        * {
          box-sizing: border-box;
        }

        /* video fade helper */
        .video-fade-in {
          opacity: 0.95 !important;
          transition: opacity 0.5s ease;
        }
        .video-fade-out {
          opacity: 0.25 !important;
          transition: opacity 0.5s ease;
        }
        .video-base {
          opacity: 0.95;
        }

        /* one-shot spin on the last title */
        @keyframes spinOnce {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
        .spin-once {
          animation: spinOnce 0.9s ease-in-out 1 both;
        }

        /* sheen highlight for middle title */
        @keyframes sheen {
          0% {
            transform: translateX(-150%) skewX(-20deg);
            opacity: 0;
          }
          50% {
            opacity: 0.25;
          }
          100% {
            transform: translateX(150%) skewX(-20deg);
            opacity: 0;
          }
        }
        .sheen:after {
          content: "";
          position: absolute;
          top: 0;
          left: -25%;
          width: 25%;
          height: 100%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.25),
            transparent
          );
          animation: sheen 1.4s ease-in-out infinite;
          pointer-events: none;
        }

        /* floating orb pulse */
        @keyframes pulse {
          0%,
          100% {
            opacity: 0.2;
          }
          50% {
            opacity: 0.35;
          }
        }

        /* ---------- mobile-only tweaks ---------- */
        @media (max-width: 768px) {
          /* center the headline block */
          .text-container {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 90%;
            padding: 0 1rem;
          }

          /* fluid headline and body sizes with clamp() */
          .text-container h1 {
            font-size: clamp(2.25rem, 8vw, 3rem);
            line-height: 1.15;
          }
          .text-container p {
            font-size: clamp(1rem, 3.5vw, 1.15rem);
          }

          /* make video cover the viewport */
          video {
            width: 100%;
            height: 100%;
            min-width: 100vw;
            min-height: 100vh;
            object-fit: cover;
            transform: scale(1.1);
          }

          .video-section {
            position: relative;
            height: 100vh;
            min-height: 100vh;
            width: 100%;
            overflow: hidden;
            scroll-snap-align: start;
            scroll-snap-stop: always;
          }

          .video-section > div {
            position: absolute;
            inset: 0;
          }
        }
      `}</style>

      {/* ---------- background orbs ---------- */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-pink-900/20" />
        <FloatingOrb size="w-96 h-96" color="bg-purple-500" delay="0s" />
        <FloatingOrb size="w-64 h-64" color="bg-pink-500" delay="0.8s" />
        <FloatingOrb size="w-80 h-80" color="bg-blue-500" delay="1.6s" />
      </div>

      {/* ---------- main scroll container ---------- */}
      <main
        ref={scrollRef}
        className="relative z-10 snap-y snap-mandatory min-h-screen touch-pan-y scroll-smooth overflow-y-auto overflow-x-hidden w-full"
        style={{
          overscrollBehaviorY: "contain",
          overscrollBehaviorX: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {/* -------- hero scenes -------- */}
        {scenes.map((sc, i) => (
          <section
            key={i}
            data-index={i}
            ref={el => { if (el) sectionRefs.current[i] = el }}
            className="video-section flex items-center justify-center snap-start h-dvh w-full max-w-full"
          >
            {/* background video */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
              <video
                ref={el => { if (el) videoRefs.current[i] = el }}
                className="video-base h-full w-full object-cover object-center"
                src={sc.src}
                muted
                playsInline
                loop
                preload="metadata"
              />
              <div
                className={`absolute inset-0 ${
                  i === 1 || i === 2 ? "bg-black/45" : "bg-black/12"
                }`}
              />
            </div>

            {/* headline block */}
            <div
              className="text-container container mx-auto px-6 text-center select-none flex flex-col items-center justify-center min-h-screen"
              style={{ transition: "transform .4s ease, opacity .4s ease" }}
            >
              <h1
                className={[
                  "relative text-4xl sm:text-6xl md:text-8xl font-serif font-black leading-tight mx-auto max-w-5xl",
                  i === 1 ? "sheen" : "",
                  i === 2 && active === 2 && !hasSpun ? "spin-once" : "",
                ].join(" ")}
              >
                <span
                  className={`bg-gradient-to-r ${
                    i === 1 || i === 2
                      ? "from-white via-purple-100 to-pink-100"
                      : "from-white via-purple-200 to-white"
                  } bg-clip-text text-transparent`}
                >
                  {sc.title}
                </span>
              </h1>

              <p className="mt-8 text-base sm:text-xl md:text-2xl text-white/95 max-w-3xl mx-auto">
                {i === 0 && (
                  <>
                    Dive into a marketplace where{" "}
                    <span className="bg-gradient-to-r from-purple-300 to-pink-300 bg-clip-text text-transparent font-semibold">
                      design meets rarity
                    </span>{" "}
                    and every card is a collectible masterpiece.
                  </>
                )}
                {i === 1 && (
                  <>Generate stylistically consistent, AI-crafted characters and turn them into limited-run collectibles.</>
                )}
                {i === 2 && (
                  <>Claim drops, print premium cards, and build your collection for the Cardify Club.</>
                )}
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
                  <div className="text-sm text-white/90">{sc.hint}</div>
                )}
              </div>
            </div>
          </section>
        ))}

        {/* -------- landing CTA -------- */}
        <section className="content-section relative w-full max-w-full h-screen flex items-center justify-center snap-start overflow-x-hidden overflow-y-hidden">
          <div className="container mx-auto px-6">
            <div className="relative overflow-hidden bg-gradient-to-r from-purple-600/30 via-pink-600/30 to-blue-600/30 backdrop-blur-2xl border border-white/30 rounded-3xl p-6 md:p-8 text-center">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/15 to-pink-500/15 animate-pulse" />
              <div className="relative z-10">
                <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-yellow-500/30 to-orange-500/30 backdrop-blur-xl border border-yellow-500/40 rounded-full px-6 py-2 mb-4">
                  <Sparkles className="w-4 h-4 text-yellow-200 animate-spin" />
                  <span className="text-sm font-medium text-yellow-100">
                    Limited Drop Access
                  </span>
                </div>

                <h2 className="text-3xl md:text-5xl font-bold mb-4">
                  <span className="bg-gradient-to-r from-white via-purple-200 to-white bg-clip-text text-transparent">
                    Create. Collect. Customize.
                  </span>
                  <br />
                  <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                    Start Your Cardify Journey
                  </span>
                </h2>

                <p className="mb-6 text-lg md:text-xl text-white/95 max-w-2xl mx-auto">
                  Join a fast-growing community crafting AI-generated trading cards—collect,
                  print, and share your creations.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <Button
                    onClick={() => setIsWalletConnected(v => !v)}
                    size="lg"
                    className="group relative overflow-hidden bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 hover:scale-105 transition-all duration-300 px-8 md:px-12 py-3 md:py-4 text-base md:text-lg font-bold rounded-full"
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <Wallet className="w-5 h-5 mr-2" />
                    {isWalletConnected ? "Wallet Connected" : "Connect Wallet"}
                    <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>

                  <div className="text-sm text-white/90">
                    🎴 <span className="font-semibold">New cards dropping daily</span>
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
