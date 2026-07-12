// Documents/photos live in a private Blob store, so raw blob URLs 404 without
// auth. Views always go through our own proxy route, which fetches the blob
// server-side with the app's token and streams it back.
export function fileViewUrl(blobUrl: string): string {
  return `/api/files?url=${encodeURIComponent(blobUrl)}`;
}
