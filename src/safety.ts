import { ApprovedDeletions, FileRecord, MassDeletion, SyncAction, SyncPlanItem } from "./types";

/** Fewer deletions than this on one side never stop a sync. */
export const DELETE_GUARD_FLOOR = 10;

/** Losing this share of one side stops a sync whatever the threshold. */
export const DELETE_GUARD_SHARE = 0.25;

export interface DeletionGuard {
	/** Deletions on one side that always need confirmation — the setting. */
	threshold: number;
	/** Files each side had at the last sync. */
	trackedLocal: number;
	trackedRemote: number;
	approved?: ApprovedDeletions;
}

/**
 * Finds deletions large enough to stop and ask about first.
 *
 * A file missing from one side reads as the user having deleted it, which
 * only holds while that side is really there. A vault whose drive was
 * unplugged, or a remote folder someone emptied, looks exactly like one
 * whose every file was deleted on purpose — and the sync would faithfully
 * repeat that on every other device.
 *
 * A move is not a loss. The plugin sees a renamed folder as its old files
 * deleted and new ones created, so a deletion whose content turns up as a
 * new file on the same side is taken for one, and reorganising a vault does
 * not stop the sync. Each new file accounts for one deletion at most.
 */
export function findMassDeletions(plan: SyncPlanItem[], guard: DeletionGuard): MassDeletion[] {
	const appearedHere = new Map<string, number>();
	const appearedThere = new Map<string, number>();
	const goneHere: SyncPlanItem[] = [];
	const goneThere: SyncPlanItem[] = [];

	for (const item of plan) {
		if (item.localRecord && !item.prevLocalRecord) tally(appearedHere, item.localRecord.md5);
		if (item.remoteRecord && !item.prevRemoteRecord) tally(appearedThere, item.remoteRecord.md5);

		if (item.action === SyncAction.DeleteRemote && !guard.approved?.local.has(item.path)) {
			goneHere.push(item);
		} else if (item.action === SyncAction.DeleteLocal && !guard.approved?.remote.has(item.path)) {
			goneThere.push(item);
		}
	}

	const found: MassDeletion[] = [];

	// Matched on the copy the deletion would destroy rather than on what the
	// file used to be: the other side may have changed it since, and moving
	// the old version elsewhere does not preserve that change.
	const here = unexplained(goneHere, (item) => item.remoteRecord, appearedHere);
	if (exceeds(here.length, guard.trackedLocal, guard.threshold)) {
		found.push({ side: "local", paths: here, tracked: guard.trackedLocal });
	}

	const there = unexplained(goneThere, (item) => item.localRecord, appearedThere);
	if (exceeds(there.length, guard.trackedRemote, guard.threshold)) {
		found.push({ side: "remote", paths: there, tracked: guard.trackedRemote });
	}

	return found;
}

/** Whether this many deletions from a side of this size is worth asking about. */
export function exceeds(deletions: number, tracked: number, threshold: number): boolean {
	if (deletions < DELETE_GUARD_FLOOR) return false;
	return deletions >= threshold || deletions >= tracked * DELETE_GUARD_SHARE;
}

/**
 * Undoes the deletion of each path by copying it back from whichever side
 * still has it. Whatever the plan meant to do with the path — delete it, or
 * ask about it — no longer applies.
 */
export function restoreDeleted(plan: SyncPlanItem[], paths: ReadonlySet<string>): SyncPlanItem[] {
	return plan.map((item) => {
		if (!paths.has(item.path)) return item;
		if (item.remoteRecord && !item.localRecord) return { ...item, action: SyncAction.DownloadNew };
		if (item.localRecord && !item.remoteRecord) return { ...item, action: SyncAction.UploadNew };
		return item;
	});
}

/**
 * Rolls every planned change that did not happen back to how the last sync
 * left it, so the next run tries it again.
 *
 * The snapshots come out of the scan, which records each file as it was
 * found. Saved as they are, an upload that failed would read next time as a
 * file already in step with the server — its edit stranded until something
 * else touched it — and a deletion that never ran would come back as a new
 * file on the other side.
 */
export function settleUnfinished(
	plan: SyncPlanItem[],
	done: ReadonlySet<string>,
	localSnapshot: Record<string, FileRecord>,
	remoteSnapshot: Record<string, FileRecord>,
): void {
	for (const item of plan) {
		if (item.action === SyncAction.Skip || done.has(item.path)) continue;
		revert(localSnapshot, item.path, item.prevLocalRecord);
		revert(remoteSnapshot, item.path, item.prevRemoteRecord);
	}
}

/** Paths whose content does not simply turn up again under another name. */
function unexplained(
	items: SyncPlanItem[],
	destroyed: (item: SyncPlanItem) => FileRecord | undefined,
	appeared: Map<string, number>,
): string[] {
	const paths: string[] = [];
	for (const item of items) {
		const md5 = destroyed(item)?.md5;
		const left = md5 ? appeared.get(md5) ?? 0 : 0;
		if (md5 && left > 0) {
			appeared.set(md5, left - 1);
			continue;
		}
		paths.push(item.path);
	}
	return paths;
}

function tally(counts: Map<string, number>, md5: string): void {
	// The API does not always send a hash, and unknown content cannot vouch
	// for a move.
	if (!md5) return;
	counts.set(md5, (counts.get(md5) ?? 0) + 1);
}

function revert(snapshot: Record<string, FileRecord>, path: string, prev: FileRecord | undefined): void {
	if (prev) snapshot[path] = prev;
	else delete snapshot[path];
}
