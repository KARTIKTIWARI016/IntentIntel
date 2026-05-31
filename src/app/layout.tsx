import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: "IntentIntel - CRM Buying-Intent Detection",
  description:
    "Research any company's CRM buying intent from public web signals, with cited evidence.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full">
        <div className="app-shell">
          <Nav />
          <div className="min-w-0 flex flex-col">
            <main className="flex-1 w-full px-4 sm:px-6 lg:px-8 py-6">{children}</main>
            <footer className="border-t border-[var(--color-line)] bg-white/50 py-4 text-center text-xs text-[var(--color-muted)]">
              IntentIntel local build - powered by Gemini + Google Search grounding
            </footer>
          </div>
        </div>
      </body>
    </html>
  );
}
