import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers"; 
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "Cardify Marketplace",
  description: "Create, mint, and order both digital (NFT) and physical trading cards using AI technology",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#111] text-white`}>
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

