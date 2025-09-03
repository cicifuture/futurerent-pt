// lib/pt.ts
import "server-only";
import crypto from "crypto";

const BASE = (process.env.PT_BASE_URL || "").replace(/\/$/, "");

// --- utils ---
function must(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}
function qs(params?: Record<string, any>) {
  if (!params) return "";
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
  return q ? `?${q}` : "";
}

// --- Partner API (Sandbox) ---
export async function ptPartnerGet<T>(path: string) {
  const url = `${BASE}/sandbox-partner-publicapi${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      "Ocp-Apim-Subscription-Key": must("PT_PARTNER_SUBSCRIPTION_KEY"),
      "X-Correlation-Id": crypto.randomUUID(),
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PT Partner ${res.status} ${res.statusText}: ${text}`);
  return (text ? JSON.parse(text) : {}) as T;
}

// --- Public (Data) API (sandbox-first) with token fallback ---
async function publicFetch<T>(prefix: string, path: string, search?: Record<string, any>) {
  const tokenRaw = must("PT_ACCESS_TOKEN"); // may be "id:token"
  const [, tokenOnly] = tokenRaw.split(":");
  const tokensToTry = tokenOnly ? [tokenRaw, tokenOnly] : [tokenRaw];

  const baseHeaders = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "public-api-subscription-key": must("PT_PUBLIC_SUBSCRIPTION_KEY"),
    "X-Application-Id": must("PT_APPLICATION_ID"),
    "X-Application-Key": must("PT_APPLICATION_KEY"),
    "X-Correlation-Id": crypto.randomUUID(),
  } as const;

 const url = `${BASE}${prefix}${path.startsWith("/") ? path : `/${path}`}${qs(search)}`;
  let lastErr: string | null = null;
  console.log("PT URL ->", url);
    console.log("prefix", prefix,"path",path,'qs(search)',qs(search));


  for (const t of tokensToTry) {
    try {
      const res = await fetch(url, {
        headers: { ...baseHeaders, Authorization: `Bearer ${t}` },
        cache: "no-store",
      });
      const text = await res.text();
      if (!res.ok) {
        if (res.status === 401) { lastErr = `401: ${text}`; continue; }
        throw new Error(`PT Public ${res.status} ${res.statusText}: ${text}`);
      }
      return (text ? JSON.parse(text) : {}) as T;
    } catch (e: any) {
      lastErr = e?.message || String(e);
    }
  }
  throw new Error(lastErr || "Public fetch failed");
}

// --- Versioned public prefixes (sandbox first) ---
const PUBLIC_PREFIXES = [
  process.env.PT_PUBLIC_PREFIX,      // optional override via .env
  "/sandbox-pt-publicapi/v1",
  "/sandbox-pt-publicapi",
  "/public/v1",
  "/public",
].filter(Boolean) as string[];

export async function ptPublicGet<T>(path: string, search?: Record<string, any>) {
  const errs: string[] = [];
  for (const p of PUBLIC_PREFIXES) {
    try { return await publicFetch<T>(p, path, search); }
    catch (e: any) { errs.push(`${p}: ${e?.message || e}`); }
  }
  throw new Error(`All public prefixes failed:\n${errs.join("\n")}`);
}

// ---------- High-level helpers (PascalCase + v1) ----------
export type TenancyQuery = {
  page?: number;
  pageSize?: number;
  status?: string;                    // e.g. "Current" | "Past"
  managementType?: string;            // e.g. "Residential" | "Commercial"
  lastModifiedOnOrAfter?: string | Date; // ISO string or Date
};

// GET /sandbox-pt-publicapi/v1/Tenancies?[lastModifiedOnOrAfter][&managementType]...
export function listTenancies(q: TenancyQuery = {}) {
  const {
    page = 1,
    pageSize = 200,
    status = "Past",
    managementType,
  } = q;



  // 发送两种大小写键名以提高兼容性（路径严格区分大小写，query 多数不区分）
  const search: Record<string, any> = {
    Status: status,
    Page: page,
    PageSize: pageSize,
    status,
    page,
    pageSize,
  };
  if (managementType) {
    search.managementType = managementType;
  }
  

  return ptPublicGet(`/Tenancies`, search);
}

// 兼容你原来的调用方式
export const PT = {
  // GET /sandbox-pt-publicapi/v1/Contacts/{id}
  getContact: (id: string) => ptPublicGet(`/Contacts/${id}`),

  // 旧方法：当前租约（内部转到 listTenancies）
  listCurrentTenancies: (page = 1, pageSize = 200) =>
    listTenancies({ page, pageSize, status: "Current" }),

  // 新方法：带过滤条件的租约列表
  listTenancies,

  // GET /sandbox-pt-publicapi/v1/Tenancies/{id}/RentDetails (fallback -> /Rent)
  getTenancyRent: async (tenancyId: string) => {
    try {
      return await ptPublicGet(`/Tenancies/${tenancyId}/RentDetails`);
    } catch {
      return await ptPublicGet(`/Tenancies/${tenancyId}/Rent`);
    }
  },

  // (optional) GET /sandbox-pt-publicapi/v1/Tenancies/{id}
  getTenancy: (id: string) => ptPublicGet(`/Tenancies/${id}`),
};
