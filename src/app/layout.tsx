import type { Metadata } from "next";
import Link from "next/link";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";


export const metadata: Metadata = {
  title: "Nestwell | Property",
  description: "Find your next home. UK property platform.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <TooltipProvider>
          <a href="#main-content" className="sr-only focus:not-sr-only">Skip to content</a>
          <header className="border-b bg-background">
            <div className="mx-auto flex h-20 max-w-7xl items-center gap-10 px-6">
              <Link href="/" className="text-2xl font-bold tracking-tight text-primary" aria-label="Nestwell home">⌂ Nestwell</Link>
              <nav aria-label="Main navigation" className="flex flex-wrap gap-6 text-sm font-medium">
                {["Buy", "Rent", "Sold", "Agents"].map((label) => (
                  <span key={label} aria-disabled="true" className="cursor-default text-muted-foreground">{label}</span>
                ))}
              </nav>
            </div>
          </header>
          {children}
          <Toaster />
        </TooltipProvider>
      </body>
    </html>
  );
}
