// app/api/pt/contacts/[id]/route.ts
import { PT } from "@/lib/pt";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const data = await PT.getContact(params.id);
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
