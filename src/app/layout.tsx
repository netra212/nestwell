import { siteURL, siteDescription } from "@/lib/site";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { Providers } from "@/components/providers";
import { ToastHost } from "@/components/ToastHost";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: siteURL(),
  title: { default: "Nestwell | Property", template: "%s | Nestwell" },
  openGraph: { siteName: "Nestwell", locale: "en_GB" },
  description: siteDescription,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-GB">
      <body className="antialiased">
        <Providers>
          <a href="#main-content" className="sr-only focus:not-sr-only">
            Skip to content
          </a>
          <SiteHeader />
          {children}
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
