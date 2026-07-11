import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ons huis",
  description: "Huishoud-app — contracten, onderhoud, financiën en instellingen voor Iris & Daan.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#F7EFE4",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="nl" className={`${outfit.variable} h-full antialiased`}>
      <body className="min-h-full font-sans">
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
