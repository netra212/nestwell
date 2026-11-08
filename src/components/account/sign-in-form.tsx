"use client";
import { toast } from "@/hooks/use-toast";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function SignInForm({ callbackUrl }: { callbackUrl: string }) {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <form
      noValidate
      className="mt-7 space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        const email = z
          .email()
          .max(254)
          .safeParse(new FormData(event.currentTarget).get("email"));
        if (!email.success) {
          setError("Enter a valid email address.");
          return;
        }
        setPending(true);
        setError("");
        try {
          const result = await signIn("credentials", {
            email: email.data,
            password: "demo",
            redirect: false,
            callbackUrl,
          });
          if (result?.status === 429) {
            toast({
              title: "Sign-in limit reached",
              description: "Please wait a minute before trying again.",
            });
            setError("Too many attempts. Please try again in a minute.");
            return;
          }
          if (result?.error) {
            setError("We couldn’t sign you in. Please try again.");
            return;
          }
          window.location.assign(callbackUrl);
        } catch {
          setError("We couldn’t connect. Please try again.");
        } finally {
          setPending(false);
        }
      }}
    >
      <label className="block text-sm font-medium" htmlFor="sign-in-email">
        Email address
      </label>
      <Input
        id="sign-in-email"
        type="email"
        name="email"
        autoComplete="email"
        required
        maxLength={254}
        placeholder="you@example.com"
        className="h-12"
        aria-invalid={!!error}
        aria-describedby={error ? "sign-in-error" : undefined}
      />
      {error && (
        <p role="alert" id="sign-in-error" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={pending} className="h-12 w-full">
        {pending ? "Signing in…" : "Continue with email"}
      </Button>
    </form>
  );
}
