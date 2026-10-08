import { test } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { downloadInChunks, hashStream, TRANSFER_CHUNK } from "../src/mobile-transfer";
import { MOBILE_DOWNLOAD_CHUNK_SIZES_MB, mobileDownloadChunkBytes, mobileDownloadChunkSizeMB } from "../src/transfer-settings";

test("selected chunk sizes control request ranges and preserve the complete digest", async () => {
 for (const sizeMB of MOBILE_DOWNLOAD_CHUNK_SIZES_MB) {
  const chunk = mobileDownloadChunkBytes(sizeMB);
  const bytes = new Uint8Array(chunk * 2 + 17).fill(91);
  const ranges: number[][] = [];
  let written = 0;
  const digest = await downloadInChunks(bytes.length, async (start, end) => {
   ranges.push([start, end]);
   return {status:206, headers:{"content-range":`bytes ${start}-${end}/${bytes.length}`}, arrayBuffer:bytes.slice(start,end+1).buffer};
  }, async data => { assert.ok(data.byteLength <= chunk); written += data.byteLength; }, () => false, chunk);
  assert.deepEqual(ranges, [[0,chunk-1],[chunk,chunk*2-1],[chunk*2,chunk*2+16]]);
  assert.equal(written, bytes.length);
  assert.equal(digest, createHash("md5").update(bytes).digest("hex"));
 }
});

test("missing or unsafe persisted chunk settings fall back to 4 MiB", () => {
 for (const value of [undefined, null, 0, -1, 3, 16, Infinity, NaN, "8", 1.5]) {
  assert.equal(mobileDownloadChunkSizeMB(value), 4);
  assert.equal(mobileDownloadChunkBytes(value), TRANSFER_CHUNK);
 }
 for (const size of MOBILE_DOWNLOAD_CHUNK_SIZES_MB) assert.equal(mobileDownloadChunkSizeMB(size), size);
});

test("invalid low-level chunk sizes fail before making any request", async () => {
 for (const size of [0,-1,NaN,Infinity,0.5,16*1024*1024]) {
  let requested = false;
  await assert.rejects(downloadInChunks(1, async () => {requested=true;throw Error("Unexpected request")}, async () => {}, () => false, size), /Invalid mobile download chunk size/);
  assert.equal(requested, false);
 }
});

test("range download limits memory and hashes exact bytes across a partial last chunk", async () => {
 const bytes = new Uint8Array(TRANSFER_CHUNK * 2 + 17).fill(193);
 let received = 0;
 const digest = await downloadInChunks(bytes.length, async (a, b) => ({status:206,headers:{"Content-Range":`bytes ${a}-${b}/${bytes.length}`},arrayBuffer:bytes.slice(a,b+1).buffer}), async part => {
  assert.ok(part.byteLength <= TRANSFER_CHUNK);assert.deepEqual(new Uint8Array(part),bytes.subarray(received,received+part.byteLength));received += part.byteLength;
 }, () => false);
 assert.equal(received,bytes.length);assert.equal(digest,createHash("md5").update(bytes).digest("hex"));
});
test("wrong range, truncated response and full-body response never append data", async () => {
 for (const r of [{status:200,headers:{},arrayBuffer:new ArrayBuffer(5)}, {status:206,headers:{"content-range":"bytes 0-4/5"},arrayBuffer:new ArrayBuffer(4)}, {status:206,headers:{"content-range":"bytes 1-5/5"},arrayBuffer:new ArrayBuffer(5)}]) {
  let appended=false;
  await assert.rejects(downloadInChunks(5,async()=>r,async()=>{appended=true},()=>false));assert.equal(appended,false);
 }
});
test("cancellation between receive and write preserves staged content", async () => {
 let stopped=false;let appended=false;
 await assert.rejects(downloadInChunks(5,async()=>{stopped=true;return {status:206,headers:{"content-range":"bytes 0-4/5"},arrayBuffer:new ArrayBuffer(5)}},async()=>{appended=true},()=>stopped),/cancelled/);
 assert.equal(appended,false);
});
test("local streaming hash consumes chunks and cancels on failure",async()=>{
 const chunks=[new Uint8Array([1,2,3]),new Uint8Array([4,5])];
 const reader=new ReadableStream<Uint8Array>({start(c){for(const a of chunks)c.enqueue(a);c.close();}}).getReader();
 assert.equal(await hashStream(reader,()=>false),createHash('md5').update(Buffer.from([1,2,3,4,5])).digest('hex'));
 let cancelled=false;
 const aborted=new ReadableStream<Uint8Array>({cancel(){cancelled=true}}).getReader();
 await assert.rejects(hashStream(aborted,()=>true),/cancelled/);assert.equal(cancelled,true);
});
