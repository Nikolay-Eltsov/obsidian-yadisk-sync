export function normalizePath(p: string): string {
	return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
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
 */
export async function runPool<T>(
	items: T[],
	concurrency: number,
	worker: (item: T) => Promise<void>,
	shouldStop?: () => boolean,
): Promise<void> {
	let cursor = 0;
	const size = Math.max(1, Math.min(concurrency, items.length));

	const runners: Promise<void>[] = [];
	for (let i = 0; i < size; i++) {
		runners.push(
			(async () => {
				for (;;) {
					if (shouldStop && shouldStop()) return;
					const index = cursor++;
					if (index >= items.length) return;
					await worker(items[index]);
				}
			})(),
		);
	}

	await Promise.all(runners);
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
