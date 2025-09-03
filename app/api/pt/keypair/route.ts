// app/api/pt/keypair/route.ts
import { ptPartnerGet } from "@/lib/pt";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const appKey = searchParams.get("application_key") || process.env.PT_APPLICATION_KEY;
    if (!appKey) return Response.json({ error: "Missing application_key" }, { status: 400 });

    const data = await ptPartnerGet(`/Keys/KeyPairs/${encodeURIComponent(appKey)}`);
    return Response.json(data);
  } catch (e: any) {
    return Response.json({ error: e.message }, { status: 502 });
  }
}
