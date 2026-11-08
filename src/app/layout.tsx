import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nestwell | Property",
  description: "Find your next home. UK property platform.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <Providers>
          <TooltipProvider>
            <a href="#main-content" className="sr-only focus:not-sr-only">
              Skip to content
            </a>
            <SiteHeader />
            {children}
            <Toaster />
          </TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
