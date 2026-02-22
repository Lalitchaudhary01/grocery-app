import type { Metadata } from "next";
import "./globals.css";

import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { StoreStatusBanner } from "@/components/layout/StoreStatusBanner";
import { ToastProvider } from "@/components/ui/ToastProvider";

export const metadata: Metadata = {
  title: "Apni Dukaan - Grocery Delivery App",
  description: "3 KM ke andar Home Delivery",
  icons: {
    icon: "/logo-mark.svg",
    shortcut: "/logo-mark.svg",
    apple: "/logo-mark.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-neutral-100 text-neutral-900">
        <ToastProvider>
          <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col bg-white shadow-sm">
            <Navbar />
            <StoreStatusBanner />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ToastProvider>
      </body>
    </html>
  );
}
