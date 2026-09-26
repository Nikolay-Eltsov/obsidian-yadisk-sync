import { test } from "node:test";
import assert from "node:assert/strict";
import { QUEUE_HISTORY_LIMIT, SyncQueue } from "../src/queue";
import { SyncAction, SyncPlanItem } from "../src/types";

function item(path: string, action = SyncAction.UploadNew): SyncPlanItem {
	return { path, action };
}

test("files move from next to now to done in plan order", () => {
	const queue = new SyncQueue();
	const plan = [item("a.md"), item("b.md", SyncAction.DownloadNew), item("c.md", SyncAction.DeleteLocal)];
	queue.begin();
	queue.planned(plan);
	assert.deepEqual(queue.pending(10).map((e) => e.path), ["a.md", "b.md", "c.md"]);

	queue.started(plan[0]);
	queue.started(plan[1]);
	assert.deepEqual(queue.active().map((e) => e.path), ["a.md", "b.md"]);
	assert.deepEqual(queue.pending(10).map((e) => e.path), ["c.md"]);
	assert.equal(queue.pendingCount(), 1);

	queue.finished(plan[1]);
	queue.finished(plan[0], "Network error");
	assert.equal(queue.finishedCount(), 2);
	assert.deepEqual(queue.history.map((e) => [e.path, e.status, e.error]), [
		["a.md", "failed", "Network error"],
		["b.md", "done", undefined],
	]);
});

test("a stopped run drops what it did not start but keeps what it did", () => {
	const queue = new SyncQueue();
	const plan = [item("a.md"), item("b.md")];
	queue.begin();
	queue.planned(plan);
	queue.started(plan[0]);
	queue.finished(plan[0]);
	queue.end();

	assert.equal(queue.stage, "idle");
	assert.equal(queue.pendingCount(), 0);
	assert.deepEqual(queue.active(), []);
	assert.deepEqual(queue.history.map((e) => e.path), ["a.md"]);
});

test("history keeps only the newest files", () => {
	const queue = new SyncQueue();
	const plan = Array.from({ length: QUEUE_HISTORY_LIMIT + 5 }, (_, i) => item(`${i}.md`));
	queue.planned(plan);
	for (const p of plan) {
		queue.started(p);
		queue.finished(p);
	}
	assert.equal(queue.history.length, QUEUE_HISTORY_LIMIT);
	assert.equal(queue.history[0].path, `${QUEUE_HISTORY_LIMIT + 4}.md`);
});

test("observers hear every change", () => {
	const queue = new SyncQueue();
	let calls = 0;
	const unsubscribe = queue.subscribe(() => calls++);
	queue.begin();
	queue.planned([item("a.md")]);
	unsubscribe();
	queue.end();
	assert.equal(calls, 2);
});

test("waiting files are counted and listed by kind", () => {
	const queue = new SyncQueue();
	const plan = [
		item("a.md"),
		item("b.md", SyncAction.UploadModified),
		item("c.md", SyncAction.DownloadNew),
		item("d.md", SyncAction.DownloadNew),
		item("e.md", SyncAction.DeleteLocal),
	];
	queue.planned(plan);
	queue.started(plan[2]);

	assert.deepEqual(queue.pendingGroups(), [
		{ action: SyncAction.UploadNew, count: 1 },
		{ action: SyncAction.UploadModified, count: 1 },
		{ action: SyncAction.DownloadNew, count: 1 },
		{ action: SyncAction.DeleteLocal, count: 1 },
	]);
	assert.deepEqual(queue.pending(10, SyncAction.DownloadNew).map((e) => e.path), ["d.md"]);

	queue.end();
	assert.deepEqual(queue.pendingGroups(), []);
});

test("files changed here wait by name until a run takes them", () => {
	const queue = new SyncQueue();
	queue.noteLocalChange("new.md", "created");
	queue.noteLocalChange("new.md", "modified");
	queue.noteLocalChange("draft.md", "modified");
	queue.noteLocalChange("final.md", "renamed", "draft.md");
	assert.deepEqual([...queue.localChanges], [
		["new.md", "created"],
		["final.md", "renamed"],
	]);

	const taken = queue.takeLocalChanges();
	assert.equal(queue.localChanges.size, 0);

	// Edited again while the run was going, which then did not get through.
	queue.noteLocalChange("new.md", "deleted");
	queue.restoreLocalChanges(taken);
	assert.deepEqual([...queue.localChanges], [
		["final.md", "renamed"],
		["new.md", "deleted"],
	]);
});

test("changes made here join the groups of what sending them will do", () => {
	const queue = new SyncQueue();
	queue.planned([item("plan.md"), item("both.md", SyncAction.UploadModified)]);
	queue.noteLocalChange("typed.md", "modified");
	queue.noteLocalChange("made.md", "created");
	queue.noteLocalChange("gone.md", "deleted");
	// Already on its way in this run: shown once, as the run's.
	queue.noteLocalChange("both.md", "modified");

	assert.deepEqual(queue.pendingGroups(), [
		{ action: SyncAction.UploadNew, count: 2 },
		{ action: SyncAction.UploadModified, count: 2 },
		{ action: SyncAction.DeleteRemote, count: 1 },
	]);
	assert.equal(queue.pendingCount(), 5);
	assert.deepEqual(queue.localByAction().get(SyncAction.UploadModified), [{ path: "typed.md", kind: "modified" }]);
});

test("a file sent ahead leaves the changes waiting and is counted in the run", () => {
	const queue = new SyncQueue();
	const plan = [item("a.md", SyncAction.DownloadNew)];
	queue.planned(plan);
	queue.noteLocalChange("typed.md", "modified");

	const urgent = item("typed.md", SyncAction.UploadModified);
	queue.expedited(urgent);
	queue.started(urgent);
	assert.equal(queue.localChanges.size, 0);
	assert.deepEqual(queue.active().map((e) => e.path), ["typed.md"]);

	queue.finished(urgent);
	assert.equal(queue.entries.length, 2);
	assert.equal(queue.finishedCount(), 1);
	assert.equal(queue.pendingCount(), 1);
});

test("what is left comes in four kinds, new and changed together", () => {
	const queue = new SyncQueue();
	queue.planned([
		item("a.md", SyncAction.DownloadNew),
		item("b.md", SyncAction.DownloadModified),
		item("c.md", SyncAction.DeleteLocal),
	]);
	queue.noteLocalChange("typed.md", "modified");
	queue.noteLocalChange("made.md", "created");

	assert.deepEqual(queue.remaining(), [
		{ kind: "upload", count: 2 },
		{ kind: "download", count: 2 },
		{ kind: "deleteLocal", count: 1 },
	]);

	queue.end();
	queue.takeLocalChanges();
	assert.deepEqual(queue.remaining(), []);
});
