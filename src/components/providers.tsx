"use client";
import { SessionProvider } from "next-auth/react";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );
  return (
    <SessionProvider refetchOnWindowFocus={false}>
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    </SessionProvider>
  );
}
