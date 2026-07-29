import type { Metadata, Viewport } from "next";
import { Archivo_Black, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { TabBar } from "@/components/TabBar";

const display = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const ui = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-ui",
});

const mono = Space_Mono({
  weight: ["400", "700"],
  subsets: ["latin"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "SPOTTED — prices fall every hour. catch them first.",
  description:
    "GenZ resale fashion marketplace. Every listing drops on the hour until it hits the seller's hidden floor.",
};

export const viewport: Viewport = {
  themeColor: "#0A0A0C",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${display.variable} ${ui.variable} ${mono.variable} antialiased`}>
        {/* Phone-native shell: full-bleed on mobile, centered 430px on desktop */}
        <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-[var(--bg-screen)] pb-[84px]">
          {children}
          <TabBar />
        </div>
      </body>
    </html>
  );
}
