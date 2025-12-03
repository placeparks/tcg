"use client";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import React, { useRef } from "react";

export default function Hero3D() {
    const ref = useRef<HTMLDivElement>(null);

    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseXSpring = useSpring(x);
    const mouseYSpring = useSpring(y);

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = ref.current?.getBoundingClientRect();

        if (rect) {
            const width = rect.width;
            const height = rect.height;

            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            const xPct = mouseX / width - 0.5;
            const yPct = mouseY / height - 0.5;

            x.set(xPct);
            y.set(yPct);
        }
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            ref={ref}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: "preserve-3d",
            }}
            className="relative w-72 h-96 md:w-96 md:h-[30rem] rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-cyan/20 border border-white/10 backdrop-blur-sm cursor-pointer"
        >
            <div
                style={{
                    transform: "translateZ(75px)",
                    transformStyle: "preserve-3d",
                }}
                className="absolute inset-4 rounded-xl bg-black/80 border border-white/20 shadow-2xl flex flex-col items-center justify-center overflow-hidden"
            >
                {/* Holographic Glitch Effect */}
                <div className="absolute inset-0 bg-gradient-to-tr from-neon-purple/20 via-transparent to-neon-cyan/20 animate-pulse-slow" />

                {/* Card Content */}
                <div className="relative z-10 text-center p-6">
                    <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-r from-neon-purple to-neon-cyan blur-md animate-pulse" />
                    <h3 className="text-3xl font-black text-white mb-2 tracking-tighter">GENESIS</h3>
                    <p className="text-neon-cyan font-mono text-sm">EDITION #001</p>
                </div>

                {/* Scanline */}
                <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.5)_50%)] bg-[length:100%_4px] pointer-events-none opacity-20" />
            </div>
        </motion.div>
    );
}
