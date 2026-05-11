import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "LeadsAI — AI Sales & Customer Service Platform",
  description: "Platform AI Agent untuk otomatisasi sales, customer service, dan CRM. Tingkatkan penjualan hingga 42% dengan AI yang bekerja 24/7.",
  keywords: ["AI agent", "WhatsApp automation", "CRM", "sales automation", "customer service AI", "Indonesia"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
