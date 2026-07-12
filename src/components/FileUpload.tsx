"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { DocIcon, CameraIcon, TrashIcon } from "@/components/icons";

export function FileUpload({
  naam,
  url,
  onChange,
  cameraCapture = false,
  emptyLabel = "+ Bestand kiezen (PDF of foto)",
}: {
  naam: string;
  url: string;
  onChange: (naam: string, url: string) => void;
  cameraCapture?: boolean;
  emptyLabel?: string;
}) {
  const pickRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload_(file: File) {
    setBusy(true);
    setError(null);
    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/upload",
      });
      onChange(file.name, blob.url);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload mislukt";
      setError(
        /token/i.test(msg)
          ? "Bestandsopslag is nog niet ingesteld voor deze app (Vercel Blob)."
          : `Upload mislukt: ${msg}`,
      );
    } finally {
      setBusy(false);
    }
  }

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) upload_(file);
  }

  if (url || naam) {
    return (
      <div className="flex items-center gap-2.5 bg-card border border-card-border rounded-2xl px-3.5 py-3">
        <div className="w-9 h-9 rounded-xl bg-accent-tint flex items-center justify-center shrink-0">
          <DocIcon size={17} className="text-accent" />
        </div>
        <a
          href={url || undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 min-w-0 text-[13.5px] font-semibold truncate"
          style={{ pointerEvents: url ? "auto" : "none" }}
        >
          {naam || "Document"}
        </a>
        <button
          type="button"
          onClick={() => onChange("", "")}
          className="w-8 h-8 rounded-full flex items-center justify-center text-danger shrink-0"
        >
          <TrashIcon size={15} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input ref={pickRef} type="file" accept="application/pdf,image/*" onChange={onPick} className="hidden" />
      <button
        type="button"
        onClick={() => pickRef.current?.click()}
        disabled={busy}
        className="border-[1.5px] border-dashed border-input-border rounded-2xl p-4.5 text-center text-[13.5px] text-muted disabled:opacity-60"
      >
        {busy ? "Uploaden…" : emptyLabel}
      </button>

      {cameraCapture && (
        <>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onPick}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full bg-track text-ink-soft text-[13px] font-semibold disabled:opacity-60"
          >
            <CameraIcon size={15} /> Foto maken
          </button>
        </>
      )}

      {error && <div className="text-[12px] text-danger font-semibold">{error}</div>}
    </div>
  );
}
