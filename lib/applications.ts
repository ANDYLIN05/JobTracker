import { z } from "zod";
export const applicationInput = z.object({
  company: z.string().trim().min(1,"Company is required."),
  position: z.string().trim().min(1,"Position is required."),
  appliedDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid application date.").refine(value => {
    const date = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10) === value;
  }, "Invalid application date."),
  status: z.enum(["Applied","Assessment","Interview","Offer","Rejected","Withdrawn"]).default("Applied"),
  jobUrl: z.string().trim().default("").refine(value => {
    if(!value)return true;
    try{return ["http:","https:"].includes(new URL(value).protocol)}catch{return false}
  },"Job link must be an HTTP or HTTPS URL."),
  notes: z.string().trim().default(""),
});
export async function readApplication(request: Request) {
  const body: unknown = await request.json().catch(()=>null);
  return applicationInput.safeParse(body);
}
export function applicationError(error: unknown) {
  const message=error instanceof Error?error.message:"Unexpected error";
  return message.includes("no such table")?"Application storage is not ready. Run npm run db:migrate locally.":"Could not access application storage.";
}
