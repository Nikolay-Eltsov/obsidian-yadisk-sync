import { addIcon } from "obsidian";

/**
 * The sync arrows with a small "Я" inside. Plain arrows are what Obsidian
 * Sync shows in the same status bar; the letter says which sync this is.
 */
export const SYNC_ICON = "yadisk-sync";

/**
 * Lucide's refresh-cw, scaled from its 24-unit grid to the 100 addIcon
 * expects. The outer group is what spins during a sync: the letter stays
 * upright, and the scale on the inner group is not overridden by the
 * animation's own transform.
 */
const ARROWS =
	'<g class="yadisk-sync-arrows"><g transform="scale(4.1667)" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
	'<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>' +
	'<path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/></g></g>';

// Nudged up and right of centre: centred, it touches the lower arrowhead.
const LETTER =
	'<text x="53" y="48" text-anchor="middle" dominant-baseline="central" font-size="38" font-weight="700" ' +
	'fill="currentColor" stroke="none" style="font-family: var(--font-interface), sans-serif">Я</text>';

export function registerSyncIcon(): void {
	addIcon(SYNC_ICON, ARROWS + LETTER);
}
