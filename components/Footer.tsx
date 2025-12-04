"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { Twitter, Github, Disc as Discord, Hexagon, MessageCircle, Sparkles } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer id="community" className="relative pt-8 pb-8 bg-black border-t border-white/10">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <Hexagon className="text-neon-purple w-8 h-8" strokeWidth={1.5} />
                    <span className="font-display font-bold text-lg">TCG<span className="text-neon-blue">META</span></span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed">
                    The premier destination for next-gen digital collectibles and gaming assets. Powered by Cardify.club.
                </p>
            </div>
            
            <div>
                <h4 className="font-bold text-white mb-4 uppercase tracking-wider">Marketplace</h4>
                <ul className="space-y-2 text-sm text-gray-500 font-mono">
                    <li>
                        <a
                            href="/mint-now"
                            className="hover:text-neon-blue transition-colors hover:translate-x-1 transform duration-200 inline-block"
                        >
                            Explore
                        </a>
                    </li>
                    <li>
                        <a
                            href="/collection"
                            className="hover:text-neon-blue transition-colors hover:translate-x-1 transform duration-200 inline-block"
                        >
                            Collections
                        </a>
                    </li>
                </ul>
            </div>

            <div>
                <h4 className="font-bold text-white mb-4 uppercase tracking-wider">Company</h4>
                <ul className="space-y-2 text-sm text-gray-500 font-mono">
                    <li>
                        <a
                            href="#"
                            className="hover:text-neon-blue transition-colors hover:translate-x-1 transform duration-200 inline-block"
                        >
                            About
                        </a>
                    </li>
                    <li>
                        <a
                            href="#"
                            className="hover:text-neon-blue transition-colors hover:translate-x-1 transform duration-200 inline-block"
                        >
                            Privacy
                        </a>
                    </li>
                    <li>
                        <a
                            href="#"
                            className="hover:text-neon-blue transition-colors hover:translate-x-1 transform duration-200 inline-block"
                        >
                            Terms
                        </a>
                    </li>
                </ul>
            </div>

            <div>
                <h4 className="font-bold text-white mb-4 uppercase tracking-wider">Socials</h4>
                <div className="flex gap-4">
                    <a
                        href="https://x.com/NickPlaysCrypto"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <Twitter className="w-5 h-5 text-white" />
                    </a>
                    <a
                        href="https://discord.com/invite/nickplayscrypto"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-10 h-10 rounded-full bg-white/5 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
                    >
                        <MessageCircle className="w-5 h-5 text-white" />
                    </a>
                </div>
            </div>
        </div>

        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-gray-600 font-mono">
            <p>&copy; 2025 TCGMeta Inc. All rights reserved.</p>
            <div className="flex gap-8 mt-4 md:mt-0">
                <a href="#" className="hover:text-white">Privacy Policy</a>
                <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
