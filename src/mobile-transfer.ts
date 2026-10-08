import { IncrementalMd5 } from "./md5";

export const TRANSFER_CHUNK = 4 * 1024 * 1024;
export interface RangeResponse {
 status: number;
 headers: Record<string, string>;
 arrayBuffer: ArrayBuffer;
}

/** No full-body fallback: a server ignoring Range must never reach the native bridge. */
export async function downloadInChunks(
 size: number,
 request: (start: number, end: number) => Promise<RangeResponse>,
 append: (chunk: ArrayBuffer) => Promise<void>,
 shouldStop: () => boolean,
 chunkBytes = TRANSFER_CHUNK,
): Promise<string> {
 if (!Number.isInteger(chunkBytes) || chunkBytes <= 0 || chunkBytes > 8 * 1024 * 1024) throw new Error("Invalid mobile download chunk size");
 const hash = new IncrementalMd5();
 for (let start = 0; start < size; start += chunkBytes) {
  if (shouldStop()) throw new Error("Transfer cancelled");
  const end = Math.min(start + chunkBytes, size) - 1;
  const r = await request(start, end);
  const range = Object.entries(r.headers).find(([k]) => k.toLowerCase() === "content-range")?.[1];
  if (r.status !== 206 || range !== `bytes ${start}-${end}/${size}` || r.arrayBuffer.byteLength !== end - start + 1) {
   throw new Error("Invalid partial download; original file preserved");
  }
  if (shouldStop()) throw new Error("Transfer cancelled");
  hash.update(r.arrayBuffer);
  await append(r.arrayBuffer);
  await new Promise<void>(resolve => setTimeout(resolve, 0));
 }
 return hash.digest();
}

export async function hashStream(reader: ReadableStreamDefaultReader<Uint8Array>, shouldStop: () => boolean): Promise<string> {
 const hash = new IncrementalMd5();
 try {
  while (true) {
   if (shouldStop()) throw new Error("Transfer cancelled");
   const { value, done } = await reader.read();
   if (done) break;
   hash.update(value);
   await new Promise<void>(resolve => setTimeout(resolve, 0));
  }
  return hash.digest();
 } finally {
  await reader.cancel().catch(() => {});
  reader.releaseLock();
 }
}

let mobileUploadQueue = Promise.resolve();
/** Prepare only one large Blob at a time, including urgent uploads. */
export async function withMobileUpload<T>(work: () => Promise<T>): Promise<T> {
 const previous = mobileUploadQueue;
 let release!: () => void;
 mobileUploadQueue = new Promise<void>(resolve => { release = resolve; });
 await previous;
 try { return await work(); } finally { release(); }
}
