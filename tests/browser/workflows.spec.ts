import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";
test("create, edit, status, reload, export, filter, and delete",async({page,request})=>{
  const company=`Browser QA ${Date.now()}`;
  const errors:string[]=[];page.on("pageerror",e=>errors.push(e.message));
  let id:number|undefined;
  try{
    await page.goto("/");
    await expect(page.getByText("Loading applications...")).toHaveCount(0);
    await page.getByLabel("Company name").fill(company);
    await page.getByLabel("Position",{exact:true}).fill("Software Engineer");
    await page.getByLabel("Notes",{exact:true}).fill('Remote, "flexible"');
    await page.getByRole("button",{name:"Add application"}).click();
    const row=page.getByRole("row").filter({hasText:company});await expect(row).toBeVisible();
    id=(await (await request.get("/api/applications")).json()).applications.find((x:{company:string})=>x.company===company).id;
    await page.getByLabel(`Edit ${company}`).click();
    await page.getByLabel("Position",{exact:true}).fill("Senior Engineer");
    await page.getByRole("button",{name:"Save changes"}).click();await expect(row).toContainText("Senior Engineer");
    await row.getByLabel("Application status").click();await page.getByRole("option",{name:"Interview",exact:true}).click();await expect(row).toContainText("Interview");
    await page.reload();await expect(row).toContainText("Senior Engineer");await expect(row).toContainText("Interview");
    const downloadPromise=page.waitForEvent("download");await page.getByRole("button",{name:"Export CSV"}).click();
    const download=await downloadPromise;expect(download.suggestedFilename()).toMatch(/^job-applications-.*\.csv$/);
    const csv=await readFile((await download.path())!,"utf8");expect(csv).toContain(`"${company}","Senior Engineer"`);expect(csv).toContain('"Remote, ""flexible"""');
    await page.getByPlaceholder("Search company or position").fill(`  ${company}  `);await expect(row).toBeVisible();
    await page.getByLabel(`Delete ${company}`).click();await page.getByRole("button",{name:"Keep it"}).click();await expect(row).toBeVisible();
    await page.getByLabel(`Delete ${company}`).click();await page.getByRole("button",{name:"Delete application",exact:true}).click();await expect(row).toHaveCount(0);
    await page.reload();await expect(row).toHaveCount(0);expect(errors).toEqual([]);
  }finally{if(id)await request.delete(`/api/applications/${id}`);}
});
test("failed saves keep entered values and show an error",async({page})=>{
  await page.goto("/");await expect(page.getByText("Loading applications...")).toHaveCount(0);await page.getByLabel("Company name").fill("Network test");await page.getByLabel("Position",{exact:true}).fill("Engineer");
  await page.route("**/api/applications",route=>route.request().method()==="POST"?route.abort("failed"):route.continue());
  await page.getByRole("button",{name:"Add application"}).click();await expect(page.getByRole("alert")).toBeVisible();await expect(page.getByLabel("Company name")).toHaveValue("Network test");
});
test("blocked job links show the manual-entry fallback",async({page})=>{
  await page.goto("/");await expect(page.getByText("Loading applications...")).toHaveCount(0);await page.getByLabel("Job posting link").fill("http://127.0.0.1/private");await page.getByRole("button",{name:"Fill from link"}).click();await expect(page.getByRole("alert")).toContainText("not supported");await expect(page.getByRole("button",{name:"Fill from link"})).toBeEnabled();
});
test("autofills company and position from a live public job posting",async({page,request})=>{
  test.skip(!process.env.TEST_LIVE_AUTOFILL,"Set TEST_LIVE_AUTOFILL=1 to include the external job-board check.");
  const listing=await request.get("https://boards-api.greenhouse.io/v1/boards/anthropic/jobs");expect(listing.ok()).toBeTruthy();
  const job=(await listing.json()).jobs[0];
  await page.goto("/");await expect(page.getByText("Loading applications...")).toHaveCount(0);
  await page.getByLabel("Job posting link").fill(job.absolute_url);
  await page.getByRole("button",{name:"Fill from link"}).click();
  await expect(page.getByLabel("Company name")).toHaveValue("Anthropic",{timeout:20000});
  await expect(page.getByLabel("Position",{exact:true})).toHaveValue(job.title);
});
