import { test } from "node:test";
import assert from "node:assert/strict";
import { exceeds, findMassDeletions, restoreDeleted, settleUnfinished } from "../src/safety";
import { FileRecord, SyncAction, SyncPlanItem } from "../src/types";

function rec(path: string, md5: string): FileRecord {
	return { path, mtime: 0, size: 1, md5 };
}

/** Deleted here; still on Yandex Disk as it was. */
function goneHere(path: string, md5 = `md5-${path}`): SyncPlanItem {
	return {
		path,
		action: SyncAction.DeleteRemote,
		remoteRecord: rec(path, md5),
		prevLocalRecord: rec(path, md5),
		prevRemoteRecord: rec(path, md5),
	};
}

/** Removed from Yandex Disk; still here as it was. */
function goneThere(path: string, md5 = `md5-${path}`): SyncPlanItem {
	return {
		path,
		action: SyncAction.DeleteLocal,
		localRecord: rec(path, md5),
		prevLocalRecord: rec(path, md5),
		prevRemoteRecord: rec(path, md5),
	};
}

function newHere(path: string, md5: string): SyncPlanItem {
	return { path, action: SyncAction.UploadNew, localRecord: rec(path, md5) };
}

function newThere(path: string, md5: string): SyncPlanItem {
	return { path, action: SyncAction.DownloadNew, remoteRecord: rec(path, md5) };
}

function many(count: number, make: (i: number) => SyncPlanItem): SyncPlanItem[] {
	return Array.from({ length: count }, (_, i) => make(i));
}

function guard(trackedLocal: number, trackedRemote = trackedLocal) {
	return { threshold: 50, trackedLocal, trackedRemote };
}

test("never asks below the floor, even for a whole small vault", () => {
	assert.equal(exceeds(9, 9, 50), false);
});

test("asks from the threshold on", () => {
	assert.equal(exceeds(49, 5000, 50), false);
	assert.equal(exceeds(50, 5000, 50), true);
});

test("asks from a quarter of the side on", () => {
	assert.equal(exceeds(10, 40, 50), true);
	assert.equal(exceeds(10, 41, 50), false);
});

test("a vault that vanished is a mass deletion here", () => {
	const found = findMassDeletions(many(60, (i) => goneHere(`note-${i}.md`)), guard(60));
	assert.equal(found.length, 1);
	assert.equal(found[0].side, "local");
	assert.equal(found[0].paths.length, 60);
	assert.equal(found[0].tracked, 60);
});

test("files removed from Yandex Disk count on the remote side", () => {
	const found = findMassDeletions(many(60, (i) => goneThere(`note-${i}.md`)), guard(5000));
	assert.deepEqual(
		found.map((f) => f.side),
		["remote"],
	);
});

test("a renamed folder is not a deletion", () => {
	const plan = [
		...many(3000, (i) => goneHere(`Attachments/${i}.png`, `h${i}`)),
		...many(3000, (i) => newHere(`Assets/${i}.png`, `h${i}`)),
	];
	assert.deepEqual(findMassDeletions(plan, guard(5000)), []);
});

test("a folder renamed on Yandex Disk is not a deletion either", () => {
	const plan = [
		...many(100, (i) => goneThere(`Old/${i}.md`, `h${i}`)),
		...many(100, (i) => newThere(`New/${i}.md`, `h${i}`)),
	];
	assert.deepEqual(findMassDeletions(plan, guard(5000)), []);
});

test("one new file accounts for one deletion only", () => {
	const plan = [...many(60, (i) => goneHere(`copy-${i}.md`, "same")), newHere("kept.md", "same")];
	assert.equal(findMassDeletions(plan, guard(5000))[0].paths.length, 59);
});

test("content without a hash cannot vouch for a move", () => {
	const plan = [...many(60, (i) => goneHere(`f-${i}`, "")), ...many(60, (i) => newHere(`g-${i}`, ""))];
	assert.equal(findMassDeletions(plan, guard(5000))[0].paths.length, 60);
});

