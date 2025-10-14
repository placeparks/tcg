"use client"

import { Sparkles } from "lucide-react"

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
                  Cardify
                </span>
                <div className="text-sm text-gray-400">NFT Marketplace</div>
              </div>
            </div>
            <p className="text-gray-400 text-lg leading-relaxed mb-6">
              The premier destination for discovering, creating, and trading extraordinary NFTs in the metaverse.
            </p>
            <div className="flex space-x-4">
              {["Twitter", "Discord", "Instagram"].map((social) => (
                <div
                  key={social}
                  className="w-10 h-10 bg-white/10 backdrop-blur-xl border border-white/20 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors cursor-pointer"
                >
                  <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          {/* Link Columns */}
          {[
            { title: "Marketplace", items: ["Explore", "Create", "Collections", "Rankings"] },
            { title: "Resources", items: ["Help Center", "Blog", "Newsletter", "API"] },
            { title: "Company", items: ["About", "Careers", "Privacy", "Terms"] },
          ].map((column, index) => (
            <div key={index}>
              <h4 className="text-white font-bold text-lg mb-6">{column.title}</h4>
              <ul className="space-y-3">
                {column.items.map((item) => (
                  <li key={item}>
                    <a
                      href="#"
                      className="text-gray-400 hover:text-white transition-colors hover:translate-x-1 transform duration-200 inline-block"
                    >
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 mb-4 md:mb-0">
            &copy; 2025 Cardify. All rights reserved. Made with ❤️ for the NFT community.
          </p>
          <div className="flex items-center space-x-6 text-sm text-gray-400">
            <span>🌍 Available worldwide</span>
            <span>⚡ Powered by blockchain</span>
          </div>
        </div>
      </div>
    </footer>
  )
}
