import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import { applications } from "@/db/schema";
const statuses = new Set(["Applied","Assessment","Interview","Offer","Rejected","Withdrawn"]);
const message=(e:unknown)=>{const m=e instanceof Error?e.message:"Unexpected error";return m.includes("no such table")?"Application storage is not ready yet.":m};
export async function GET(){try{return Response.json({applications:await getDb().select().from(applications).orderBy(desc(applications.appliedDate),desc(applications.id))})}catch(e){return Response.json({error:message(e)},{status:500})}}
export async function POST(request:Request){try{const b=await request.json() as Record<string,string>;const company=b.company?.trim(),position=b.position?.trim(),appliedDate=b.appliedDate?.trim(),status=b.status?.trim()||"Applied";if(!company||!position||!appliedDate)return Response.json({error:"Company, position, and date are required."},{status:400});if(!statuses.has(status))return Response.json({error:"Invalid status."},{status:400});const [application]=await getDb().insert(applications).values({company,position,appliedDate,status,jobUrl:b.jobUrl?.trim()||"",notes:b.notes?.trim()||""}).returning();return Response.json({application},{status:201})}catch(e){return Response.json({error:message(e)},{status:500})}}