test("moving the old version does not excuse deleting one changed on the other side", () => {
	const plan = [
		// Moved here from their old content, while edited on Yandex Disk.
		...many(60, (i) => ({ ...goneHere(`n-${i}.md`, `old${i}`), remoteRecord: rec(`n-${i}.md`, `edited${i}`) })),
		...many(60, (i) => newHere(`m-${i}.md`, `old${i}`)),
	];
	assert.equal(findMassDeletions(plan, guard(5000))[0].paths.length, 60);
});

test("approved deletions stop counting, on their own side only", () => {
	const plan = many(60, (i) => goneHere(`n-${i}.md`));
	const all = new Set(plan.map((p) => p.path));
	assert.deepEqual(findMassDeletions(plan, { ...guard(5000), approved: { local: all, remote: new Set() } }), []);
	assert.equal(findMassDeletions(plan, { ...guard(5000), approved: { local: new Set(), remote: all } }).length, 1);
});

test("deletions beyond the approved ones are weighed by themselves", () => {
	const plan = many(180, (i) => goneHere(`n-${i}.md`));
	const approved = new Set(plan.slice(0, 120).map((p) => p.path));
	const found = findMassDeletions(plan, { ...guard(5000), approved: { local: approved, remote: new Set() } });
	assert.equal(found[0].paths.length, 60);
});

test("restoring copies a file back from the side that still has it", () => {
	const conflict: SyncPlanItem = {
		path: "d.md",
		action: SyncAction.Conflict,
		remoteRecord: rec("d.md", "edited"),
		prevLocalRecord: rec("d.md", "old"),
		prevRemoteRecord: rec("d.md", "old"),
	};
	const plan = restoreDeleted(
		[goneHere("a.md"), goneThere("b.md"), goneHere("c.md"), conflict],
		new Set(["a.md", "b.md", "d.md"]),
	);
	assert.deepEqual(
		plan.map((p) => p.action),
		[SyncAction.DownloadNew, SyncAction.UploadNew, SyncAction.DeleteRemote, SyncAction.DownloadNew],
	);
});

test("unfinished work is rolled back to the last sync, finished work kept", () => {
	const old = rec("a.md", "old");
	const plan: SyncPlanItem[] = [
		// An edit whose upload failed.
		{
			path: "a.md",
			action: SyncAction.UploadModified,
			localRecord: rec("a.md", "new"),
			remoteRecord: old,
			prevLocalRecord: old,
			prevRemoteRecord: old,
		},
		// A deletion that never ran.
		goneHere("b.md"),
		// A new file whose upload went through, and one whose upload did not.
		newHere("c.md", "c"),
		newHere("e.md", "e"),
		{ path: "d.md", action: SyncAction.Skip, localRecord: rec("d.md", "d"), remoteRecord: rec("d.md", "d") },
	];
	const local: Record<string, FileRecord> = {
		"a.md": rec("a.md", "new"),
		"c.md": rec("c.md", "c"),
		"d.md": rec("d.md", "d"),
		"e.md": rec("e.md", "e"),
	};
	const remote: Record<string, FileRecord> = {
		"a.md": old,
		"b.md": rec("b.md", "md5-b.md"),
		"c.md": rec("c.md", "c"),
		"d.md": rec("d.md", "d"),
	};

	settleUnfinished(plan, new Set(["c.md"]), local, remote);

	assert.equal(local["a.md"].md5, "old", "a failed upload is retried, not taken as synced");
	assert.equal(local["b.md"]?.md5, "md5-b.md", "a deletion that never ran stays a deletion");
	assert.equal("e.md" in local, false, "a new file that never went up is still new");
	assert.equal(local["c.md"].md5, "c");
	assert.equal(remote["c.md"].md5, "c");
	assert.equal(local["d.md"].md5, "d");
});
