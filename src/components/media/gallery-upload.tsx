"use client";

import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

interface GalleryUploadProps {
  value: string[];
  onChange: (value: string[]) => void;
}

export default function GalleryUpload({ value, onChange }: GalleryUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    if (data.success) {
      onChange([...value, data.data.url]);
    }
  };

  return (
    <div className="space-y-4">
      <div
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-muted/40 transition"
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Upload Gallery Images</p>
        <input
          ref={inputRef}
          hidden
          multiple
          type="file"
          accept="image/*"
          onChange={(e) => {
            const files = Array.from(e.target.files || []);
            files.forEach(handleUpload);
          }}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {value.map((image, index) => (
          <div key={index} className="relative h-40 rounded-lg overflow-hidden border">
            <Image src={image} alt="" fill className="object-cover" />
            <button
              type="button"
              className="absolute top-2 right-2 h-6 w-6 rounded-full bg-destructive text-white flex items-center justify-center text-xs"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
