import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
import { readApplication, applicationError } from "@/lib/applications";
export async function GET() {
  try { return Response.json({applications:await getDb().select().from(applications).orderBy(desc(applications.appliedDate),desc(applications.id))}); }
  catch(error) { return Response.json({error:applicationError(error)},{status:500}); }
}
export async function POST(request: Request) {
  const result=await readApplication(request);
  if(!result.success)return Response.json({error:result.error.issues[0].message},{status:400});
  try { const [application]=await getDb().insert(applications).values(result.data).returning();return Response.json({application},{status:201}); }
  catch(error) { return Response.json({error:applicationError(error)},{status:500}); }
}
