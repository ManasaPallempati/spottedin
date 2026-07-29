import type { Metadata, Viewport } from "next";
import { Archivo_Black, Space_Grotesk, Space_Mono } from "next/font/google";
import "./globals.css";
import { TabBar } from "@/components/TabBar";
import { StoreProvider } from "@/state/store";

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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://spottedin.co"),
  title: "SPOTTED — prices fall every hour. catch them first.",
  description:
    "GenZ resale fashion marketplace. Every listing drops on the hour until it hits the seller's hidden floor.",
  openGraph: {
    title: "SPOTTED — prices fall every hour. catch them first.",
    description: "GenZ resale fashion. Hourly global drop, 0% seller fees, steal receipts.",
    url: "/",
    siteName: "SPOTTED",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "SPOTTED" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SPOTTED — prices fall every hour.",
    description: "Catch the best secondhand prices before the next global drop.",
    images: ["/opengraph-image"],
  },
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
        <StoreProvider>
          {/* Phone-native shell: full-bleed on mobile, centered 430px on desktop */}
          <div className="relative mx-auto min-h-dvh w-full max-w-[430px] bg-[var(--bg-screen)] pb-[92px]">
            {children}
            <TabBar />
          </div>
        </StoreProvider>
      </body>
    </html>
  );
}
