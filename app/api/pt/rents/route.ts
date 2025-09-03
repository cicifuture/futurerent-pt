import { PT, listTenancies } from "@/lib/pt";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    // Only take managementType (+ paging). No Status, no lastModified filter.
    const managementType =
      searchParams.get("managementType") ??
      searchParams.get("ManagementType") ??
      undefined;

    const pageSize = Number(searchParams.get("PageSize") ?? searchParams.get("pageSize") ?? 200);
    let page = Number(searchParams.get("Page") ?? searchParams.get("page") ?? 1);

    const tenancies: any[] = [];
    while (true) {
      const resp: any = await listTenancies({
        page,
        pageSize,
        managementType, // <— the only filter we send
      });
      const items = resp.items || resp.value || resp.data || [];
      tenancies.push(...items);

      const got = items.length;
      if (!got || got < pageSize) break; // robust pagination end
      const total = resp.totalCount ?? resp.total ?? Number.MAX_SAFE_INTEGER;
      if (tenancies.length >= total) break;
      page += 1;
    }

    // Fan-out: rent + (best-effort) owner
    const results: any[] = [];
    const concurrency = 6;
    let i = 0;

    const pickOwnerFromContacts = (contacts: any[] = []) =>
      contacts.find((c) => (c.contact_types || []).some((t: string) => t.toLowerCase().includes("owner")));

    async function worker() {
      while (i < tenancies.length) {
        const t = tenancies[i++];

        const tenancyId = t.tenancy_id ?? t.tenancyId ?? t.id ?? null;
        const propertyId = t.propertyId ?? t.property ?? null;

        const ownerFromContacts = pickOwnerFromContacts(t.contacts);
        const ownerContactId = t.ownerContactId ?? t.primaryOwnerContactId ?? ownerFromContacts?.id ?? null;

        const [rent, owner] = await Promise.all([
          tenancyId ? PT.getTenancyRent(String(tenancyId)).catch((e) => ({ error: String(e) })) : Promise.resolve(t.rent ?? null),
          ownerContactId ? PT.getContact(ownerContactId).catch((e) => ({ error: String(e) })) : Promise.resolve(null),
        ]);

        results.push({
          tenancyId,
          name: t.name ?? null,
          managementType: t.managementType ?? t.management_type ?? null,
          propertyId,
          leaseStart: t.lease_start_date ?? null,
          leaseEnd: t.lease_end_date ?? null,
          rent: rent ?? t.rent ?? null,
          owner,
        });
      }
    }

    const workers = Math.min(concurrency, Math.max(1, tenancies.length));
    await Promise.all(Array.from({ length: workers }, worker));

    return Response.json({
      filters: { managementType, pageSize },
      count: results.length,
      items: results,
    });
  } catch (e: any) {
    return Response.json({ error: e.message || String(e) }, { status: 502 });
  }
}
