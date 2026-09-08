import { eq, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { readApplication, applicationError } from "@/lib/applications";
type Context={params:Promise<{id:string}>};
async function getId(context: Context) {
  const {id}=await context.params;
  return /^\d+$/.test(id) && Number.isSafeInteger(Number(id)) && Number(id)>0 ? Number(id) : null;
}
export async function PUT(request: Request, context: Context) {
  const id=await getId(context);
  if(id===null)return Response.json({error:"Invalid id."},{status:400});
  const result=await readApplication(request);
  if(!result.success)return Response.json({error:result.error.issues[0].message},{status:400});
  try {
    const [application]=await getDb().update(applications).set({...result.data,updatedAt:sql`CURRENT_TIMESTAMP`}).where(eq(applications.id,id)).returning();
    return application?Response.json({application}):Response.json({error:"Application not found."},{status:404});
  } catch(error) { return Response.json({error:applicationError(error)},{status:500}); }
}
export async function DELETE(_request: Request, context: Context) {
  const id=await getId(context);
  if(id===null)return Response.json({error:"Invalid id."},{status:400});
  try {
    const [application]=await getDb().delete(applications).where(eq(applications.id,id)).returning();
    return application?Response.json({deleted:true}):Response.json({error:"Application not found."},{status:404});
  } catch(error) { return Response.json({error:applicationError(error)},{status:500}); }
}
