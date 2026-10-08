import { App, Platform, TFile } from "obsidian";
import { md5 } from "./md5";
import { hashStream, TRANSFER_CHUNK } from "./mobile-transfer";

export function needsMobileTransfer(size: number, chunkBytes = TRANSFER_CHUNK): boolean {
 return Platform.isMobile && size > chunkBytes;
}

/** Local WebView resource streaming avoids Capacitor's whole-file Base64 bridge. */
export async function hashVaultFile(app: App, file: TFile, stop: () => boolean = () => false): Promise<string> {
 if (!needsMobileTransfer(file.stat.size)) return md5(await app.vault.readBinary(file));
 const response = await fetch(app.vault.adapter.getResourcePath(file.path));
 if (!response.ok || !response.body) throw new Error("Cannot stream local file for hashing");
 return hashStream(response.body.getReader(), stop);
}

export async function vaultFileBlob(app: App, file: TFile): Promise<Blob> {
 const response = await fetch(app.vault.adapter.getResourcePath(file.path));
 if (!response.ok) throw new Error("Cannot read local file for upload");
 const blob = await response.blob();
 if (blob.size !== file.stat.size) throw new Error("Local file changed during upload preparation");
 return blob;
}
