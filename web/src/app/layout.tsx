import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Agents",
  description: "AI Agents — purpose-built agents platform",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
};

export default function RootLayout(
  {
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
  return (
    <html lang="en">
    <body className="antialiased">
    {children}
    </body>
    </html>
  );
}
