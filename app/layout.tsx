import type { Metadata } from "next";
import { Playfair_Display, Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; 
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});


export const metadata: Metadata = {
  title: "TCG Meta Marketplace",
  description: "Create, mint, and order both digital (NFT) and physical trading cards using AI technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${playfairDisplay.variable} ${inter.variable} antialiased bg-[#111] text-white`}>
        <Providers
          config={{
            loginMethods: ["google", "wallet"],
            embeddedWallets: { createOnLogin: "users-without-wallets" },
          }}
        >
          <Navbar/>
          {/* Simple fade‑in via Tailwind */}
          <main className="animate-fade-in" key="main-content">
            {children}
            <Toaster position="top-right" />
          </main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}

