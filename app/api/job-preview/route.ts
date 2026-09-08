const clean = (value: unknown): string =>
  typeof value === "string"
    ? value
        .replace(/&amp;/g, "&")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&nbsp;/g, " ")
        .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => {
          const code = parseInt(n, 16);
          return code <= 0x10ffff ? String.fromCodePoint(code) : "";
        })
        .replace(/&#(\d+);/g, (_, n) => {
          const code = Number(n);
          return code <= 0x10ffff ? String.fromCodePoint(code) : "";
        })
        .replace(/\s+/g, " ")
        .trim()
    : "";
  function safeUrl(value: string, base?: URL) {
  const url = new URL(value, base);
  console.log("hostname:", url.hostname);
  console.log("pathname:", url.pathname);
  const host = url.hostname.toLowerCase();
  if (!["http:","https:"].includes(url.protocol) || url.username || url.password ||
    host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") ||
    host.includes(":") || /^(0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|198\.(18|19)\.|22[4-9]\.|2[3-5]\d\.)/.test(host)) {
    throw new Error("That link is not supported.");
  }
  return url;
}
function meta(html: string, key: string) {
  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const attrs = new Map<string,string>();
    for (const a of tag[0].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs.set(a[1].toLowerCase(),a[2]??a[3]);
    if ((attrs.get("property")||attrs.get("name"))?.toLowerCase() === key) return attrs.get("content")||"";

  }
  return "";
}
function findJob(value: unknown): Record<string,unknown> | null {
  if (Array.isArray(value)) { for (const item of value) { const found=findJob(item);if(found)return found; } }
  else if (value && typeof value === "object") {
    const item=value as Record<string,unknown>;
    if (item["@type"] === "JobPosting" || (Array.isArray(item["@type"]) && item["@type"].includes("JobPosting"))) return item;
    for(const child of Object.values(item)){const found=findJob(child);if(found)return found;}
  }
  return null;
}
function structured(html: string) {
  for (const match of html.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { 

      const parsed=JSON.parse(match[1]);
      console.log("JSON-LD BLOCK:", parsed);
      const found=findJob(parsed);
      if(found)return found; } catch { /* Try the next JSON-LD block. */ 
      }
  }
  return null;
}
function companyFromUrl(url: URL): string {
  if (url.hostname.includes("myworkdayjobs.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    const siteName = parts[0];

    if (siteName) {
      const pieces = siteName.split("_");

      if (pieces.length >= 2) {
        return pieces[1].toUpperCase();
      }
    }
  }

  return "";
}
export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || !("url" in body) || typeof body.url !== "string" || !body.url.trim()) return Response.json({error:"Paste a job link first."},{status:400});
    let url: URL;
    try { url=safeUrl(body.url); } catch { return Response.json({error:"That link is not supported."},{status:400}); }
    const signal=AbortSignal.timeout(12000);
    let response: Response | undefined;
    for(let i=0;i<4;i++) {
      response=await fetch(url,{headers:{"User-Agent":"Mozilla/5.0 Job Application Tracker"},redirect:"manual",signal});
      if(response.status>=300 && response.status<400){const location=response.headers.get("location");await response.body?.cancel();if(!location)break;url=safeUrl(location,url);continue;}
      break;
    }
    if(!response?.ok) throw new Error("The job site blocked automatic reading. Enter the details manually.");
    if(!response.headers.get("content-type")?.includes("text/html")) throw new Error("This link is not an HTML job posting. Enter the details manually.");
    const reader=response.body?.getReader();if(!reader)throw new Error("The job site returned an empty page.");
    const decoder=new TextDecoder();let html="",bytes=0;
    try{while(true){const {value,done}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>1500000)throw new Error("The job page is too large. Enter the details manually.");html+=decoder.decode(value,{stream:true});}html+=decoder.decode();}finally{await reader.cancel();}
    const job=structured(html),organization=job?.hiringOrganization;
    const pageTitle=clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    const greenhouseCompany=["boards.greenhouse.io","job-boards.greenhouse.io"].includes(url.hostname) ? pageTitle.match(/^Job Application for .+ at (.+)$/i)?.[1] : "";
    const company=clean(organization && typeof organization==="object" && "name" in organization ? organization.name : "")||clean(greenhouseCompany)||clean(meta(html,"og:site_name"))|| clean(companyFromUrl(url));;
    const title=clean(job?.title)||clean(meta(html,"og:title")||html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
    
    if(!title || /^(just a moment|access denied|attention required|sign in|log in|captcha)/i.test(title))throw new Error("The job site blocked automatic reading. Enter the details manually.");
    return Response.json({company,position:job?title:title.split(/\s[-|\u2013\u2014]\s/)[0],url:url.toString()});
  } catch(error) {
    return Response.json({error:error instanceof Error && error.name==="TimeoutError" ? "The job site took too long to respond. Enter the details manually." : error instanceof Error ? error.message : "Could not read this job link."},{status:422});
  }
}

