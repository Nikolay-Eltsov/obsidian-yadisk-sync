/** A durable recovery record is written before an existing target is moved. */
export interface StagingAdapter {
 exists(path: string): Promise<boolean>;
 mkdir(path: string): Promise<void>;
 read(path: string): Promise<string>;
 write(path: string, data: string): Promise<void>;
 rename(from: string, to: string): Promise<void>;
 remove(path: string): Promise<void>;
 list(path: string): Promise<{files: string[];folders: string[]}>;
}
export async function ensureStagingFolder(adapter: StagingAdapter, folder: string): Promise<void> {
 if (await adapter.exists(folder)) return;
 try { await adapter.mkdir(folder); } catch(error) { if (!(await adapter.exists(folder))) throw error; }
}
export async function replaceStaged(adapter: StagingAdapter, temp: string, target: string): Promise<void> {
 const backup = `${temp}.previous`;
 const journal = `${temp}.json`;
 await adapter.write(journal, JSON.stringify({target, temp, backup}));
 let saved = false;
 let committed = false;
 try {
  if (await adapter.exists(target)) { await adapter.rename(target, backup); saved = true; }
  try { await adapter.rename(temp, target); committed = true; }
  catch(error) {
   if (saved) { await adapter.rename(backup, target); saved = false; }
   throw error;
  }
 } finally {
  // A failed rollback keeps both the original and its recovery mapping.
  if (!saved || committed) {
   if (saved && await adapter.exists(backup)) await adapter.remove(backup);
   if (await adapter.exists(journal)) await adapter.remove(journal);
  }
 }
}
export async function recoverStaged(adapter: StagingAdapter, folder: string): Promise<string[]> {
 if (!(await adapter.exists(folder))) return [];
 const recovered: string[] = [];
 for (const journal of (await adapter.list(folder)).files.filter(p => p.endsWith('.part.json'))) {
  const record = JSON.parse(await adapter.read(journal));
  // Only records generated inside this private staging folder can move data.
  if (record.temp + '.json' !== journal || record.backup !== record.temp + '.previous' ||
      !record.temp.startsWith(folder + '/') || typeof record.target !== 'string' ||
      record.target.startsWith('/') || record.target.split('/').some((p: string) => p === '..' || p === '.') ||
      record.target.startsWith('.obsidian/') || !record.target) throw new Error('Invalid transfer recovery record');
  if (!(await adapter.exists(record.target)) && await adapter.exists(record.backup)) {
   await adapter.rename(record.backup, record.target);recovered.push(record.target);
  }
  // If the target already exists, retain any previous copy rather than guess
  // whether it was committed or a user wrote it while Obsidian was stopped.
  if (await adapter.exists(record.temp)) await adapter.remove(record.temp);
  if (!(await adapter.exists(record.backup))) await adapter.remove(journal);
 }
 return recovered;
}
