"use client";

import { Upload, X } from "lucide-react";
import Image from "next/image";
import { useRef } from "react";

interface ImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

export default function ImageUpload({ value, onChange }: ImageUploadProps) {
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
      onChange(data.data.url);
    }
  };

  return (
    <div className="space-y-4">
      {!value ? (
        <div
          className="border-2 border-dashed rounded-xl p-10 text-center cursor-pointer hover:bg-muted/40 transition"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 font-medium">Upload Image</h3>
          <p className="text-sm text-muted-foreground">Click or drag an image here.</p>
          <input
            ref={inputRef}
            type="file"
            hidden
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
            }}
          />
        </div>
      ) : (
        <div className="relative h-64 rounded-xl overflow-hidden border">
          <Image src={value} alt="Uploaded" fill className="object-cover" />
          <button
            type="button"
            className="absolute top-2 right-2 h-8 w-8 rounded-full bg-destructive text-white flex items-center justify-center"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}
