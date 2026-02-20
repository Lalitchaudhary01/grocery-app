import type { Metadata } from "next";
import "./globals.css";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";

export const metadata: Metadata = {
  title: "Vivek Chaudhary Mohanpur Wale",
  description: "3 KM ke andar Home Delivery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 text-neutral-900">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-white shadow-sm">
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
