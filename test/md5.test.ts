import { createHash, randomBytes } from "node:crypto";
import { test } from "node:test";
import assert from "node:assert/strict";
import { IncrementalMd5, md5 } from "../src/md5";

const reference = (bytes: Uint8Array): string => createHash("md5").update(bytes).digest("hex");

test("MD5 matches Node crypto for empty, random, and block-boundary inputs", () => {
	for (const length of [0, 1, 55, 56, 63, 64, 65, 127, 128, 129, 4097]) {
		const bytes = randomBytes(length);
		assert.equal(md5(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)), reference(bytes));
		for (const chunkSize of [1, 7, 63, 64, 65, 257]) {
			const hasher = new IncrementalMd5();
			for (let offset = 0; offset < bytes.length; offset += chunkSize) {
				hasher.update(bytes.subarray(offset, Math.min(offset + chunkSize, bytes.length)));
			}
			assert.equal(hasher.digest(), reference(bytes), `length=${length}, chunkSize=${chunkSize}`);
			assert.equal(hasher.digest(), reference(bytes), "digest is repeatable");
		}
	}
});

test("incremental MD5 handles a 200 MiB stream without retaining the input", () => {
	const chunk = randomBytes(1024 * 1024);
	const expected = createHash("md5");
	const actual = new IncrementalMd5();
	for (let i = 0; i < 200; i++) {
		expected.update(chunk);
		actual.update(chunk);
	}
	assert.equal(actual.digest(), expected.digest("hex"));
});

test("incremental MD5 encodes lengths above 512 MiB", () => {
	const chunk = new Uint8Array(1024 * 1024).fill(0xa5);
	const expected = createHash("md5");
	const actual = new IncrementalMd5();
	for (let i = 0; i < 513; i++) {
		expected.update(chunk);
		actual.update(chunk.buffer);
	}
	assert.equal(actual.digest(), expected.digest("hex"));
});
