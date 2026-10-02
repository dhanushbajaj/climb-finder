import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Header from "@/components/ui/Header";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Climb Finder", template: "%s · Climb Finder" },
  description: "Find indoor and outdoor climbs near you, build climbs from a photo or a sandbox, and get beta for your size.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <Header />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <footer className="border-t border-stone-200 py-4 text-center text-xs text-stone-500">
          Outdoor data from <a className="underline" href="https://openbeta.io">OpenBeta</a> (CC BY-SA). Maps and gyms ©{" "}
          <a className="underline" href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors.
        </footer>
      </body>
    </html>
  );
}
