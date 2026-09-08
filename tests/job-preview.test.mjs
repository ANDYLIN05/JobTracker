import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

test("job preview parses JSON-LD, metadata and rejects blocked/unsafe pages",async()=>{
  const vite=await createServer({configFile:false,appType:"custom",cacheDir:".sites-runtime/preview-test-cache",server:{middlewareMode:true,hmr:false}});
  const originalFetch=globalThis.fetch;
  try {
    const {POST}=await vite.ssrLoadModule("/app/api/job-preview/route.ts");
    const preview=url=>POST(new Request("http://localhost/api/job-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({url})}));
    globalThis.fetch=async()=>new Response(`<script type="application/ld+json">{"@graph":[{"@type":["Thing","JobPosting"],"title":"R&amp;D Engineer","hiringOrganization":{"name":"Example &amp; Co"}}]}</script>`,{headers:{"Content-Type":"text/html"}});
    const structured=await preview("https://example.com/job");assert.equal(structured.status,200);assert.deepEqual(await structured.json(),{company:"Example & Co",position:"R&D Engineer",url:"https://example.com/job"});
    globalThis.fetch=async()=>new Response(`<meta content="Example Corp" property="og:site_name"><title>Developer \u2013 Careers</title>`,{headers:{"Content-Type":"text/html"}});
    assert.equal((await (await preview("https://example.com/job")).json()).position,"Developer");
    globalThis.fetch=async()=>new Response(`<title>Job Application for Engineer at Example Inc</title><meta property="og:title" content="Engineer">`,{headers:{"Content-Type":"text/html"}});
    assert.deepEqual(await (await preview("https://job-boards.greenhouse.io/example/jobs/123")).json(),{company:"Example Inc",position:"Engineer",url:"https://job-boards.greenhouse.io/example/jobs/123"});
    globalThis.fetch=async()=>new Response("<title>Just a moment...</title>",{headers:{"Content-Type":"text/html"}});
    assert.equal((await preview("https://example.com/job")).status,422);
    globalThis.fetch=async()=>new Response(null,{status:302,headers:{location:"http://internal.local/private"}});
    assert.equal((await preview("https://example.com/job")).status,422);
    for(const url of ["not a url","file:///etc/passwd","http://172.16.0.1/","http://[::1]/","http://127.0.0.1/"])assert.equal((await preview(url)).status,400);
    globalThis.fetch=async()=>new Response("Blocked",{status:403});assert.equal((await preview("https://example.com/job")).status,422);
  } finally {globalThis.fetch=originalFetch;await vite.close();}
});


