import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeRemotePath } from "../src/utils";

test("a remote folder is rooted however it was typed", () => {
	assert.equal(normalizeRemotePath("obs/Nikolay Eltsov"), "/obs/Nikolay Eltsov");
	assert.equal(normalizeRemotePath("/obs/Nikolay Eltsov/"), "/obs/Nikolay Eltsov");
	assert.equal(normalizeRemotePath("disk:/obs/Nikolay Eltsov"), "/obs/Nikolay Eltsov");
	assert.equal(normalizeRemotePath("  //obs\\Nikolay Eltsov "), "/obs/Nikolay Eltsov");
});
