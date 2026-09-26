import { setIcon } from "obsidian";
import { MessageKey, t } from "./i18n";
import { RemainingKind, SyncQueue } from "./queue";

const ICONS: Record<RemainingKind, string> = {
	upload: "upload",
	download: "download",
	deleteRemote: "cloud-off",
	deleteLocal: "trash-2",
};

const LABELS: Record<RemainingKind, MessageKey> = {
	upload: "queue.action.upload",
	download: "queue.action.download",
	deleteRemote: "queue.action.deleteRemote",
	deleteLocal: "queue.action.deleteLocal",
};

/**
 * What is left to send, download and delete, as small icons with counts.
 * Shared by the queue view and the status bar. Adds nothing when nothing
 * is left.
 */
export function renderRemaining(parent: HTMLElement, queue: SyncQueue): void {
	const remaining = queue.remaining();
	if (remaining.length === 0) return;
	const line = parent.createSpan({ cls: "yadisk-remaining" });
	for (const { kind, count } of remaining) {
		const item = line.createSpan({ cls: "yadisk-remaining-item" });
		item.setAttr("aria-label", `${t(LABELS[kind])}: ${count}`);
		setIcon(item.createSpan({ cls: "yadisk-remaining-icon" }), ICONS[kind]);
		item.createSpan({ text: count.toLocaleString() });
	}
}
