export function normalizePath(p: string): string {
	return p.replace(/\\/g, "/").replace(/\/+/g, "/").replace(/\/$/, "");
}

export function isoToTimestamp(iso: string): number {
	return new Date(iso).getTime();
}

export function sortByDepthAsc(paths: string[]): string[] {
	return [...paths].sort((a, b) => {
		const da = a.split("/").length;
		const db = b.split("/").length;
		return da - db || a.localeCompare(b);
	});
}

export function sortByDepthDesc(paths: string[]): string[] {
	return [...paths].sort((a, b) => {
		const da = a.split("/").length;
		const db = b.split("/").length;
		return db - da || a.localeCompare(b);
	});
}

export function debounce<T extends (...args: unknown[]) => void>(
	fn: T,
	ms: number,
): (...args: Parameters<T>) => void {
	let timer: ReturnType<typeof setTimeout> | null = null;
	return (...args: Parameters<T>) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
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
