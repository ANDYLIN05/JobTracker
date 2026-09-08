import assert from "node:assert/strict";
import test from "node:test";
import { Miniflare } from "miniflare";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

test("built Worker renders HTML and persists application CRUD in D1", async () => {
  const root=fileURLToPath(new URL("../dist/server/",import.meta.url));
  const worker=new Miniflare({modules:true,modulesRoot:root,scriptPath:`${root}/index.js`,modulesRules:[{type:"ESModule",include:["**/*.js"]}],compatibilityDate:"2026-05-15",compatibilityFlags:["nodejs_compat"],d1Databases:["DB"]});
  try {
    const db=await worker.getD1Database("DB");
    await db.exec((await readFile(new URL("../drizzle/0000_perpetual_microbe.sql",import.meta.url),"utf8")).replaceAll("\n"," "));
    const response=await worker.dispatchFetch("http://localhost/",{headers:{accept:"text/html"}});
    assert.equal(response.status,200);
    assert.match(await response.text(),/<meta(?=[^>]*\bname=["']codex-preview["'])(?=[^>]*\bcontent=["']development["'])[^>]*>/i);
    const call=(path,method="GET",body)=>worker.dispatchFetch(`http://localhost/api/applications${path}`,{method,headers:{"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
    const input={company:"Test, Inc.",position:"Engineer",appliedDate:"2026-09-08",status:"Applied",notes:'A "quote"\nand newline',jobUrl:"https://example.com/job"};
    const create=await call("","POST",input);assert.equal(create.status,201);
    const {application}=await create.json();
    assert.equal((await (await call("")).json()).applications.length,1);
    const update=await call(`/${application.id}`,"PUT",{...input,status:"Interview"});assert.equal(update.status,200);assert.equal((await update.json()).application.status,"Interview");
    for(const invalid of [{...input,company:42},{...input,appliedDate:"2026-02-30"},{...input,jobUrl:"javascript:alert(1)"}])assert.equal((await call("","POST",invalid)).status,400);
    assert.equal((await call("/abc","DELETE")).status,400);
    assert.equal((await call(`/${application.id}`,"DELETE")).status,200);
    assert.equal((await call(`/${application.id}`,"DELETE")).status,404);
    assert.deepEqual((await (await call("")).json()).applications,[]);
  } finally { await worker.dispose(); }
});
