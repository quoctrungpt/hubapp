import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
});


export const metadata: Metadata = {
  title: "SOCIAL PROJECT HUB",
  description:
    "A hub for social projects to connect, collaborate, and make a positive impact in the world.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.className}`}
      >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
