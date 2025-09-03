// app/offers/page.tsx
import React from "react";
import { buildOwnerOffers } from "@/lib/offers";
import { listTenancies } from "@/lib/pt";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function OffersPage() {
  const rows = await buildOwnerOffers(listTenancies);

  return (
    <main className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Owner Offers</h1>
        <a className="border rounded px-3 py-1" href="/api/offers/export">Download CSV</a>
      </div>

      <div className="overflow-auto">
        <table className="min-w-[1000px] w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="p-2">Eligible</th>
              <th className="p-2">Max Offer</th>
              <th className="p-2">Owner</th>
              <th className="p-2">Email</th>
              <th className="p-2">Suburb</th>
              <th className="p-2">State</th>
              <th className="p-2">Weekly</th>
              <th className="p-2">Monthly</th>
              <th className="p-2">Lease Rem (mo)</th>
              <th className="p-2">Tenancy ID</th>
              <th className="p-2">Property ID</th>
              <th className="p-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.tenancyId} className="border-b">
                <td className="p-2">{r.eligible ? "YES" : "NO"}</td>
                <td className="p-2">${r.maxOffer.toLocaleString()}</td>
                <td className="p-2">{r.ownerName || "-"}</td>
                <td className="p-2">{r.ownerEmail || "-"}</td>
                <td className="p-2">{r.suburb || "-"}</td>
                <td className="p-2">{r.state || "-"}</td>
                <td className="p-2">{r.weeklyRent}</td>
                <td className="p-2">{r.monthlyRent}</td>
                <td className="p-2">{r.leaseRemainingMonths}</td>
                <td className="p-2 font-mono">{r.tenancyId}</td>
                <td className="p-2 font-mono">{r.propertyId ?? "-"}</td>
                <td className="p-2">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
