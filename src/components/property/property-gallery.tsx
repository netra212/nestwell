"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Expand } from "lucide-react";
import { PropertyImage } from "./property-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
type GalleryImage = { id: string; url: string; alt: string | null };
export function PropertyGallery({
  images,
  title,
  address,
}: {
  images: GalleryImage[];
  title: string;
  address: string;
}) {
  const [index, setIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const all = images.length
    ? images
    : [{ id: "placeholder", url: "/property-placeholder.svg", alt: title }];
  const photo = all[index];
  const step = (delta: number) =>
    setIndex((i) => (i + delta + all.length) % all.length);
  return (
    <section aria-label="Property photographs">
      <button
        className="relative block aspect-[1.8] w-full overflow-hidden rounded-2xl bg-muted focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary"
        onClick={() => setOpen(true)}
        aria-label={`Open photo ${index + 1} in full screen`}
      >
        <PropertyImage
          key={photo.id}
          src={photo.url}
          alt={`${title} — ${address}. ${photo.alt || `Photo ${index + 1}`}`}
          fill
          sizes="(max-width: 1024px) 100vw, 900px"
          className="object-cover"
          priority
        />
        <span className="absolute right-4 bottom-4 flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold">
          <Expand className="size-4" />
          {index + 1} / {all.length}
        </span>
        <span className="absolute bottom-4 left-4 rounded bg-black/55 px-2 py-1 text-xs text-white">
          Illustrative photos
        </span>
      </button>
      <div
        className="mt-3 flex gap-3 overflow-x-auto pb-2"
        aria-label="Choose a photo"
      >
        {all.map((image, i) => (
          <button
            key={image.id}
            aria-label={`Photo ${i + 1}`}
            aria-pressed={index === i}
            onClick={() => setIndex(i)}
            className={`relative h-20 w-28 shrink-0 overflow-hidden rounded-lg border-2 ${index === i ? "border-primary ring-2 ring-primary/20" : "border-transparent opacity-65 hover:opacity-100"}`}
          >
            <PropertyImage
              src={image.url}
              alt={`${title} — ${address}. ${image.alt || `Photo ${i + 1}`}`}
              fill
              sizes="112px"
              className="object-cover"
            />
          </button>
        ))}
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-[95vw] max-w-6xl p-5 sm:max-w-6xl"
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") {
              e.preventDefault();
              step(-1);
            }
            if (e.key === "ArrowRight") {
              e.preventDefault();
              step(1);
            }
          }}
        >
          <DialogTitle className="pr-8">{title}</DialogTitle>
          <DialogDescription>
            Photo {index + 1} of {all.length}. Use the arrow buttons or left and
            right keys to browse.
          </DialogDescription>
          <div className="relative h-[60vh] bg-muted">
            <PropertyImage
              key={photo.id}
              src={photo.url}
              alt={`${title} — ${address}. ${photo.alt || `Photo ${index + 1}`}`}
              fill
              sizes="95vw"
              className="object-contain"
            />
          </div>
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => step(-1)}
              aria-label="Previous photo"
            >
              <ChevronLeft />
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              {index + 1} / {all.length}
            </span>
            <Button
              variant="outline"
              onClick={() => step(1)}
              aria-label="Next photo"
            >
              Next
              <ChevronRight />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
