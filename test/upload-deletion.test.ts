import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { runInNewContext } from "node:vm";

// Exercise the real engine with only Obsidian's host API replaced.
const folder = mkdtempSync(join(tmpdir(), "yadisk-engine-test-"));
const bundle = join(folder, "engine.cjs");
execFileSync(join(process.cwd(), "node_modules/.bin/esbuild"), ["src/sync-engine.ts", "--bundle", "--platform=node", "--format=cjs", "--external:obsidian", `--outfile=${bundle}`, "--log-level=error"]);
const module = { exports: {} as any };
class TFile {}
try {
 runInNewContext(readFileSync(bundle, "utf8"), { module, exports: module.exports, require: () => ({ TFile, Modal: class {}, Platform: { isMobile: false }, requireApiVersion: () => true, getLanguage: () => "en" }), setTimeout, clearTimeout, window: { setTimeout, clearTimeout }, console, Blob });
} finally { rmSync(folder, { recursive: true }); }
const Engine = module.exports.SyncEngine;
function scenario(onDisk: boolean, storage = true) {
 const app = { vault: { getAbstractFileByPath: () => null, adapter: { exists: async () => onDisk } } };
 const engine = new Engine(app, { toRemotePath: (path: string) => path }, {}, {});
 const stats = { uploaded: 0, downloaded: 0, deleted: 0, errors: 0, skipped: 0, aborted: false };
 const item = { path: "deleted.md", action: "upload_modified" };
 return { engine, stats, item, hooks: { checkStorage: async () => storage } };
}
test("an upload deleted after planning is deferred without an error or remote change", async () => {
 const { engine, stats, item, hooks } = scenario(false);
 const result = await engine.executeItem(item, stats, {}, {}, hooks);
 assert.equal(result, false);
 assert.equal(stats.skipped, 1);
 assert.equal(stats.errors, 0);
 assert.equal(stats.uploaded, 0);
});
test("an unindexed file still present on disk is not treated as a user deletion", async () => {
 const { engine, stats, item, hooks } = scenario(true);
 await assert.rejects(engine.executeItem(item, stats, {}, {}, hooks), /Local file not found/);
 assert.equal(stats.skipped, 0);
});
test("missing vault storage is blocked rather than treated as a user deletion", async () => {
 const { engine, stats, item, hooks } = scenario(false, false);
 assert.equal(await engine.executeItem(item, stats, {}, {}, hooks), false);
 assert.equal(engine.halt.kind, "storage");
 assert.equal(stats.skipped, 0);
});
test("deletion during an asynchronous file read is deferred too", async () => {
 const { engine, stats, item, hooks } = scenario(false);
 let present = true;
 const file = Object.assign(new TFile(), { stat: { size: 1, mtime: 1 } });
 engine.app.vault.getAbstractFileByPath = () => present ? file : null;
 engine.app.vault.readBinary = async () => { present = false; throw Error("File disappeared during read"); };
 assert.equal(await engine.executeItem(item, stats, {}, {}, hooks), false);
 assert.equal(stats.skipped, 1);
 assert.equal(stats.errors, 0);
});
test("urgent uploads defer deletion and release their in-flight queue entry", async () => {
 const { engine, stats, item, hooks } = scenario(false);
 let finished = 0;
 const completed = new Set();
 const queue = { expedited() {}, started() {}, finished() { finished++; } };
 await engine.runUrgent(item, { stats, completed, hooks: { ...hooks, queue }, localSnapshot: {}, remoteSnapshot: {} });
 assert.equal(stats.skipped, 1);
 assert.equal(stats.errors, 0);
 assert.equal(finished, 1);
 assert.equal(completed.size, 0);
 assert.equal(engine.inFlight.size, 0);
});
