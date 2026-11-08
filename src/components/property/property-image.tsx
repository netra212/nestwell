"use client";
import Image, { type ImageProps } from "next/image";
import { useState } from "react";
import { propertyImageSource } from "@/lib/property-images";
export function PropertyImage({ src, alt, ...props }: ImageProps) {
  const [failed, setFailed] = useState(false);
  return (
    <Image
      {...props}
      src={
        failed
          ? "/property-placeholder.svg"
          : typeof src === "string"
            ? propertyImageSource(src)
            : src
      }
      alt={alt}
      onError={() => setFailed(true)}
    />
  );
}
