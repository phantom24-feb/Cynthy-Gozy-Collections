import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ThemeProvider from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Cynthy Gozy Collections | Premium Shoes & Accessories",
  description:
    "Discover quality Italian half shoes, slippers, and trending fashion pieces. Shop our latest collection today.",
  openGraph: {
    title: "Cynthy Gozy Collections | Premium Shoes & Accessories",
    description:
      "Discover quality Italian half shoes, slippers, and trending fashion pieces. Shop our latest collection today.",
    images: ["https://cynthy-gozy-collections.vercel.app/images/store-banner.jpg"],
    url: "https://cynthy-gozy-collections.vercel.app/",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-32x32.png", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png", type: "image/png", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
};
export const dynamic = "force-dynamic";
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
