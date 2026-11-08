"use client";
import dynamic from "next/dynamic";
import { useToast } from "@/hooks/use-toast";
const Toaster = dynamic(
  () => import("@/components/ui/toaster").then((m) => m.Toaster),
  { ssr: false },
);
export function ToastHost() {
  const { toasts } = useToast();
  return toasts.length ? <Toaster /> : null;
}
