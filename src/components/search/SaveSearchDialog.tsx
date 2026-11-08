"use client";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { clientAPI } from "@/lib/client-api";
import { toast } from "@/hooks/use-toast";
export function SaveSearchDialog({ query }: { query: string }) {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const cache = useQueryClient();
  const mutation = useMutation({
    mutationFn: () => {
      const filters = Object.fromEntries(new URLSearchParams(query));
      return clientAPI("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim() || undefined,
          rawQuery: filters.q || undefined,
          filters,
        }),
      });
    },
    onSuccess: () => {
      void cache.invalidateQueries({
        queryKey: ["saved-searches", session?.user.id],
      });
      setOpen(false);
      setName("");
      toast({
        title: "Search saved",
        description: "Run it again from your saved collection.",
      });
    },
  });
  if (!session?.user.id) return null;
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (value) mutation.reset();
      }}
    >
      <DialogTrigger
        render={<Button variant="outline" className="h-9 bg-white" />}
      >
        <Bookmark className="size-4" />
        Save this search
      </DialogTrigger>
      <DialogContent>
        <DialogTitle>Save this search</DialogTitle>
        <DialogDescription>
          Keep these filters and query in your collection.
        </DialogDescription>
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          <label htmlFor="saved-search-name" className="text-sm">
            Name (optional)
          </label>
          <Input
            id="saved-search-name"
            value={name}
            maxLength={100}
            placeholder="e.g. Our next family home"
            onChange={(e) => setName(e.target.value)}
            className="h-10"
          />
          {mutation.isError && (
            <p role="alert" className="text-sm text-destructive">
              {mutation.error.message}
            </p>
          )}
          <Button
            type="submit"
            disabled={mutation.isPending}
            className="w-full"
          >
            {mutation.isPending ? "Saving…" : "Save search"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
