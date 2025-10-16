"use client"

import { Sparkles, Twitter, MessageCircle } from "lucide-react"

export default function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/10 bg-black/50 backdrop-blur-2xl">
      <div className="container mx-auto px-6 py-16">
        <div className="grid md:grid-cols-5 gap-8">
          {/* Logo and About */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 rounded-xl flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-white" />
              </div>
              <div>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
                  TCG Meta
                </span>
                <div className="text-sm text-gray-400">NFT Marketplace</div>
              </div>
            </div>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              The premier destination for discovering, creating, and trading extraordinary card NFTs.
            </p>
            <div className="flex space-x-4">
              <a
                href="https://x.com/NickPlaysCrypto"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <Twitter className="w-5 h-5 text-white" />
              </a>
              <a
                href="https://discord.com/invite/nickplayscrypto"
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Link Columns */}
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Marketplace</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="/mint-now"
                  className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 transform duration-200 inline-block"
                >
                  Explore
                </a>
              </li>
              <li>
                <a
                  href="/collection"
                  className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 transform duration-200 inline-block"
                >
                  Collections
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold text-lg mb-6">Company</h4>
            <ul className="space-y-3">
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 transform duration-200 inline-block"
                >
                  About
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 transform duration-200 inline-block"
                >
                  Privacy
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 transform duration-200 inline-block"
                >
                  Terms
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 mb-4 md:mb-0">
            &copy; 2025 TCG Meta. All rights reserved.
          </p>
               </div>
      </div>
    </footer>
  )
}
