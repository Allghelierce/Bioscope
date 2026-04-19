import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", weight: ["400", "500", "600"] });

export const metadata: Metadata = {
  title: "BioScope — Biodiversity Intelligence",
  description: "Regional biodiversity monitoring dashboard powered by iNaturalist data and Google Gemini AI",
};

import { DataProvider } from "@/context/DataContext";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark scroll-smooth">
      <body className={`${inter.variable} ${mono.variable} font-sans`}>
        <DataProvider>
          {children}
        </DataProvider>
      </body>
    </html>
  );
}
