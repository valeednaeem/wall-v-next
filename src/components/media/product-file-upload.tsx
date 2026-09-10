"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, FileArchive, File, GripVertical, Loader2 } from "lucide-react";

export interface ProductFileData {
  id: string;
  name: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  description?: string;
  sortOrder: number;
  createdAt: string;
}

interface ProductFileUploadProps {
  value: ProductFileData[];
  onChange: (files: ProductFileData[]) => void;
}

const ACCEPTED_EXTENSIONS = ".pdf,.zip,.rar,.7z,.tar,.gz,.doc,.docx,.xls,.xlsx,.csv,.txt";

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function getFileIcon(mimeType: string) {
  if (mimeType === "application/pdf") return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("7z") || mimeType.includes("tar") || mimeType.includes("gzip")) return FileArchive;
  if (mimeType.includes("word") || mimeType.includes("document")) return FileText;
  if (mimeType.includes("excel") || mimeType.includes("sheet")) return FileText;
  return File;
}

function getFileTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    "application/pdf": "PDF",
    "application/zip": "ZIP",
    "application/x-rar-compressed": "RAR",
    "application/vnd.rar": "RAR",
    "application/x-7z-compressed": "7Z",
    "application/gzip": "GZ",
    "application/x-tar": "TAR",
    "application/msword": "DOC",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "DOCX",
    "application/vnd.ms-excel": "XLS",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "XLSX",
    "text/plain": "TXT",
    "text/csv": "CSV",
  };
  return map[mimeType] || mimeType.split("/").pop()?.toUpperCase() || "FILE";
}

export default function ProductFileUpload({ value, onChange }: ProductFileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const handleUpload = async (file: File) => {
    setUploading(true);
    setUploadError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/upload?purpose=product-file", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setUploadError(data.error || "Upload failed");
        return;
      }

      if (data.success) {
        const newFile: ProductFileData = {
          id: data.data.filename.split(".")[0],
          name: file.name.replace(/\.[^/.]+$/, ""),
          originalName: data.data.originalName,
          url: data.data.url,
          mimeType: data.data.type,
          size: data.data.size,
          description: "",
          sortOrder: value.length,
          createdAt: new Date().toISOString(),
        };
        onChange([...value, newFile]);
      }
    } catch {
      setUploadError("Network error. Please try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file);
  };

  const removeFile = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const updateFileName = (index: number, name: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], name };
    onChange(updated);
  };

  const updateFileDescription = (index: number, description: string) => {
    const updated = [...value];
    updated[index] = { ...updated[index], description };
    onChange(updated);
  };

  const moveFile = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.length) return;
    const updated = [...value];
    [updated[index], updated[newIndex]] = [updated[newIndex], updated[index]];
    updated.forEach((f, i) => { f.sortOrder = i; });
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition ${
          uploading ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50 cursor-pointer"
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">Uploading...</p>
          </div>
        ) : (
          <>
            <Upload className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm font-medium">Upload Downloadable File</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF, ZIP, RAR, 7Z, DOC, DOCX, XLS, XLSX, CSV, TXT (max 50MB)
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          hidden
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
        />
      </div>

      {uploadError && (
        <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {uploadError}
        </div>
      )}

      {value.length > 0 && (
        <div className="space-y-3">
          {value.map((file, index) => {
            const Icon = getFileIcon(file.mimeType);
            const typeLabel = getFileTypeLabel(file.mimeType);
            return (
              <div key={file.id} className="rounded-lg border p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    {value.length > 1 && (
                      <div className="flex flex-col gap-0.5">
                        <button
                          type="button"
                          onClick={() => moveFile(file.sortOrder, "up")}
                          disabled={index === 0}
                          className="text-xs hover:text-foreground disabled:opacity-30"
                        >
                          <GripVertical className="h-3 w-3 rotate-180" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveFile(file.sortOrder, "down")}
                          disabled={index === value.length - 1}
                          className="text-xs hover:text-foreground disabled:opacity-30"
                        >
                          <GripVertical className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                    <Icon className="h-8 w-8" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={file.name}
                        onChange={(e) => updateFileName(index, e.target.value)}
                        className="text-sm font-medium border-0 border-b border-transparent hover:border-muted-foreground/25 focus:border-primary focus:outline-none bg-transparent px-0 py-0.5 w-full"
                        placeholder="Display name"
                      />
                      <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground shrink-0">
                        {typeLabel}
                      </span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <input
                      type="text"
                      value={file.description || ""}
                      onChange={(e) => updateFileDescription(index, e.target.value)}
                      className="text-xs text-muted-foreground border-0 border-b border-transparent hover:border-muted-foreground/25 focus:border-primary focus:outline-none bg-transparent px-0 py-0.5 w-full mt-1"
                      placeholder="Description (optional)"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeFile(index)}
                    className="text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
