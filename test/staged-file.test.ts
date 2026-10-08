import { test } from "node:test";
import assert from "node:assert/strict";
import { replaceStaged, recoverStaged, StagingAdapter } from "../src/staged-file";
function adapter(initial: Record<string,string>, fail: (from:string,to:string)=>boolean =()=>false): StagingAdapter & {files:Map<string,string>} {
 const files=new Map(Object.entries(initial));
 return {files,exists:async p=>files.has(p)||[...files.keys()].some(x=>x.startsWith(p+"/")),mkdir:async()=>{},read:async p=>files.get(p)!,write:async(p,d)=>{files.set(p,d)},remove:async p=>{files.delete(p)},list:async p=>({files:[...files.keys()].filter(x=>x.startsWith(p+'/')),folders:[]}),rename:async(a,b)=>{if(fail(a,b))throw Error('simulated interruption');assert.ok(files.has(a));files.set(b,files.get(a)!);files.delete(a)}};
}
const temp='.obsidian/plugins/yadisk-sync/transfers/test.part',folder=temp.substring(0,temp.lastIndexOf('/'));
test('successful commit replaces target and cleans only its own recovery files',async()=>{
 const a=adapter({'note':'old',[temp]:'new','other':'keep'});await replaceStaged(a,temp,'note');assert.deepEqual(Object.fromEntries(a.files),{note:'new',other:'keep'});
});
test('failed commit restores existing target',async()=>{
 const a=adapter({'note':'old',[temp]:'new'},from=>from===temp);await assert.rejects(replaceStaged(a,temp,'note'));assert.equal(a.files.get('note'),'old');assert.equal(a.files.has(temp+'.json'),false);
});
test('failed rollback leaves durable mapping and recovery restores original before scan',async()=>{
 let failure=true;const a=adapter({'note':'old',[temp]:'new'},(from)=>failure&&(from===temp||from===temp+'.previous'));
 await assert.rejects(replaceStaged(a,temp,'note'));assert.equal(a.files.get(temp+'.previous'),'old');assert.ok(a.files.has(temp+'.json'));failure=false;
 assert.deepEqual(await recoverStaged(a,folder),['note']);assert.equal(a.files.get('note'),'old');assert.equal(a.files.has(temp),false);
});
test('process death after commit preserves both current target and previous copy',async()=>{
 const a=adapter({'note':'new',[temp+'.previous']:'old',[temp+'.json']:JSON.stringify({temp,target:'note',backup:temp+'.previous'})});await recoverStaged(a,folder);assert.equal(a.files.get('note'),'new');assert.equal(a.files.get(temp+'.previous'),'old');assert.ok(a.files.has(temp+'.json'));
});
test('malformed recovery target cannot move files outside the vault',async()=>{
 const a=adapter({[temp+'.json']:JSON.stringify({temp,target:'../secret',backup:temp+'.previous'})});await assert.rejects(recoverStaged(a,folder));
});
