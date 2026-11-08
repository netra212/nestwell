"use client";
import { useId, useState } from "react";
import { Mail, Phone, ArrowUpRight } from "lucide-react";
import { AgentLogo } from "./property-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { enquirySchema } from "@/lib/enquiry-schema";
import { toast } from "@/hooks/use-toast";
export function AgentContact({
  agent,
}: {
  agent: {
    name: string;
    phone: string | null;
    email: string | null;
    logoUrl: string | null;
  };
}) {
  const id = useId();
  const [errors, setErrors] = useState<Record<string, string>>({});
  return (
    <aside
      className="rounded-2xl border bg-white p-6 shadow-xs"
      aria-label="Estate agent"
    >
      <p className="mb-5 text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
        Marketed by
      </p>
      <div className="flex items-center gap-3">
        <AgentLogo {...agent} />
        <h2 className="text-lg font-semibold">{agent.name}</h2>
      </div>
      <div className="my-5 space-y-3 text-sm">
        {agent.phone && (
          <a
            href={`tel:${agent.phone.replace(/\s/g, "")}`}
            className="flex items-center gap-3 text-primary"
          >
            <Phone className="size-4" />
            {agent.phone}
          </a>
        )}
        {agent.email && (
          <a
            href={`mailto:${agent.email}`}
            className="flex items-center gap-3 break-all text-primary"
          >
            <Mail className="size-4 shrink-0" />
            {agent.email}
          </a>
        )}
      </div>
      <div className="border-t pt-5">
        <h3 className="font-semibold">Enquire about this home</h3>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Contact form preview. Sending enquiries is coming soon.
        </p>
        <form
          className="mt-5 space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const parsed = enquirySchema.safeParse(Object.fromEntries(form));
            if (!parsed.success) {
              const next: Record<string, string> = {};
              parsed.error.issues.forEach((issue) => {
                next[String(issue.path[0])] ??= issue.message;
              });
              setErrors(next);
              const field = e.currentTarget.elements.namedItem(
                Object.keys(next)[0],
              );
              if (field instanceof HTMLElement) field.focus();
              return;
            }
            setErrors({});
            toast({
              title: "Your details look good",
              description: "This is a preview. Your message has not been sent.",
            });
          }}
        >
          {(
            [
              ["name", "Full name", "text"],
              ["email", "Email address", "email"],
              ["phone", "Phone (optional)", "tel"],
              ["message", "Your message", "textarea"],
            ] as const
          ).map(([name, label, type]) => (
            <div key={name}>
              <label
                htmlFor={`${id}-${name}`}
                className="mb-2 block text-xs font-medium"
              >
                {label}
              </label>
              {type === "textarea" ? (
                <textarea
                  id={`${id}-${name}`}
                  name={name}
                  rows={4}
                  maxLength={3000}
                  aria-invalid={!!errors[name]}
                  aria-describedby={
                    errors[name] ? `${id}-${name}-error` : undefined
                  }
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
                  placeholder="I’d like to find out more about this property…"
                />
              ) : (
                <Input
                  id={`${id}-${name}`}
                  name={name}
                  type={type}
                  autoComplete={
                    name === "name"
                      ? "name"
                      : name === "email"
                        ? "email"
                        : "tel"
                  }
                  maxLength={name === "phone" ? 25 : 100}
                  className="h-10"
                  aria-invalid={!!errors[name]}
                  aria-describedby={
                    errors[name] ? `${id}-${name}-error` : undefined
                  }
                />
              )}
              {errors[name] && (
                <p
                  id={`${id}-${name}-error`}
                  role="alert"
                  className="mt-1 text-xs text-destructive"
                >
                  {errors[name]}
                </p>
              )}
            </div>
          ))}
          <Button type="submit" className="h-11 w-full">
            Check enquiry details
            <ArrowUpRight className="size-4" />
          </Button>
        </form>
      </div>
    </aside>
  );
}
