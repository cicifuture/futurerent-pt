// lib/offers.ts (server)
type Period = "Weekly" | "Fortnightly" | "Monthly";

const toWeekly = (amount: number, period?: Period) =>
  !amount ? 0 :
  period === "Weekly" ? amount :
  period === "Fortnightly" ? amount / 2 :
  /* Monthly */ amount * 12 / 52;

const toMonthly = (amount: number, period?: Period) =>
  !amount ? 0 :
  period === "Weekly" ? amount * 52 / 12 :
  period === "Fortnightly" ? amount * 26 / 12 :
  amount; // Monthly fallback

const monthsBetween = (start?: string, end?: string) => {
  if (!end) return 0;
  const e = new Date(end), n = new Date();
  return Math.max(0, (e.getFullYear()-n.getFullYear())*12 + (e.getMonth()-n.getMonth()));
};

const monthsUntil = (end?: string, asOf: Date = new Date()) => {
  if (!end) return 0;
  const e = new Date(end);
  return (e.getFullYear() - asOf.getFullYear()) * 12 + (e.getMonth() - asOf.getMonth());
};

const AS_OF = process.env.AS_OF_DATE ? new Date(process.env.AS_OF_DATE) : new Date();


const pickOwner = (contacts: any[] = []) =>
  contacts.find(c => (c.contact_types||[]).some((t: string) => /owner/i.test(t))) ??
  contacts.find(c => c.is_primary) ?? contacts[0];

export async function buildOwnerOffers(listTenancies: Function) {
  const raw = await listTenancies({ page: 1, pageSize: 500, status: "Current" });
  const tenancies: any[] = Array.isArray(raw) ? raw : (raw.items || raw.value || raw.data || []);
  const rows: any[] = [];

  for (const t of tenancies) {
    const owner = pickOwner(t.contacts);
    const rentAmt = t.rent?.amount ?? 0;
    const period  = t.rent?.period as Period | undefined;

    const weekly  = toWeekly(rentAmt, period);           
    const monthly = toMonthly(rentAmt, period);
    const leaseRemRaw = monthsUntil(t.lease_end_date, AS_OF);
    const leaseRem = Math.max(0, leaseRemRaw);


    // 资格：周租 ≥ 250，剩余≥3个月，未设置 vacate
    const eligible = weekly >= 250  && !t.vacate_date;

    const maxOffer = Math.min(Math.round(monthly * 24), 100000); 
    rows.push({
      tenancyId: t.tenancy_id ?? t.id,
      propertyId: t.property ?? null,
      ownerEmail: owner?.preferred_email_address || owner?.email_address || "",
      ownerName: owner ? `${owner.first_name ?? ""} ${owner.last_name ?? ""}`.trim() : "",
      suburb: owner?.address?.suburb ?? "",
      state: owner?.address?.state ?? "",
      weeklyRent: Math.round(weekly),                        
      monthlyRent: Math.round(monthly),
      leaseRemainingMonths: leaseRem,
      eligible,
      maxOffer: eligible ? maxOffer : 0,
      reason: eligible
        ? "Weekly rent ≥ 250 & not vacating"
        : "Weekly rent < 250 or vacating",
    });
  }

  return rows.sort((a,b) => b.maxOffer - a.maxOffer);
}
