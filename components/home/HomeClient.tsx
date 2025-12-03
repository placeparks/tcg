"use client";

import { MarketplaceItem } from "@/lib/api";
import { Button } from "@/components/ui/button";
import Hero3D from "@/components/ui/Hero3D";
import NeonCard from "@/components/ui/NeonCard";
import { ArrowRight, Zap, Globe, Shield } from "lucide-react";
import Link from "next/link";

interface HomeClientProps {
    trendingItems: MarketplaceItem[];
    latestDrops: MarketplaceItem[];
}

export default function HomeClient({ trendingItems, latestDrops }: HomeClientProps) {
    return (
        <div className="min-h-screen bg-dark-bg text-white selection:bg-neon-purple selection:text-white overflow-x-hidden">

            {/* Background Grid & Glows */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]" />
                <div className="absolute top-0 left-1/4 w-96 h-96 bg-neon-purple/20 rounded-full blur-[128px]" />
                <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-neon-cyan/20 rounded-full blur-[128px]" />
            </div>

            {/* Hero Section */}
            <section className="relative z-10 container mx-auto px-6 pt-32 pb-20">
                <div className="flex flex-col lg:flex-row items-center gap-16">

                    {/* Text Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 mb-8 backdrop-blur-md">
                            <span className="relative flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-neon-cyan"></span>
                            </span>
                            <span className="text-sm font-mono text-neon-cyan">AI-POWERED MARKETPLACE</span>
                        </div>

                        <h1 className="text-6xl md:text-8xl font-black leading-tight mb-8 tracking-tighter">
                            COLLECT <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple via-white to-neon-cyan animate-gradient-x">
                                THE FUTURE
                            </span>
                        </h1>

                        <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Discover, trade, and battle with exclusive AI-generated trading cards.
                            The next generation of digital collectibles is here.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                            <Button
                                size="lg"
                                className="bg-neon-purple hover:bg-neon-purple/80 text-white font-bold px-8 py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.5)] hover:shadow-[0_0_30px_rgba(168,85,247,0.7)] transition-all"
                                asChild
                            >
                                <Link href="/collection">
                                    Explore Market <ArrowRight className="ml-2 w-5 h-5" />
                                </Link>
                            </Button>
                            <Button
                                size="lg"
                                variant="outline"
                                className="border-white/20 hover:bg-white/10 text-white font-bold px-8 py-6 text-lg rounded-xl backdrop-blur-md"
                                asChild
                            >
                                <Link href="/create">
                                    Create Card
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* 3D Visual */}
                    <div className="flex-1 flex justify-center perspective-1000">
                        <Hero3D />
                    </div>
                </div>
            </section>

            {/* Stats / Features Strip */}
            <div className="border-y border-white/10 bg-black/50 backdrop-blur-md relative z-10">
                <div className="container mx-auto px-6 py-12">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                        {[
                            { icon: Zap, label: "Instant Minting", value: "Zero Gas Fees" },
                            { icon: Shield, label: "Secure Trading", value: "Verified Smart Contracts" },
                            { icon: Globe, label: "Global Community", value: "10k+ Collectors" },
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center gap-2 group cursor-default">
                                <div className="p-4 rounded-full bg-white/5 group-hover:bg-neon-cyan/20 transition-colors mb-2">
                                    <stat.icon className="w-6 h-6 text-neon-cyan" />
                                </div>
                                <h4 className="text-2xl font-bold text-white">{stat.value}</h4>
                                <p className="text-sm text-gray-500 uppercase tracking-widest">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Trending Section */}
            <section className="relative z-10 container mx-auto px-6 py-24">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">TRENDING <span className="text-neon-purple">DROPS</span></h2>
                        <p className="text-gray-400">The most sought-after collections this week.</p>
                    </div>
                    <Link href="/collection" className="hidden md:flex items-center text-neon-cyan hover:text-white transition-colors font-bold">
                        VIEW ALL <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {trendingItems.map((item, i) => (
                        <div key={`${item.type}-${item.type === 'collection' ? item.address : item.id}`} className="h-[400px]">
                            <NeonCard item={item} />
                        </div>
                    ))}
                </div>

                <div className="mt-12 text-center md:hidden">
                    <Link href="/collection" className="inline-flex items-center text-neon-cyan hover:text-white transition-colors font-bold">
                        VIEW ALL <ArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                </div>
            </section>

            {/* Latest Drops Section (Marquee style or Grid) */}
            <section className="relative z-10 container mx-auto px-6 py-24 border-t border-white/5">
                <div className="flex items-end justify-between mb-12">
                    <div>
                        <h2 className="text-4xl md:text-5xl font-black mb-4">FRESH <span className="text-neon-pink">MINTED</span></h2>
                        <p className="text-gray-400">Just hit the blockchain.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                    {latestDrops.map((item, i) => (
                        <div key={`${item.type}-${item.type === 'collection' ? item.address : item.id}`} className="h-[350px]">
                            <NeonCard item={item} />
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 container mx-auto px-6 py-32 text-center">
                <div className="max-w-4xl mx-auto bg-gradient-to-b from-white/5 to-transparent border border-white/10 rounded-3xl p-12 relative overflow-hidden">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-neon-purple to-transparent" />

                    <h2 className="text-5xl md:text-7xl font-black mb-8">
                        READY TO <span className="text-transparent bg-clip-text bg-gradient-to-r from-neon-purple to-neon-pink">ASCEND?</span>
                    </h2>
                    <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
                        Join thousands of creators and collectors shaping the future of digital ownership.
                    </p>
                    <Button
                        size="lg"
                        className="bg-white text-black hover:bg-gray-200 font-black px-12 py-6 text-xl rounded-full"
                        asChild
                    >
                        <Link href="/create">
                            START CREATING
                        </Link>
                    </Button>
                </div>
            </section>

        </div>
    );
}
