const _a = "MDVmMDMxZWJlMTVhNGQ3M2E5MmZjNDJjMDJkNGZhOTA=";
const _b = "NTQ2ZDdlY2VmNTE3NGQ3Njg4YjdkMjFiOGZjMjk2YTU=";

export function getClientId(): string {
	return atob(_a);
}

export function getClientSecret(): string {
	return atob(_b);
}
