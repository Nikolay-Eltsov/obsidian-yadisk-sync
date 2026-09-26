export function normalizePath(p: string): string {
	return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

/**
 * A remote folder in the form Yandex Disk reports paths under it: from the
 * root, with no trailing slash. Listings always come back rooted
 * ("disk:/obs/..."), so a folder entered as "obs/..." never matched them —
 * every file got the folder prefix in its local path, and every download
 * asked for a path that does not exist.
 */
export function normalizeRemotePath(p: string): string {
	const path = normalizePath(p.trim().replace(/^disk:/, ""));
	return path.startsWith("/") ? path : `/${path}`;
}

export function isoToTimestamp(iso: string): number {
	return new Date(iso).getTime();
}

export function pathDepth(p: string): number {
	let depth = 1;
	for (let i = 0; i < p.length; i++) {
		if (p.charCodeAt(i) === 47) depth++;
	}
	return depth;
}

/**
 * Counting semaphore used to bound how many requests are in flight at once.
 */
export class Semaphore {
	private waiters: (() => void)[] = [];

	constructor(private available: number) {}

	async acquire(): Promise<void> {
		if (this.available > 0) {
			this.available--;
			return;
		}
		await new Promise<void>((resolve) => this.waiters.push(resolve));
	}

	release(): void {
		const next = this.waiters.shift();
		if (next) {
			next();
		} else {
			this.available++;
		}
	}
}

/**
 * Runs `worker` over `items` with at most `concurrency` calls in flight.
 * Workers pull from a shared cursor, so slow items do not stall the others.
 * Individual failures are the worker's business; they are not caught here.
 *
 * `priority` is asked before every item and may hand back a task to run
 * first: work that turned up after the pool started and should not wait
 * behind the rest of it.
 */
export async function runPool<T>(
	items: T[],
	concurrency: number,
	worker: (item: T) => Promise<void>,
	shouldStop?: () => boolean,
	priority?: () => (() => Promise<void>) | undefined,
): Promise<void> {
	let cursor = 0;
	const size = Math.max(1, Math.min(concurrency, items.length));

	const runners: Promise<void>[] = [];
	for (let i = 0; i < size; i++) {
		runners.push(
			(async () => {
				for (;;) {
					if (shouldStop && shouldStop()) return;
					const urgent = priority?.();
					if (urgent) {
						await urgent();
						continue;
					}
					const index = cursor++;
					if (index >= items.length) return;
					await worker(items[index]);
				}
			})(),
		);
	}

	await Promise.all(runners);
}

/**
 * Settles with the promise's value, or with null if it fails or `ms` pass
 * first. The call itself carries on; only the waiting stops — which is the
 * point on a drive that is going away, where a read can hang rather than
 * fail.
 */
export function resolveWithin<T>(promise: Promise<T>, ms: number): Promise<T | null> {
	return new Promise((resolve) => {
		const timer = window.setTimeout(() => resolve(null), ms);
		promise.then(
			(value) => {
				window.clearTimeout(timer);
				resolve(value);
			},
			() => {
				window.clearTimeout(timer);
				resolve(null);
			},
		);
	});
}

/** Yields to the event loop so long synchronous loops can repaint. */
export function yieldToUi(): Promise<void> {
	return new Promise((resolve) => window.setTimeout(resolve, 0));
}

export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	ms: number,
): (...args: Parameters<T>) => void {
	let timer: number | null = null;
	return (...args: Parameters<T>) => {
		if (timer) window.clearTimeout(timer);
		timer = window.setTimeout(() => fn(...args), ms);
	};
}

/**
 * Simple glob matching supporting *, ** and ? patterns.
 */
export function minimatch(path: string, pattern: string): boolean {
	const regexStr = pattern
		.split("**")
		.map((segment) =>
			segment
				.split("*")
				.map((part) => part.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\?/g, "[^/]"))
				.join("[^/]*"),
		)
		.join(".*");
	const regex = new RegExp(`^${regexStr}$`);
	return regex.test(path);
}

export function matchesExcludePattern(path: string, patterns: string[]): boolean {
	return patterns.some((p) => minimatch(path, p));
}
