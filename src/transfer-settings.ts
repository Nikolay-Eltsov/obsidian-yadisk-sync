export const MOBILE_DOWNLOAD_CHUNK_SIZES_MB = [1, 2, 4, 8] as const;
export const DEFAULT_MOBILE_DOWNLOAD_CHUNK_SIZE_MB = 4;

/** Reject unsupported persisted values before they can increase memory use. */
export function mobileDownloadChunkSizeMB(value: unknown): number {
	return MOBILE_DOWNLOAD_CHUNK_SIZES_MB.some(size => size === value)
		? value as number
		: DEFAULT_MOBILE_DOWNLOAD_CHUNK_SIZE_MB;
}

export function mobileDownloadChunkBytes(value: unknown): number {
	return mobileDownloadChunkSizeMB(value) * 1024 * 1024;
}
