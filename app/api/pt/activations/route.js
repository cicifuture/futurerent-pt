// app/api/pt/activations/route.js
import crypto from "crypto";
export const runtime = "nodejs";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const applicationKey =
    searchParams.get("application_key") || process.env.PT_APPLICATION_KEY;

  if (!applicationKey || !process.env.PT_SUBSCRIPTION_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing application key or subscription key" }),
      { status: 400 }
    );
  }

  const url = `https://uatapi.propertytree.io/apikey/v1/application_keys/${applicationKey}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": process.env.PT_SUBSCRIPTION_KEY,
      "x-correlation-id": crypto.randomUUID(),
    },
    // PT may gzip/chunk responses; fetch handles it
  });

  const body = await res.text();
  return new Response(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") || "application/json" },
  });
}
