// app/pt/tenancies/page.tsx
import { listTenancies } from "@/lib/pt";
import React from "react";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SP = { managementType?: string; page?: string; pageSize?: string };

export default async function TenanciesPage({
  // Next 15: searchParams is a Promise
  searchParams,
}: {
  searchParams: Promise<SP>;
}) {
  const sp = await searchParams;

const data = await listTenancies({
  page: sp.page ? Number(sp.page) : 1,
  pageSize: sp.pageSize ? Number(sp.pageSize) : 5,                                
  managementType: sp.managementType ?? "Residential", 
});

  const items: any[] = Array.isArray(data)
  ? data
  : (data as any).items || (data as any).value || (data as any).data || [];
function pickPrimaryContact(contacts?: any[]) {
  if (!Array.isArray(contacts) || contacts.length === 0) return null;
  return contacts.find((c) => c.is_primary) ?? contacts[0];
}

function formatEmail(c?: any) {
  return c?.preferred_email_address || c?.email_address || "-";
}

function formatAddress(a?: any) {
  if (!a) return "-";
  const street = [
    a?.unit ? `${a.unit}/` : "",      // 3/25
    a?.street_number,
    a?.address_line_1,                // Brosnan Place
  ].filter(Boolean).join(" ").trim();

  const line2 = a?.address_line_2 ? `, ${a.address_line_2}` : "";
  const locality = [a?.suburb, a?.state, a?.post_code]
    .filter(Boolean)
    .join(" ");

  return [street + line2, locality].filter(Boolean).join(", ");
}

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Tenancies</h1>

      <form className="flex gap-2">
        <input
          name="managementType"
          defaultValue={sp.managementType ?? "Residential"}
          placeholder="Residential | Commercial"
          className="border rounded px-2 py-1"
        />
        <input
          name="pageSize"
          defaultValue={sp.pageSize ?? "5"}
          className="border rounded px-2 py-1 w-24"
        />
        <button className="border rounded px-3 py-1">Apply</button>
      </form>

      <div className="overflow-auto">
        <table className="min-w-[900px] w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Email</th>      
              <th className="p-2">Address</th> 
              <th className="p-2">Tenancy ID</th>
              <th className="p-2">Name</th>
              <th className="p-2">Rent (Weekly)</th>
              <th className="p-2">Lease Start</th>
              <th className="p-2">Lease End</th>
              <th className="p-2">Property</th>
              <th className="p-2">Primary Contact</th>
             
            </tr>
          </thead>
         <tbody>
  {items.map((t) => {
    const c = pickPrimaryContact(t.contacts);                 // <- pick primary contact safely
    const contactName =
      c?.first_name || c?.last_name
        ? `${c?.first_name ?? ""} ${c?.last_name ?? ""}`.trim()
        : "-";
    const email = formatEmail(c);                              // <- uses preferred_email_address fallback
    const addr  = formatAddress(c?.address);                   // <- address comes from contact.address
    return (
      <tr key={t.tenancy_id ?? t.id} className="border-b">
        <td className="p-2">{email}</td>                      
        <td className="p-2">{addr}</td>          
        <td className="p-2 font-mono">{t.tenancy_id ?? t.id ?? "-"}</td>
        <td className="p-2">{t.name ?? "-"}</td>
        <td className="p-2">
          {t.rent?.amount != null ? `${t.rent.amount} ${t.rent?.period ?? ""}` : "-"}
        </td>
        <td className="p-2">{t.lease_start_date ?? "-"}</td>
        <td className="p-2">{t.lease_end_date ?? "-"}</td>
        <td className="p-2">{t.property ?? "-"}</td>
        <td className="p-2">{contactName}</td>
      </tr>
    );
  })}
</tbody>

        </table>
      </div>

      <details className="mt-4">
        <summary className="cursor-pointer">Raw JSON</summary>
        <pre className="mt-2 p-3 bg-gray-100 rounded text-sm overflow-auto">
{JSON.stringify(items.slice(0, 5), null, 2)}
        </pre>
      </details>
    </main>
  );
}
