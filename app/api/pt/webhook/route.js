// app/api/pt/webhook/route.js
import crypto from "crypto";
export const runtime = "nodejs";

export async function POST(req) {
  try {
    const raw = Buffer.from(await req.arrayBuffer());

    const secret = process.env.PT_WEBHOOK_SECRET || "";
    if (!secret) return new Response("Missing secret", { status: 500 });

    // Accept a few possible header names/formats
    let sig = req.headers.get("x-signature")
           || req.headers.get("x-pt-signature")
           || req.headers.get("propertytree-signature")
           || "";

    // Some providers prefix "sha256=..."
    if (sig.startsWith("sha256=")) sig = sig.slice(7);

    // Compute expected digest (raw Buffer)
    const expected = crypto.createHmac("sha256", secret).update(raw).digest();

    // Decode provided signature (hex first, then try base64)
    let provided = null;
    if (/^[a-f0-9]{64}$/i.test(sig)) {
      provided = Buffer.from(sig, "hex");
    } else if (/^[A-Za-z0-9+/=]+$/.test(sig)) {
      try { provided = Buffer.from(sig, "base64"); } catch { /* ignore */ }
    }

    // Fail fast if missing/invalid/length mismatch
    if (!provided || provided.length !== expected.length) {
      return new Response("Invalid signature", { status: 401 });
    }

    // Constant-time compare
    const ok = crypto.timingSafeEqual(provided, expected);
    if (!ok) return new Response("Invalid signature", { status: 401 });

    // Valid – now parse & handle
    const event = JSON.parse(raw.toString("utf8"));
    console.log("PT activation event:", event);

    return new Response(null, { status: 204 });
  } catch (err) {
    console.error(err);
    return new Response("Bad request", { status: 400 });
  }
}
