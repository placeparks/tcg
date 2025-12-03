"use client";

import { MarketplaceItem } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles, Box, Layers, Image as ImageIcon } from "lucide-react";
import Link from "next/link";

export default function NeonCard({ item }: { item: MarketplaceItem }) {
    const isPack = item.type === "pack";
    const isCollection = item.type === "collection";

    // Determine link destination
    const href = isPack
        ? `/pack/${item.id}` // Assuming pack route
        : isCollection
            ? `/collection/${item.address}`
            : `/nft/${item.collection_address}/${item.id}`;

    // Determine badge color and icon
    const badgeColor = isPack
        ? "bg-neon-purple text-white"
        : isCollection
            ? "bg-neon-cyan text-black"
            : "bg-neon-pink text-white";

    const Icon = isPack ? Box : isCollection ? Layers : ImageIcon;

    return (
        <Link href={href}>
            <motion.div
                whileHover={{ scale: 1.02, y: -5 }}
                className="group relative h-full bg-card-bg border border-white/10 rounded-2xl overflow-hidden hover:border-white/30 transition-all duration-300"
            >
                {/* Neon Glow on Hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-neon-purple/0 via-neon-purple/0 to-neon-cyan/0 group-hover:from-neon-purple/20 group-hover:via-transparent group-hover:to-neon-cyan/20 transition-all duration-500" />

                {/* Image Container */}
                <div className="relative aspect-[3/4] overflow-hidden">
                    <img
                        src={item.type === 'pack' ? item.pack_image_uri : item.image_uri}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute top-3 right-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${badgeColor}`}>
                            <Icon size={12} />
                            {item.type.toUpperCase()}
                        </span>
                    </div>
                </div>

                {/* Content */}
                <div className="p-5 relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1 truncate group-hover:text-neon-cyan transition-colors">
                        {item.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-4 line-clamp-2 min-h-[40px]">
                        {item.description || "No description available."}
                    </p>

                    <div className="flex items-center justify-between mt-auto">
                        <div className="flex items-center gap-2">
                            {item.deployer?.avatar_url ? (
                                <img
                                    src={item.deployer.avatar_url}
                                    alt={item.deployer.display_name || "User"}
                                    className="w-6 h-6 rounded-full border border-white/20"
                                />
                            ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500" />
                            )}
                            <span className="text-xs text-gray-300 truncate max-w-[100px]">
                                {item.deployer?.display_name || "Unknown Creator"}
                            </span>
                        </div>

                        <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-neon-cyan group-hover:text-black transition-all">
                            <ArrowRight size={14} />
                        </div>
                    </div>
                </div>
            </motion.div>
        </Link>
    );
}
